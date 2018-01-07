#! /bin/sh
# 检查并启动服务

if netstat -alpn | grep ':53' | grep -e "^udp" -q ; then
	:;
else
	echo start...
	/etc/init.d/dnskeeperd start
	:;
fi

