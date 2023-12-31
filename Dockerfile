FROM node:lts

ARG RADDB=/etc/freeradius/3.0

ENV \
    SUPERVISOR_DATA_DIR=/data \
    SUPERVISOR_RADDB_DIR=${RADDB} \
    SUPERVISOR_OUTPUT_DIR=/var/run \
    SUPERVISOR_RADIUSD=/usr/sbin/freeradius

RUN \
    apt-get update && \
    apt-get install -y --no-install-recommends eapoltest freeradius freeradius-utils && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /data /var/run

COPY \
    ./raddb/mods-enabled/files \
    ${RADDB}/mods-enabled/

COPY \
    ./raddb/sites-enabled/inner-tunnel \
    ${RADDB}/sites-enabled/

WORKDIR /app

COPY package.json yarn.lock /app/
COPY ./packages/common/package.json /app/packages/common/
COPY ./packages/supervisor/package.json /app/packages/supervisor/
COPY ./packages/web/package.json /app/packages/web/

RUN \
    yarn install --frozen-lockfile --production && \
    yarn cache clean

COPY . /app/

RUN \
    yarn web:build

