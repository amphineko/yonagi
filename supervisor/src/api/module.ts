import { Module } from "@nestjs/common"

import { ApiController } from "./controller"
import { RadiusdModule } from "../radiusd/module"

@Module({
    controllers: [ApiController],
    imports: [RadiusdModule],
})
export class ApiModule {}
