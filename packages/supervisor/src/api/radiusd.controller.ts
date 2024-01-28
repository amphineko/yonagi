import { Controller, Get, Inject, Post, UseInterceptors, forwardRef } from "@nestjs/common"
import {
    GetRecentLogsResponse,
    GetRecentLogsResponseType,
    GetStatusResponse,
    GetStatusResponseType,
} from "@yonagi/common/api/radiusd"

import { ResponseInterceptor } from "./api.middleware"
import { EncodeResponseWith } from "./common"
import { Radiusd } from "../radiusd/radiusd"

@Controller("/api/v1/radiusd")
@UseInterceptors(ResponseInterceptor)
export class RadiusdController {
    constructor(@Inject(forwardRef(() => Radiusd)) private radiusd: Radiusd) {}

    @Get("/status")
    @EncodeResponseWith(GetStatusResponseType)
    status(): Promise<GetStatusResponse> {
        return Promise.resolve({
            lastExitCode: this.radiusd.lastExitCode ?? undefined,
            lastRestartedAt: this.radiusd.lastRestartedAt ?? undefined,
        })
    }

    @Get("/log")
    @EncodeResponseWith(GetRecentLogsResponseType)
    log(): Promise<GetRecentLogsResponse> {
        return Promise.resolve(this.radiusd.log)
    }

    @Post("/reload")
    async reload(): Promise<void> {
        await this.radiusd.reload()
    }
}
