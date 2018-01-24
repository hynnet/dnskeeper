#! /bin/sh
# 检查并启动服务

if netstat -alpn | grep ':53' | grep -e "^udp" -q ; then
	cur_dir=`pwd`
	cd "`dirname $0`"
	base_dir=`pwd`
	if sed -n "/`date -d "2 minute ago" "+%Y-%m-%d %H:%M:%S"`/,\$p" "${base_dir}/log/out.log" | grep -q "timed out" ; then
		"${base_dir}/restart-dnskeeper.sh"
	fi
	cd "${cur_dir}"
	:;
else
	echo start...
	/etc/init.d/dnskeeperd start
	:;
fi

