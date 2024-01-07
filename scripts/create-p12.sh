set -o errexit -o nounset -o pipefail

cd "$(dirname "$(readlink -f "$0")")/../data/pki"

cert=$(mktemp).pem
jq -r '.clients | to_entries | .[0].value.cert' state.json | base64 -d - | openssl x509 -out "$cert" -outform PEM

key=$(mktemp).cer
jq -r '.clients | to_entries | .[0].value.privKey' state.json | base64 -d - | openssl ec -out "$key" -inform DER -outform PEM

# create p12
out=/tmp/$(openssl x509 -in "$cert" -noout -serial | cut -d= -f2)
openssl pkcs12 -export -inkey "$key" -in "$cert" -out "$out.3des.p12" -legacy -passout pass:neko
openssl pkcs12 -export -inkey "$key" -in "$cert" -out "$out.aes.p12" -passout pass:neko

echo "Created $out"
