#! /bin/sh
# 重新启动服务

cur_dir=`pwd`
cd `dirname $0`

time=`date +%y%m%d%H`
mv log/forever.log log/forever-${time}.log
mv log/out.log log/out-${time}.log
ps -ef | grep node | grep 'dns-server.js' | grep -v grep | awk '{print $2}' | xargs kill 
service named restart
# /etc/init.d/dnskeeperd start
NODE_ENV=production /usr/local/bin/node dns-server.js &
bzip2 log/forever-${time}.log &
bzip2 log/out-${time}.log &

cd ${cur_dir}

