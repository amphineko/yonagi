import { Module } from "@nestjs/common"

import { ResponseInterceptor } from "./api.middleware"
import { MPSKController } from "./mpsks.controller"
import { RadiusdController } from "./radiusd.controller"
import { RadiusdModule } from "../radiusd/module"

@Module({
    controllers: [MPSKController, RadiusdController],
    imports: [RadiusdModule],
    providers: [ResponseInterceptor],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ApiModule {}
