import { Controller, Inject, Post, UseInterceptors, forwardRef } from "@nestjs/common"

import { ResponseInterceptor } from "./api.middleware"
import { Radiusd } from "../radiusd/radiusd"

@Controller("/api/v1/radiusd")
@UseInterceptors(ResponseInterceptor)
export class RadiusdController {
    constructor(@Inject(forwardRef(() => Radiusd)) private radiusd: Radiusd) {}

    @Post("/reload")
    async reload(): Promise<void> {
        await this.radiusd.reload()
    }
}
