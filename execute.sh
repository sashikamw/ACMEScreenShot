#!/bin/sh
echo "executing the script";
echo $1;
echo $2;
echo username=$1 accesstoken=$2 "node gem.js";
username=$1 accesstoken=$2 node gem.js
