#! /bin/sh
# 重新启动服务

cur_dir=`pwd`
cd `dirname $0`

time=`date +%y%m%d%H`
if [ -f "log/forever-${time}.log" ] || [ -f "log/forever-${time}.log.bz2" ]; then
	time=`date +%y%m%d%H%M`
fi

/etc/init.d/dnskeeperd stop
ps -ef | grep node | grep 'dns-server.js' | grep -v grep | awk '{print $2}' | xargs kill > /dev/null 2>&1
mv -f log/forever.log log/forever-${time}.log
mv -f log/out.log log/out-${time}.log
service named restart
/etc/init.d/dnskeeperd start
# NODE_ENV=production /usr/local/bin/node dns-server.js &
bzip2 log/forever-${time}.log &
bzip2 log/out-${time}.log &

cd ${cur_dir}

