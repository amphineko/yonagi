import { Module } from "@nestjs/common"

import { CertificateAuthorityState, CertificateFactory, ClientCertificateState, ServerCertificateState } from "."
import { PkijsCertificateFactory } from "./pkijs"
import { CryptoEngineShim } from "./pkijs/cryptoEngine"
import { ConfigModule } from "../config"
import { StorageModule } from "../storages/module"

@Module({
    exports: [CertificateAuthorityState, ServerCertificateState, ClientCertificateState],
    imports: [ConfigModule, PkiModule, StorageModule],
    providers: [
        CryptoEngineShim,
        {
            provide: CertificateFactory,
            useClass: PkijsCertificateFactory,
        },
        CertificateAuthorityState,
        ServerCertificateState,
        ClientCertificateState,
    ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PkiModule {}
