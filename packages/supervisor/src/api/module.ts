import { Module } from "@nestjs/common"

import { ResponseInterceptor } from "./api.middleware"
import { RadiusClientController } from "./clients.controller"
import { MPSKController } from "./mpsks.controller"
import { PkiController } from "./pki.controller"
import { RadiusdController } from "./radiusd.controller"
import { RlmRestController } from "./rlm_rest.controller"
import { RadiusUserController, RadiusUserPasswordController } from "./users.controller"
import { ConfigModule } from "../config"
import { PkiModule } from "../pki/module"
import { RadiusdModule } from "../radiusd/module"
import { RlmRestModule } from "../rlm_rest/module"
import { StorageModule } from "../storages/module"

@Module({
    controllers: [
        MPSKController,
        PkiController,
        RadiusClientController,
        RadiusdController,
        RadiusUserController,
        RadiusUserPasswordController,
        RlmRestController,
    ],
    imports: [ConfigModule, PkiModule, RadiusdModule, RlmRestModule, StorageModule],
    providers: [ResponseInterceptor],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ApiModule {}
