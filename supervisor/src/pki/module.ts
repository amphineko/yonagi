import { Module } from "@nestjs/common"

import { CryptoEngineShim } from "./cryptoEngine"
import { Pki } from "./pki"
import { PkiState } from "./storage"
import { ConfigModule } from "../config"

@Module({
    exports: [Pki],
    imports: [ConfigModule],
    providers: [CryptoEngineShim, Pki, PkiState],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PkiModule {}
