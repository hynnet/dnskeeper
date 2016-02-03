/**
 * Created by billtt on 12/16/15.
 */

var dns = require('native-dns');
var config = require('config');
var Util = require('./util');
var fs = require('fs');

var _domesticServer = config.get('domesticServer');
var _foreignServer = config.get('foreignServer');
var _domesticKeywords = config.get('domesticKeywords');
var _cache = {};

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
    var record = _cache[question.name];
    var answered = false;
    if (record && isCacheRecordUsable(record)
        && (config.get('fastResponse') || !isCacheRecordExpired(record))) { // in fast mode, return first even if it's expired
        callback(null, record.answers);
        answered = true;
        if (isCacheRecordExpired(record)) {
            console.debug('expired record for [%s, %s]: [%s]', req.address.address, question.name, getIPsFromAnswers(record.answers));
        } else {
            console.debug('valid record for [%s, %s]: [%s]', req.address.address, question.name, getIPsFromAnswers(record.answers));
        }
    }
    if (!record || isCacheRecordExpired(record) || !isCacheRecordUsable(record)) { // query for invalid record
        var domestic = isDomesticDomain(question.name);
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
}

function startServer() {
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
            response.send();
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

function initDomesticKeywords() {
    for (var i=0; i<_domesticKeywords.length; i++) {
        _domesticKeywords[i] = _domesticKeywords[i].toLowerCase();
    }
}

function loadCache(callback) {
    var file = config.get('cache.file');
    fs.readFile(file, function(err, data) {
        if (err || !data) {
            console.info('Cannot load cache file.');
            return callback();
        }
        try {
            _cache = JSON.parse(data);
            console.info('Cache loaded with %d records.', Util.countProperties(_cache));
        } catch (e) {
            console.info('Parse cache file failed!');
        }
        callback();
    });
}

function saveCache() {
    var file = config.get('cache.file');
    var tmpFile = file + '.tmp';
    fs.writeFile(tmpFile, JSON.stringify(_cache, null, 2), function(err) {
        if (err) {
            console.info('Cache failed to save: %s', err);
        } else {
            fs.rename(tmpFile, file, function(err) {
                console.info('Cache saved with %d records.', Util.countProperties(_cache));
            });
        }
        scheduleNextSave();
    });
}

function scheduleNextSave() {
    var interval = config.get('cache.saveInterval');
    setTimeout(saveCache, interval);
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
    _cache[domain] = record;
}

function isCacheRecordExpired(record) {
    return record.death <= Date.now();
}

function isCacheRecordUsable(record) {
    return hasTypeAIP(record.answers);
}

Util.initLog4JS();
initDomesticKeywords();
loadCache(function() {
    startServer();
    scheduleNextSave();
});

