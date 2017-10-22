#!/bin/bash
export NODE_ENV=production
if hash realpath 2>/dev/null; then
	path=`realpath $0`
	path=`dirname $path`
else
	echo command realpath not found!
	echo for CentOS 6.x: rpm -ivh http://ftp.tu-chemnitz.de/pub/linux/dag/redhat/el6/en/x86_64/rpmforge/RPMS/realpath-1.17-1.el6.rf.x86_64.rpm
	echo for CentOS 7.x: rpm -ivh http://ftp.tu-chemnitz.de/pub/linux/dag/redhat/el7/en/x86_64/rpmforge/RPMS/realpath-1.17-1.el7.rf.x86_64.rpm
	exit
fi
cmd=$1
if [ "$cmd" == "" ]; then
	echo "Usage: $0 start|stop|restart"
	exit
fi

mkdir -p $path/log
mkdir -p ~/.forever/log/

if [ "$cmd" == "start" ]; then
	forever $cmd -a --workingDir "$path" -l $path/log/forever.log -o $path/log/out.log -e $path/log/err.log $path/dns-server.js
else
	forever $cmd $path/dns-server.js
fi

