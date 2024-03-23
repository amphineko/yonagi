set -o errexit -o nounset -o pipefail

# run eapol_test
config=$(mktemp)
cat <<EOF > "$config"
network={
    ssid="neko"
    key_mgmt=WPA-EAP
    eap=PEAP
    identity="test"
    anonymous_identity="anonymous"
    password="unmatched"
    phase2="auth=GTC"
}
EOF

eapol_test -c "$config" -s "$1"
