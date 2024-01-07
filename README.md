## Features/Supported Authentication Methods

-   Aruba/Cisco Multi Pre-Shared Key
-   EAP-GTC
-   EAP-MSCHAPv2
-   EAP-TLS

## Project Structure

-   `/common` - Shared Libraries: Serializers and Typings on [io-ts](https://github.com/gcanti/io-ts)
    -   `/api` - specific for APIs between `@yonagi/supervisor` and `@yonagi/web`
-   `/supervisor` - The Radiusd Supervisor/Daemon on [NestJS](https://github.com/nestjs/nest)
    -   `/api` - API Controllers: Logic and Sanitization
    -   `/pki` - PKI: CA and Certificate Management on _PKI.js_
    -   `/configs` - Radiusd Config Generation
    -   `/radiusd` - Radiusd Process Management
-   `/web` - The Web Frontend on [next.js](https://github.com/vercel/next.js)
    -   `/app` - React pages with some shiny server components
    -   `/lib` - Shared libraries for all pages

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
            -   [x] Certificate Issue
            -   [x] CA/Server/Client CRUD
        -   [ ] Deployment
            -   [x] Client Certificate Export (PKCS#12 with trust chain)
            -   [ ] CA/Server/Client Deployment to Radiusd
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
        -   [x] CA/Server/Client Certificate Issue and Delete
        -   [x] Client Certificate Export (PKCS#12 with trust chain)
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
    -   Storage
        -   [ ] Move storage-related code from `@yonagi/common` to `@yonagi/supervisor`
-   Web
    -   [x] Migrate away from Fluent UI to candidates:
        -   ~~Base UI~~
        -   **MUI** (migrated)
