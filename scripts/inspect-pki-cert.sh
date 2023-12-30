set -ex

cd "$(dirname "$(readlink -f "$0")")/../supervisor"

jq -r .$1.cert ../data/pki/state.json | base64 -d - | openssl x509 -text -noout
