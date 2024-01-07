set -o errexit -o nounset -o pipefail

ca=$(mktemp).pem
ca_key=$(mktemp).key
openssl req -new -newkey rsa:2048 -nodes -keyout "$ca_key" -out "$ca" -subj "/CN=Negative CA"
openssl x509 -req -in "$ca" -key "$ca_key" -out "$ca" -days 365

cert=$(mktemp).pem
key=$(mktemp).key
openssl req -new -newkey rsa:2048 -nodes -keyout "$key" -out "$cert" -subj "/CN=Negative Test Client"
openssl x509 -req -in "$cert" -CA "$ca" -CAkey "$ca_key" -out "$cert" -days 365

# run eapol_test
config=$(mktemp)
cat <<EOF > "$config"
network={
    ssid="neko"
    key_mgmt=WPA-EAP
    eap=TLS
    identity="negative@test.local"
    client_cert="$cert"
    private_key="$key"
    eapol_flags=3
}
EOF

if [ $# -eq 0 ]; then
    secret="test"
else
    secret="$1"
fi

eapol_test -c "$config" -s $secret
