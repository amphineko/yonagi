#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUPERVISOR_PORT="${SUPERVISOR_PORT:-8000}"
RADIUS_AUTH_PORT="${RADIUS_AUTH_PORT:-1812}"
RADDB_TEMPLATE="${RADDB_TEMPLATE:-${SUPERVISOR_RADDB_DIR:-/etc/raddb}}"
RADIUSD_BIN="${SUPERVISOR_RADIUSD:-$(command -v radiusd || true)}"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/yonagi-mpsk-smoke.XXXXXX")"
SUPERVISOR_LOG="$TMP_DIR/supervisor.log"
RADCLIENT_LOG="$TMP_DIR/radclient.log"
KEEP_STATE_ON_FAILURE=0

PENDING_NAME="smoke-pending"
PENDING_MAC="00-00-00-00-00-00"
CLAIMED_MAC="02-00-00-00-00-01"
PSK="smoketestpsk"

cleanup() {
    local status=$?

    if [[ -n "${SUPERVISOR_PID:-}" ]] && kill -0 "$SUPERVISOR_PID" 2>/dev/null; then
        kill "$SUPERVISOR_PID" 2>/dev/null || true
        wait "$SUPERVISOR_PID" 2>/dev/null || true
    fi

    if [[ $status -eq 0 || "$KEEP_STATE_ON_FAILURE" -eq 0 ]]; then
        rm -rf "$TMP_DIR"
    else
        echo "Smoke test failed. Logs and isolated state are kept at: $TMP_DIR" >&2
        [[ -f "$SUPERVISOR_LOG" ]] && tail -n 120 "$SUPERVISOR_LOG" >&2
        [[ -f "$RADCLIENT_LOG" ]] && cat "$RADCLIENT_LOG" >&2
    fi
}
trap cleanup EXIT

require_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo "Missing required command: $1" >&2
        exit 1
    fi
}

port_is_free() {
    local port="$1"

    ! timeout 1 bash -c ":</dev/tcp/127.0.0.1/$port" >/dev/null 2>&1
}

patch_radiusd_var() {
    local name="$1"
    local value="$2"
    local file="$TMP_DIR/raddb/radiusd.conf"

    if grep -Eq "^[[:space:]]*${name}[[:space:]]*=" "$file"; then
        sed -i -E "s|^[[:space:]]*${name}[[:space:]]*=.*|${name} = ${value}|" "$file"
    else
        printf '\n%s = %s\n' "$name" "$value" >>"$file"
    fi
}

wait_for_api() {
    local deadline=$((SECONDS + 30))

    while ((SECONDS < deadline)); do
        if curl -fsS "http://localhost:$SUPERVISOR_PORT/api/v1/mpsks" >/dev/null 2>&1; then
            return 0
        fi

        if ! kill -0 "$SUPERVISOR_PID" 2>/dev/null; then
            echo "Supervisor exited before API became ready" >&2
            return 1
        fi

        sleep 1
    done

    echo "Timed out waiting for supervisor API on localhost:$SUPERVISOR_PORT" >&2
    return 1
}

require_command curl
require_command jq
require_command radclient
require_command timeout
require_command yarn

if [[ -z "$RADIUSD_BIN" || ! -x "$RADIUSD_BIN" ]]; then
    echo "Missing radiusd executable. Set SUPERVISOR_RADIUSD=/path/to/radiusd if it is not on PATH." >&2
    exit 1
fi

if [[ ! -d "$RADDB_TEMPLATE" ]]; then
    echo "Missing FreeRADIUS raddb template: $RADDB_TEMPLATE" >&2
    echo "Set RADDB_TEMPLATE=/path/to/a/disposable/copyable/raddb directory." >&2
    exit 1
fi

if [[ "$SUPERVISOR_PORT" != "8000" ]]; then
    echo "SUPERVISOR_PORT must be 8000 because generated rlm_rest callbacks currently hardcode localhost:8000." >&2
    exit 1
fi

if [[ "$RADIUS_AUTH_PORT" != "1812" ]]; then
    echo "RADIUS_AUTH_PORT must be 1812 because the generated default FreeRADIUS site currently hardcodes port 1812." >&2
    exit 1
fi

if ! port_is_free "$SUPERVISOR_PORT"; then
    echo "Port $SUPERVISOR_PORT is already in use." >&2
    exit 1
fi

if ! port_is_free "$RADIUS_AUTH_PORT"; then
    echo "RADIUS auth port $RADIUS_AUTH_PORT is already in use." >&2
    exit 1
fi

mkdir -p "$TMP_DIR/data" "$TMP_DIR/run"
cp -a "$RADDB_TEMPLATE" "$TMP_DIR/raddb"
patch_radiusd_var "localstatedir" "$TMP_DIR/var"
patch_radiusd_var "logdir" "$TMP_DIR/log"
patch_radiusd_var "run_dir" "$TMP_DIR/run/radiusd"
patch_radiusd_var "db_dir" "$TMP_DIR/raddb"
mkdir -p "$TMP_DIR/var" "$TMP_DIR/log" "$TMP_DIR/run/radiusd"
chmod -R a+rX "$TMP_DIR"

(
    cd "$ROOT_DIR"
    LISTEN_HOST=localhost \
        LISTEN_PORT="$SUPERVISOR_PORT" \
        NODE_OPTIONS=--openssl-legacy-provider \
        TS_NODE_TRANSPILE_ONLY=true \
        SUPERVISOR_DATA_DIR="$TMP_DIR/data" \
        SUPERVISOR_OUTPUT_DIR="$TMP_DIR/run" \
        SUPERVISOR_RADDB_DIR="$TMP_DIR/raddb" \
        SUPERVISOR_RADIUSD="$RADIUSD_BIN" \
        yarn workspace @yonagi/supervisor ts-node src/main.ts
) >"$SUPERVISOR_LOG" 2>&1 &
SUPERVISOR_PID=$!
KEEP_STATE_ON_FAILURE=1

wait_for_api

curl -fsS \
    -X POST \
    -H "Content-Type: application/json" \
    --data "{\"name\":\"$PENDING_NAME\",\"callingStationId\":\"$PENDING_MAC\",\"psk\":\"$PSK\"}" \
    "http://localhost:$SUPERVISOR_PORT/api/v1/mpsks/$PENDING_NAME" >/dev/null

cat <<EOF | radclient -x localhost:"$RADIUS_AUTH_PORT" auth test >"$RADCLIENT_LOG" 2>&1
Calling-Station-Id = "$CLAIMED_MAC",
NAS-Port-Type = Wireless-802.11,
NAS-Port = 0,
User-Name = "$CLAIMED_MAC",
EOF

if ! grep -q "Received Access-Accept" "$RADCLIENT_LOG"; then
    echo "radclient did not receive Access-Accept" >&2
    exit 1
fi

allocated_mac="$(
    curl -fsS "http://localhost:$SUPERVISOR_PORT/api/v1/mpsks" \
        | jq -er --arg name "$PENDING_NAME" '.data[] | select(.name == $name) | .callingStationId'
)"

if [[ "$allocated_mac" != "$CLAIMED_MAC" ]]; then
    echo "Expected $PENDING_NAME to be allocated to $CLAIMED_MAC, got $allocated_mac" >&2
    exit 1
fi

echo "Wildcard MPSK smoke test passed: $PENDING_NAME allocated to $CLAIMED_MAC"
