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
        -   [ ] Trusted Certificate Authority Import
        -   [ ] Server Certificate Import/Generation
    -   [ ] Radiusd
        -   [x] Child Process Management
-   Web Portal
    -   [ ] MPSK Authentication Dashboard
    -   [ ] Password/Certificate-based Authentication Dashboard
    -   [ ] PKI Dashboard
    -   [ ] NAS Client Dashboard
        -   [ ] CRUD: Name/Allowed Subnet/Secret
    -   [ ] Radiusd Dashboard
        -   [ ] Log Inspection
        -   [ ] Regenerate/Reload

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
