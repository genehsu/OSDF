Assuming you are in the OSDF/docker directory.

# Creating docker image with elasticsearch and elasticsearch-river-couchdb plugin
Run this command

    docker build -f elasticsearch/Dockerfile-elasticsearch-river-couchdb -t elasticsearch-river-couchdb .

Then you should be able to run docker-compose in this directory (-d flag runs docker-compose in daemon mode)

    docker-compose up -d

The following setup script will initialize couchdb with the osdf database

    setup_couchdb.sh
