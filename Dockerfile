FROM node:lts

ARG RADDB=/etc/freeradius/3.0

ENV \
    SUPERVISOR_DATA_DIR=/data \
    SUPERVISOR_OUTPUT_DIR=/var/run \
    SUPERVISOR_RADIUSD=/usr/sbin/freeradius

RUN \
    apt-get update && \
    apt-get install -y --no-install-recommends freeradius freeradius-utils

RUN \
    mkdir -p /data /var/run && \
    rm -f ${RADDB}/clients.conf && \
    ln -s /var/run/clients.conf ${RADDB}/clients.conf && \
    touch /var/run/authorized_mpsks && \
    touch /var/run/authorized_users && \
    touch /var/run/clients.conf

COPY \
    ./raddb/mods-enabled/eap \
    ./raddb/mods-enabled/files \
    ${RADDB}/mods-enabled/

COPY \
    ./raddb/sites-enabled/default \
    ./raddb/sites-enabled/inner-tunnel \
    ${RADDB}/sites-enabled/

COPY \
    ./common \
    ./supervisor \
    /app/

WORKDIR /app
