set -o errexit -o nounset -o pipefail

cd "$(dirname "$(readlink -f "$0")")/../data/pki"

for cert in $(jq -r ".$1.cert" state.json); do
    echo "$cert" | base64 -d - | openssl x509 -noout -text
done
