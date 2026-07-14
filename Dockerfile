FROM alpine:3.22 AS base

ARG RADDB=/etc/raddb

RUN \
    apk add --no-cache \
        freeradius=3.0.27-r1 \
        freeradius-eap=3.0.27-r1 \
        freeradius-rest=3.0.27-r1 \
        nodejs \
        yarn

ENV \
    SUPERVISOR_DATA_DIR=/data \
    SUPERVISOR_RADDB_DIR=${RADDB} \
    SUPERVISOR_OUTPUT_DIR=/var/run \
    SUPERVISOR_RADIUSD=/usr/sbin/radiusd

RUN mkdir -p /data /var/run

COPY \
    ./raddb/mods-enabled/files \
    ${RADDB}/mods-enabled/

COPY \
    ./raddb/sites-enabled/inner-tunnel \
    ${RADDB}/sites-enabled/

WORKDIR /app

COPY . /app/

FROM base AS dev

RUN \
    apk add --no-cache bash curl freeradius-utils=3.0.27-r1 git jq openssl wpa_supplicant

RUN \
    yarn install --frozen-lockfile

FROM base AS dist

RUN \
    yarn install --frozen-lockfile --production && \
    yarn cache clean && \
    yarn web:build
