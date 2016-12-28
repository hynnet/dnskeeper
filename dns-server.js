/**
 * Created by billtt on 12/16/15.
 */

var dns = require('native-dns');
var config = require('config');
var Util = require('./util');
var redis = require('redis').createClient(config.get('cache.port'), config.get('cache.host'), config.get('cache.options'));

var _domesticServer = config.get('domesticServer');
var _foreignServer = config.get('foreignServer');
var _domesticKeywords = config.get('domesticKeywords');
var GFWRules = require('./GFWRules');

function createAnswerA(domain, ip, ttl) {
    return dns.A({
        name: domain,
        address: ip,
        ttl: ttl
    });
}

function getIPsFromAnswers(answers) {
    var ips = [];
    if (!answers) {
        return ips;
    }
    for (var i=0; i<answers.length; i++) {
        if (answers[i].type==1) {
            ips.push(answers[i].address);
        }
    }
    return ips;
}

function hasTypeAIP(answers) {
    if (!answers) {
        return false;
    }
    for (var i=0; i<answers.length; i++) {
        if (answers[i].type==1) {
            return true;
        }
    }
    return false;
}

function setAnswerTtl(answers, ttl) {
    for (var i=0; i<answers.length; i++) {
        answers[i].ttl = ttl;
    }
}

// only handle first question for now
function handleRequest(req, callback) {
    var question = req.question[0];

    // query static table first
    var staticConf = config.get('static');
    var staticResult = staticConf.table[question.name];
    if (staticResult != null) {
        console.debug('query static for [%s, %s]: [%s]', req.address.address, question.name, staticResult);
        return callback(null, [createAnswerA(question.name, staticResult, staticConf.ttl)]);
    }

    // search cache for valid answers
    getCache(question.name, function(err, record) {
        var answered = false;
        if (record && isCacheRecordUsable(record)
            && (config.get('fastResponse') || !isCacheRecordExpired(record))) { // in fast mode, return first even if it's expired
            if (isCacheRecordExpired(record)) {
                console.debug('expired record for [%s, %s]: [%s]', req.address.address, question.name, getIPsFromAnswers(record.answers));
                setAnswerTtl(record.answers, 1); // expire this record real soon
            } else {
                console.debug('valid record for [%s, %s]: [%s]', req.address.address, question.name, getIPsFromAnswers(record.answers));
            }
            callback(null, record.answers);
            answered = true;
        }
        if (!record || isCacheRecordExpired(record) || !isCacheRecordUsable(record)) { // query for invalid record
            var domestic = !isGFWBlockedDomain(question.name);
            var dreq = dns.Request({
                question: question,
                server: domestic ? _domesticServer : _foreignServer
            });
            dreq.on('timeout', function() {
                console.debug('query timed out for [%s] from %s', question.name, domestic ? 'D' : 'F');
                if (!answered) {
                    callback(null, []);
                }
            });
            dreq.on('message', function(err, answer) {
                var answers = answer.answer || [];
                if (answers.length > 0 && hasTypeAIP(answers)) {
                    addToCache(question.name, answers);
                    console.debug('query answered for [%s] from %s', question.name, domestic ? 'D' : 'F');
                }
                if (!answered) {
                    callback(null, answers);
                }
            });
            dreq.send();
        }
    });
}

function startServer() {
    // init redis events
    redis.on('ready',function(){
        console.info('cache ready');
    });

    redis.on('end',function(){
        console.warn('cache connection lost');
    });

    redis.on('error',function(error){
        console.error('cache error %s', error.toString());
    });

    var server = dns.createServer();
    server.on('request', function (request, response) {
        //console.log(request);
        handleRequest(request, function(err, answers) {
            for (var i=0; i<answers.length; i++) {
                response.answer.push(answers[i]);
            }
            if (response.header.rd == 1) {
                response.header.ra = 1;
            }
            try {
                response.send();
            } catch (e) {
                if (request && request.question) {
                    console.log('Error when sending response for ' + request.question[0].name);
                }
                console.log(e);
            }
        });
    });

    server.on('error', function (err, buff, req, res) {
        console.log(err.stack);
    });

    var port = config.get('port');
    var host = config.get('host');
    server.serve(port, host);
    console.info('Server started on %s:%d', host, port);
}

function isDomesticDomain(domain) {
    var lower = domain.toLowerCase();
    for (var i=0; i<_domesticKeywords.length; i++) {
        if (lower.indexOf(_domesticKeywords[i]) >= 0) {
            return true;
        }
    }
    return false;
}

function isGFWBlockedDomain(domain) {
    return GFWRules.matches(domain.toLowerCase());
}

function initDomesticKeywords() {
    for (var i=0; i<_domesticKeywords.length; i++) {
        _domesticKeywords[i] = _domesticKeywords[i].toLowerCase();
    }
}

function addToCache(domain, answers) {
    var minTTL = 86400;
    if (!answers || answers.length <= 0) {
        return;
    }
    for (var i=0; i<answers.length; i++) {
        minTTL = Math.min(minTTL, answers[i].ttl);
    }
    var death = Date.now() + minTTL * 1000;
    var record = {
        domain: domain,
        answers: answers,
        death: death
    };
    redis.set(domain, JSON.stringify(record));
}

function getCache(domain, callback) {
    redis.get(domain, function(err, value) {
        if (err) {
            console.warn(err);
        }
        var obj = null;
        if (!!value) {
            try {
                obj = JSON.parse(value);
            } catch (e) {
                obj = null;
                console.warn('Error parsing record from redis: ' + e.toString());
            }
        }
        callback(err, obj);
    });
}

function isCacheRecordExpired(record) {
    return record.death <= Date.now();
}

function isCacheRecordUsable(record) {
    return hasTypeAIP(record.answers);
}

Util.initLog4JS();
initDomesticKeywords();
startServer();
