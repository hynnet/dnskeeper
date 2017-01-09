/**
 * Created by Bailibin on 26/12/2016.
 */
'use strict';
var fs = require('fs');
var ABPFilterParser = require('abp-filter-parser');
var https = require('https');
var schedule = require('node-schedule');
var config = require('config');

var GFWRules = {};
module.exports = GFWRules;

const basicRulesFile = "GFWBasicRules.list";
let basicFilterData = {};
let extraFilterData = null;
let GFWDomainList = {};
GFWRules.matches = function (domain) {
    try {
        return ABPFilterParser.matches(basicFilterData, domain) || (extraFilterData && ABPFilterParser.matches(extraFilterData, domain));
    } catch (e) {
        return false;
    }
};

(() => {
    try {
        GFWDomainList = fs.readFileSync(basicRulesFile, "utf-8");
        ABPFilterParser.parse(Buffer.from(GFWDomainList, 'base64').toString(), basicFilterData);

        var extraFile = config.get('extraGFWRules');
        if (fs.existsSync(extraFile)) {
            extraFilterData = {};
            ABPFilterParser.parse(fs.readFileSync(extraFile, 'utf-8'), extraFilterData);
        }
    } catch (e) {
        console.warn("Please make sure the GFWBasicRules.list is exist under the project root directory.");
        console.warn("You can just copy GFWBasicRules.list.sample to GFWBasicRules.list  \nOr get newest from https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt");
    }
})();

function initABPFilterByGFWList() {
    getGFWList((err, result) => {
        if (err || result.length < 1000) {
            console.warn(`${err.toString()} Error occurs when get newest GFW Blocked Domain List, use local list instead.`);
            ABPFilterParser.parse(GFWDomainList, basicFilterData);
        } else {
            ABPFilterParser.parse(Buffer.from(result, 'base64').toString(), basicFilterData);
            fs.writeFile(basicRulesFile, result, 'utf8', (err) => {
                if (err) console.warn(err);
            });
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
                callback(null, rawData);
            } catch (e) {
                callback(e);
            }
        });
    }).on('error', (e) => {
        callback(e);
    });
};

schedule.scheduleJob("0 0 0 * * *", () => {
    initABPFilterByGFWList();
});