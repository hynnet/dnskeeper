/**
 * Created by billtt on 3/13/16.
 */

var fs = require('fs');
var config = require('config');
var Util = require('./util');
var redis = require('redis').createClient(config.get('cache.port'), config.get('cache.host'), config.get('cache.options'));

var cache = [];
var current = 0;

function insertNext() {
    if (current >= cache.length) {
        console.info('Done');
        return;
    }
    var record = cache[current++];
    redis.set(record.domain, JSON.stringify(record), function(err) {
        if (err) {
            console.error(err);
            return;
        }
        insertNext();
    });
    if (current % 1000 == 0) {
        console.info('%d done', current);
    }
}

Util.initLog4JS();
redis.on('ready', function() {
    console.info('Cache server ready');
    var file = process.argv[2];
    fs.readFile(file, function(err, data) {
        if (err || !data) {
            console.info('Cannot load cache file.');
            return;
        }
        try {
            var records = JSON.parse(data);
            for (var domain in records) {
                cache.push(records[domain]);
            }
            console.info('Cache loaded with %d records.', cache.length);
            console.info('Converting...');
            insertNext();
        } catch (e) {
            console.error(e);
        }
    });
});
