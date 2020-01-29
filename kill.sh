#!/bin/bash
ps -ef | grep daa-server.js | grep -v grep | awk '{print $2}' | xargs kill -9