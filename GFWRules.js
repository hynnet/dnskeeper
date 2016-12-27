/**
 * Created by Bailibin on 26/12/2016.
 */
var fs = require('fs');
var config = require('config');
var https = require('https');
var async = require('async');
var _ = require('underscore');
var schedule = require('node-schedule');
var ABPFilterParser = require('abp-filter-parser');
var redis = require('redis').createClient(config.get('cache.port'), config.get('cache.host'), config.get('cache.options'));

var GFWRules = {};
module.exports = GFWRules;

const GFWRulesFile = "GFWBasicRules.txt";
GFWRules.domainInfos = {};
var GFWDomainList = fs.readFileSync(GFWRulesFile, "utf-8");

function extractInfoByGFWList(rule) {
    var start = new Date().getTime();
    let parsedFilterData = {};
    var blockedDomain = [];
    var nonBlockedDomain = [];
    var blockedIPs = [];
    console.info(`=================Start to analyze the DNS Record.=====================`);
    async.waterfall([
        (cb) => {
            getGFWList((err, result) => {
                if (err || result.length < 1000) {
                    cb(null, rule);
                } else {
                    cb(null, result);
                    fs.writeFile(GFWRulesFile, result, 'utf8', (err) => {
                        if(err) console.warn(err);
                    });
                }
            });
        },
        (gfwList, cb) => {
            ABPFilterParser.parse(gfwList, parsedFilterData);
            cb(null, "");
        },
        (value, cb) => {
            redis.send_command("keys", ["*", (err, result) => {
                cb(null, result);
            }]);
        },
        (domains, cb) => {
            async.eachLimit(domains, 100, (domain, callback) => {
                if (ABPFilterParser.matches(parsedFilterData, domain)) {
                    blockedDomain.push(domain);
                    redis.get(domain, function (err, result) {
                        var answers = JSON.parse(result).answers;
                        for (let z = 0; z < answers.length || 0; z++) {
                            if (answers[z].type == 1) {
                                blockedIPs.push(answers[z].address);
                            }
                        }
                        callback(null, null);
                    });
                } else {
                    nonBlockedDomain.push(nonBlockedDomain);
                    callback(null, null);
                }
            }, function (err) {
                cb(err, null);
            });
        }
    ], (err, result) => {
        if(!err){
            console.info(`=================Spend ${(new Date().getTime() - start) / 1000}'s to analyze the DNS Record.=====================`);
            var blockedUniqueIPs = _.uniq(blockedIPs);
            console.info(`Blocked Domain: ${blockedDomain.length}, NonBlocked Domain: ${nonBlockedDomain.length}. Blocked Unique IP: ${blockedUniqueIPs.length}`);
            GFWRules.domainInfos = {blockedDomain, nonBlockedDomain, blockedUniqueIPs};
        } else {
            console.warn('Error occur when: ' + err.toString());
        }
    });
};

function getGFWList(callback) {
    https.get('https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt', (res) => {
        const statusCode = res.statusCode;

        let error;
        if (statusCode !== 200) {
            error = new Error(`Request Failed.\n` +
                `Status Code: ${statusCode}`);
        }
        if (error) {
            callback(error);
            res.resume();
            return;
        }

        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => rawData += chunk);
        res.on('end', () => {
            try {
                callback(null, Buffer.from(rawData, 'base64').toString());
            } catch (e) {
                callback(e);
            }
        });
    }).on('error', (e) => {
        callback(e);
    });
};

extractInfoByGFWList(GFWDomainList);
schedule.scheduleJob("0 15 18 * * *",  () => {
    extractInfoByGFWList(GFWDomainList);
});