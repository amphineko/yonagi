set -ex

cd ./supervisor

yarn ts-node src/main.ts | yarn pino-pretty
