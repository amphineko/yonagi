set -ex

cd "$(dirname "$(readlink -f "$0")")/../supervisor"

NODE_OPTIONS=--openssl-legacy-provider yarn ts-node src/main.ts | yarn pino-pretty
