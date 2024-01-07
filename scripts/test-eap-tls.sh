set -o errexit -o nounset -o pipefail

cd "$(dirname "$(readlink -f "$0")")/../data/pki"

cert=$(mktemp).pem
jq -r '.clients | to_entries | .[0].value.cert' state.json | base64 -d - | openssl x509 -out "$cert" -outform PEM

key=$(mktemp).key
jq -r '.clients | to_entries | .[0].value.privKey' state.json | base64 -d - | openssl ec -out "$key" -inform DER -outform PEM

# run eapol_test
config=$(mktemp)
cat <<EOF > "$config"
network={
    ssid="neko"
    key_mgmt=WPA-EAP
    eap=TLS
    identity="test@yonagi.local"
    client_cert="$cert"
    private_key="$key"
    eapol_flags=3
}
EOF

eapol_test -c "$config" -s $1
