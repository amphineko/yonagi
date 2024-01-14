FROM alpine:3.19 AS base

ARG RADDB=/etc/raddb

RUN \
    apk add --no-cache freeradius freeradius-eap freeradius-rest nodejs yarn

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
    apk add --no-cache freeradius-utils git jq openssl wpa_supplicant

FROM base AS dist

RUN \
    yarn install --frozen-lockfile --production && \
    yarn cache clean && \
    yarn web:build
