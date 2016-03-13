# DNS Keeper
This is a DNS proxy which works as a standalone DNS server.

It works best with shadowsocks to get correct results of foreign domains, while getting domestic results of baidu, taobao, etc.

## Feature list
* Query two upstream DNS servers according to domain keyword settings
* Static records
* Fast responses with local cache

## How it works
When it receives a DNS query, it checks against the keyword list, if the requested domain name fits the domestic keyword list, it will query the domestic DNS server, otherwise it queries the default server (which should be a foreign server through Shadowsocks in order to avoid pollution).

As for the cache, the server saves every query result in local cache (redis), and use the cached result for fast response. If configured, it will return cached results even if they are expired to get fastest response.

## Quick Start
First make a copy of default.json to production.json in config folder, and make necessary changes. Here are some explanations of the configure items:

* port - port number that this server listens to, should be 53 for production use
* fastResponse - if set to true, cached results will be returned immediately regardless of whether they are expired or not
* foreignServer - the default upstream DNS server, which should be configured using a foreign server through shadowsocks or some VPN solutions (the one in default.json is only an example)
* domesticServer - the upstream server used when request match the domestic keywords
* domesticKeywords - all domains that should be querying the domestic server. You don't need to use whole domain names (only substring is needed)
* static - static record table

### Run
You can start the server by using the following commands (root privileges are required if using port 53):

```
export NODE_ENV=production
node app.js
```

Or you can start the service using forever:

```
./service-dns-server.sh start
```

## Contact

Please contact <b>me@bill.tt</b> if you have any questions.