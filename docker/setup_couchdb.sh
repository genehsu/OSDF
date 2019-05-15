#!/bin/bash -x

DBNAME=osdf
CREDS=admin:admin
HOST="localhost:5984"

curl -X POST -H "Content-Type: application/json" "http://${CREDS}@${HOST}/_cluster_setup" -d '{"action": "enable_single_node", "bind_address":"0.0.0.0", "username":"admin", "password":"admin"}'

RESULT=`curl -I --write-out "%{http_code}\n" --silent --output /dev/null "http://${HOST}/${DBNAME}"`
if [ "$RESULT" -ne 200 ]; then
  curl -X PUT "http://${CREDS}@${HOST}/${DBNAME}"
fi

echo 'finis'
