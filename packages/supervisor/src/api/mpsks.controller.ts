import { Body, Controller, Delete, Get, Inject, Param, Post, UseInterceptors, forwardRef } from "@nestjs/common"
import {
    CreateMPSKRequestType,
    ListMPSKsResponse,
    ListMPSKsResponseType,
    UpdateMPSKRequestType,
} from "@yonagi/common/api/mpsks"

import { ResponseInterceptor } from "./api.middleware"
import { EncodeResponseWith, createOrUpdate } from "./common"
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
    @EncodeResponseWith(ListMPSKsResponseType)
    async list(): Promise<ListMPSKsResponse> {
        return await this.mpskStorage.all()
    }
}
