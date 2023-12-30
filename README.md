## Features/Supported Authentication Methods

-   Aruba/Cisco Multi Pre-Shared Key
-   EAP-GTC
-   EAP-MSCHAPv2
-   EAP-TLS

## Roadmap

-   Supervisor
    -   [ ] API Server
        -   [x] Client (NAS) CRUD
        -   [x] MPSK CRUD
        -   [ ] Password/Certificate-based User CRUD
        -   [ ] PKI CRUD
        -   [x] Radiusd Log/Status
        -   [x] Radiusd Reload
    -   [ ] Configuration Generator/Renderer
        -   [x] Aruba/Cisco Multi Pre-Shared Key
        -   [ ] EAP-GTC/MSCHAPv2
        -   [ ] EAP-TLS
    -   [ ] PKI
        -   [ ] Certificate Authority
            -   [x] Self-Signed CA
            -   [ ] Existing CA/intermediate import
        -   [ ] Server Certificate
            -   [ ] Certificate Issue from CA
            -   [ ] Deploy to radiusd
        -   [ ] User Certificate
    -   [ ] Radiusd
        -   [x] Child Process Management
    -   [ ] Storage
        -   [x] File/JSON-based Storage
        -   [ ] PostgreSQL-backed Storage
-   Web Portal
    -   [ ] MPSK Authentication Dashboard
        -   [x] CRUD: Name/Phy Address/PSK
    -   [ ] Password/Certificate-based Authentication Dashboard
    -   [ ] PKI Dashboard
    -   [ ] NAS Client Dashboard
        -   [x] CRUD: Name/Allowed Subnet/Secret
    -   [x] Radiusd Dashboard
        -   [x] Log Inspection
        -   [x] Regenerate/Reload

## Backlogs

-   Supervisor
    -   API Server
        -   [ ] Standardize API request/responses with mandatory typed responses
            -   [x] Return types should be strongly typed (e.g. /api/v1/clients should return `ListClientResponse` instead of `Record<Name, Client>`)
            -   [ ] Request types should be also strongly typed
            -   [x] Decorators on API methods to signal io-ts codecs for encoding (e.g. encoding `ReadonlyMap<>` into `Record<>` to accommodate `JSON.stringify`)
-   Web
    -   [x] Migrate away from Fluent UI to candidates:
        -   ~~Base UI~~
        -   **MUI** (migrated)
