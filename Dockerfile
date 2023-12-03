FROM node:lts-alpine

ENV \
    SUPERVISOR_DATA_DIR=/data \
    SUPERVISOR_OUTPUT_DIR=/var/run

RUN \
    apk add --no-cache freeradius freeradius-eap freeradius-utils && \
    sed -i 's/^	auth = no$/	auth = yes/' /etc/raddb/radiusd.conf

COPY \
    ./raddb/mods-enabled/eap \
    ./raddb/mods-enabled/files \
    /etc/raddb/mods-enabled/

COPY \
    ./raddb/sites-enabled/default \
    ./raddb/sites-enabled/inner-tunnel \
    /etc/raddb/sites-enabled/

COPY \
    ./common \
    ./supervisor \
    /app/

RUN \
    mkdir -p /var/run && \
    touch /var/run/authorized_mpsks && \
    touch /var/run/authorized_users && \
    touch /var/run/clients.conf

RUN \
    rm -f /etc/raddb/clients.conf && \
    ln -s /var/run/clients.conf /etc/raddb/clients.conf

RUN \
    mkdir /data && \
    touch /data/authorized_mpsks.json && \
    touch /data/authorized_users.json && \
    touch /data/clients.json

WORKDIR /app
