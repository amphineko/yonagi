import { Controller, Get, Inject, forwardRef } from "@nestjs/common"

import { Radiusd } from "../radiusd/radiusd"

@Controller()
export class ApiController {
    constructor(@Inject(forwardRef(() => Radiusd)) private radiusd: Radiusd) {}

    @Get("/api/v1/reload")
    async reload() {
        await this.radiusd.reload()
        return {}
    }
}
