set -ex

cd "$(dirname "$(readlink -f "$0")")/../packages/supervisor"

yarn ts-node ./node_modules/.bin/typeorm migration:generate -d src/storages/sql/sqlite.ts src/storages/sql/migrations/$1
