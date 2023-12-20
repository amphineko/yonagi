import { Body, Controller, Delete, Get, Inject, Param, Post, UseInterceptors, forwardRef } from "@nestjs/common"
import { CreateMPSKRequestType, UpdateMPSKRequestType } from "@yonagi/common/api/mpsks"
import { Name } from "@yonagi/common/common"
import { CallingStationIdAuthentication } from "@yonagi/common/mpsks"

import { ResponseInterceptor } from "./api.middleware"
import { createOrUpdate } from "./common"
import { MPSKStorage } from "../radiusd/storages"

@Controller("/api/v1/mpsks")
@UseInterceptors(ResponseInterceptor)
export class MPSKController {
    constructor(@Inject(forwardRef(() => MPSKStorage)) private mpskStorage: MPSKStorage) {}

    @Post("/:name")
    async createOrUpdate(@Param("name") rawName: string, @Body() body: unknown): Promise<void> {
        await createOrUpdate(rawName, body, CreateMPSKRequestType, UpdateMPSKRequestType, this.mpskStorage)()
    }

    @Delete("/:name")
    async delete(@Param("name") name: string): Promise<void> {
        await this.mpskStorage.delete(name)
    }

    @Get("/")
    async list(): Promise<Record<Name, CallingStationIdAuthentication>> {
        return Object.fromEntries((await this.mpskStorage.all()).entries())
    }
}
