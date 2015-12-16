#!/bin/bash
export NODE_ENV=production
path=`realpath $0`
path=`dirname $path`
cmd=$1
if [ "$cmd" == "" ]; then
	echo "Usage: $0 start|stop|restart"
	exit
fi

if [ "$cmd" == "start" ]; then
	forever $cmd -a --workingDir "$path" -l $path/log/forever.log -o $path/log/out.log -e $path/log/err.log $path/dns-server.js
else
	forever $cmd $path/dns-server.js
fi

