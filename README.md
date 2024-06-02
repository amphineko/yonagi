## TL;DR

-   RADIUS server for small-scale wireless networks
-   Based on [FreeRADIUS](https://github.com/FreeRADIUS/freeradius-server)
-   Has a web dashboard for configs and PKI
-   Supports Aruba/Cisco MPSK and EAP-TLS authentication methods
-   Supports certificate-based **EAP-TLS** authentication
-   Supports password-based **EAP-GTC** and **EAP-MSCHAPv2** authentication

## Getting Started

### Prepare

-   Clone this repository (recommended), or download the `docker-compose.yml` and create `data` directory
-   (Optional) Modify `docker-compose.yml` to use `master` branch instead of `latest` tag
-   Run `docker compose up -d` (Docker and Docker Compose plugin required)

### Configure

-   Open `http://localhost:3000` on your browser

    -   Configure your NAS clients (e.g. Aruba Mobility Controllers or Aruba Instant APs)
    -   (Optional) Configure MPSKs for WPA-Personal SSID/devices
    -   (Optional) Initialize PKI and generate certificates for EAP-TLS (WPA-Enterprise)
    -   (Optional) Download client certificates from PKI dashboard to your devices

-   Restart by using the reload button on the top-right corner, to apply changes of your PKI

## Features & Roadmap

-   Web Portal

    -   MPSK Authentication Dashboard
        -   CRUD: Name/Phy Address/PSK
        -   Export/Import
    -   PKI Dashboard
        -   CA/Server/Client Certificate Issue and Delete
        -   Client Certificate Export (PKCS#12 with trust chain)
            -   User-defined PKCS#12 Export Password
    -   Password-based Authentication Dashboard
    -   NAS Client Dashboard
        -   CRUD: Name/Allowed Subnet/Secret
        -   Export/Import
    -   Radiusd Dashboard
        -   Log Inspection
        -   Regenerate/Reload

-   Supervisor (Backend Service and Radiusd Manager)

    -   API Server
        -   Client (NAS) CRUD/Bulk-Upsert
        -   MPSK CRUD/Bulk-Upsert
        -   PKI CA/Server/Client CRUD
        -   Password-based User CRUD
        -   Radiusd [rlm_rest](https://github.com/FreeRADIUS/freeradius-server/blob/v3.0.x/raddb/mods-available/rest) Interface
        -   Radiusd Log/Status/Reload
    -   PKI
        -   Certificate Authority
            -   Self-Signed CA and Certificate Issue
            -   ~~Existing CA/Intermediate Importing~~ (WIP:hourglass:)
        -   CA/Server Deployment to Radiusd
        -   Client Certificate Export over API (PKCS#12 with trust chain)
    -   Radiusd
        -   Child Process Management
        -   Configuration Rendering
    -   Storage
        -   File/JSON-based Storage
            -   Clients, MPSKs
            -   PKI
        -   SQLite-backed Storage
            -   Clients, MPSKs
            -   PKI
        -   ~~PostgreSQL-backed Storage~~ (WIP:hourglass:)

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

## Dependencies

-   [fp-ts](https://github.com/gcanti/fp-ts/)/[io-ts](https://github.com/gcanti/io-ts/): Functional Programming and Type-Safe Serialization/Vaidation
-   [NestJS](https://github.com/nestjs/nest): Dependency Injection and API Server
-   [next.js](https://github.com/vercel/next.js): The React Frontend
-   [PKI.js](https://github.com/PeculiarVentures/PKI.js): X.509 Certificate and PKCS #12 Support

## License

MIT
