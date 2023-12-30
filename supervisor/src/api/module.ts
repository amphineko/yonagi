import { Module } from "@nestjs/common"

import { ResponseInterceptor } from "./api.middleware"
import { RadiusClientController } from "./clients.controller"
import { MPSKController } from "./mpsks.controller"
import { PkiController } from "./pki.controller"
import { RadiusdController } from "./radiusd.controller"
import { ConfigModule } from "../config"
import { PkiModule } from "../pki/module"
import { RadiusdModule } from "../radiusd/module"

@Module({
    controllers: [MPSKController, PkiController, RadiusClientController, RadiusdController],
    imports: [ConfigModule, PkiModule, RadiusdModule],
    providers: [ResponseInterceptor],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ApiModule {}
