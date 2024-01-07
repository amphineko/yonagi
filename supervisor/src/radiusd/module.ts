import { Inject, Module, OnApplicationBootstrap, OnApplicationShutdown, forwardRef } from "@nestjs/common"

import { Radiusd } from "./radiusd"
import { ClientStorage, MPSKStorage } from "./storages"
import { ConfigModule } from "../config"
import { PkiModule } from "../pki/module"

@Module({
    exports: [ClientStorage, MPSKStorage, Radiusd],
    imports: [ConfigModule, PkiModule],
    providers: [ClientStorage, MPSKStorage, Radiusd],
})
export class RadiusdModule implements OnApplicationBootstrap, OnApplicationShutdown {
    constructor(@Inject(forwardRef(() => Radiusd)) private radiusd: Radiusd) {}

    async onApplicationBootstrap(): Promise<void> {
        await this.radiusd.start()
    }

    async onApplicationShutdown(): Promise<void> {
        await this.radiusd.stop()
    }
}
