set -ex

cd "$(dirname "$(readlink -f "$0")")/../supervisor"

yarn ts-node src/main.ts | yarn pino-pretty
