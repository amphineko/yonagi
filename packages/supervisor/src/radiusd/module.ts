import { Inject, Module, OnApplicationBootstrap, OnApplicationShutdown, forwardRef } from "@nestjs/common"

import { Radiusd } from "./radiusd"
import { ConfigModule } from "../config"
import { PkiModule } from "../pki/module"
import { StorageModule } from "../storages/module"

@Module({
    exports: [Radiusd],
    imports: [ConfigModule, PkiModule, StorageModule],
    providers: [Radiusd],
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
