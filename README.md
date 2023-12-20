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

## Backlogs

-   Supervisor
    -   API Server
        -   [ ] Standardize API responses with mandatory typed responses
            -   Return types should be strongly typed (e.g. /api/v1/clients should return `ListClientResponse` instead of `Record<Name, Client>`)
            -   Decorators on API methods to signal io-ts codecs for encoding (e.g. encoding `ReadonlyMap<>` into `Record<>` to accommodate `JSON.stringify`)
