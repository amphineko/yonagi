import { Module, Provider } from "@nestjs/common"
import { Crypto } from "@peculiar/webcrypto"
import { CryptoEngine } from "pkijs"

import { Pki } from "./pki"
import { PkiState } from "./storage"
import { ConfigModule } from "../config"

const CryptoProvider: Provider<CryptoEngine> = {
    provide: CryptoEngine,
    useFactory: () => {
        const crypto = new Crypto()
        return new CryptoEngine({
            crypto: new Crypto(),
            name: "webcrypto",
            subtle: crypto.subtle,
        })
    },
}

@Module({
    exports: [Pki],
    imports: [ConfigModule],
    providers: [CryptoProvider, Pki, PkiState],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PkiModule {}
