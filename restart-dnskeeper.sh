#! /bin/sh
# 重新启动服务

cur_dir=`pwd`
cd `dirname $0`

time=`date +%y%m%d%H`
mv log/forever.log log/forever-${time}.log
mv log/out.log log/out-${time}.log
	ps -ef | grep node | grep dnskeeper | grep -v grep | awk '{print $2}' | xargs kill 
	/etc/init.d/dnskeeperd start
bzip2 log/forever-${time}.log &
bzip2 log/out-${time}.log &

cd ${cur_dir}

