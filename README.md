# DNS Keeper
This is a DNS proxy which works as a standalone DNS server.

It works best with shadowsocks to get correct results of foreign domains, while getting domestic results of baidu, taobao, etc.

DNS Keeper是一枚DNS代理程序，本身可作为DNS服务器使用。它与Shadowsocks配合可以获得正确的墙外地址，同时也可以避免仅用海外服务器导致的部分国内服务被解析成海外地址而导致访问很慢的问题（比如某度、某宝等）。

## Feature list
* Query two upstream DNS servers according to gfwlist
* Static records
* Fast responses with local cache

## 功能列表
* 可配置两个上游服务器（国内、国外），根据gfwlist决定查询哪个服务器
* 静态记录
* 本地缓存（实现快速响应，尤其是上游服务器出问题或者ss故障时）

## How it works
When it receives a DNS query, it checks against the gfwlist, if the requested domain name fits the gfwlist rules, it will query the foreign DNS server (which should be through Shadowsocks in order to avoid pollution), otherwise it queries the domestic server.

As for the cache, the server saves every query result in local cache (redis), and use the cached result for fast response. If configured, it will return cached results even if they are expired to get fastest response.

## 工作原理
当DNS Keeper收到DNS请求时，它首先检查gfwlist规则，若匹配gfwlist中的任何一条规则，则认定为墙外域名，使用墙外DNS服务器，否则使用国内服务器。

所有查询到的记录都会保存在redis缓存中，以便下次快速响应。如果配置了fastResponse，则每次请求都会先立刻返回缓存中的记录（即使已经过期），然后再更新该记录（如果过期的话）。

## Quick Start
Make sure you have node/npm and redis server installed, or follow the commands below:

```
curl -sL https://deb.nodesource.com/setup_0.12 | sudo -E bash -
sudo apt-get install -y nodejs nodejs-legacy
sudo apt-get install -y redis-server
```

And make sure the version of Node.js you are using is new enough to support base64 encoding with Buffer.

Then install necessary modules. Goto DNSKeeper cloned directory, run

```
npm install
```

Then make a copy of default.json to production.json in config folder, and make necessary changes. Here are some explanations of the configurable items:

* port - port number that this server listens to, should be 53 for production use
* fastResponse - if set to true, cached results will be returned immediately regardless of whether they are expired or not
* foreignServer - the default upstream DNS server, which should be configured using a foreign server through shadowsocks or some VPN solutions (the one in default.json is only an example)
* domesticServer - the upstream server used when request match the domestic keywords
* static - static record table

Lastly, get a newest copy of gfwlist:

```
curl https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt > GFWBasicRules.list
```

## 快速指南
请确保你安装了node环境及redis server。若没有，可参考以下命令：

```
curl -sL https://deb.nodesource.com/setup_0.12 | sudo -E bash -
sudo apt-get install -y nodejs nodejs-legacy
sudo apt-get install -y redis-server
```

注意:你需要安装足够新的Node.js版本以支持Buffer的base64编解码功能。

然后进入DNS Keeper目录，执行以下命令来安装依赖库：

```
npm install
```

然后将config/default.json复制一份到config/production.json，然后修改该配置文件：

* port - UDP端口号，正式使用的话请使用53
* fastResponse - 是否启用快速响应模式（见之前描述）
* foreignServer - 海外服务器地址，请使用经过Shadowsocks的地址及端口号
* domesticServer - 国内服务器地址（比如114.114.114.114）
* static - 静态记录，查询时将最优先使用

最后,获取一份最新的gfwlist配置:

```
curl https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt > GFWBasicRules.list
```

### Run
You can start the server by using the following commands (root privileges are required if using port 53):

使用如下命令启动服务（若使用53端口需要root权限）：

```
export NODE_ENV=production
node dns-server.js
```

Or you can start the service using forever:

或使用forever启动的脚本：

```
./service-dns-server.sh start
```

## Contact

Please contact <b>me@bill.tt</b> if you have any questions.