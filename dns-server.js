/**
 * Created by billtt on 12/16/15.
 */

var dns = require('native-dns');
var config = require('config');
var util = require('./util');

var domesticServer = config.get('domesticServer');

function createAnswerA(domain, ip, ttl) {
    return dns.A({
        name: domain,
        address: ip,
        ttl: ttl
    });
}

// only handle first question for now
function handleRequest(req, callback) {
    var question = req.question[0];

    console.debug('query from %s : %s', req.address.address, question.name);

    // query static table first
    var staticConf = config.get('static');
    var staticResult = staticConf.table[question.name];
    if (staticResult != null) {
        callback(null, [createAnswerA(question.name, staticResult, staticConf.ttl)]);
        return;
    }

    // query domestic server
    var dreq = dns.Request({
        question: question,
        server: domesticServer
    });
    dreq.on('timeout', function() {
        callback(null, []);
    });
    dreq.on('message', function(err, answer) {
        callback(null, answer.answer);
    });
    dreq.send();
}

function startServer() {
    var server = dns.createServer();
    server.on('request', function (request, response) {
        //console.log(request);
        handleRequest(request, function(err, answers) {
            for (var i=0; i<answers.length; i++) {
                response.answer.push(answers[i]);
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

util.initLog4JS();
startServer();
