set -o errexit -o nounset -o pipefail

cd "$(dirname "$(readlink -f "$0")")/../data/pki"

CA=$(mktemp).crt
jq -r .ca.cert state.json | base64 -d - | openssl x509 -outform PEM -out $CA

for cert in $(jq -r '.ca.cert, .server.cert, .clients[].cert' state.json); do
    CRT=$(mktemp).crt
    echo "$cert" | base64 -d - | openssl x509 -outform PEM -out $CRT

    echo $(openssl x509 -in $CRT -noout -subject -nameopt RFC2253)
    openssl verify -CAfile $CA -suiteB_192 $CRT
done