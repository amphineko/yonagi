import { Body, Controller, Delete, Get, Inject, Param, Post, UseInterceptors, forwardRef } from "@nestjs/common"
import {
    CreateMPSKRequestType,
    ListMPSKsResponse,
    ListMPSKsResponseType,
    UpdateMPSKRequestType,
} from "@yonagi/common/api/mpsks"

import { ResponseInterceptor } from "./api.middleware"
import { EncodeResponseWith, createOrUpdate } from "./common"
import { AbstractMPSKStorage } from "../storages"

@Controller("/api/v1/mpsks")
@UseInterceptors(ResponseInterceptor)
export class MPSKController {
    constructor(@Inject(forwardRef(() => AbstractMPSKStorage)) private mpskStorage: AbstractMPSKStorage) {}

    @Post("/:name")
    async createOrUpdate(@Param("name") rawName: string, @Body() body: unknown): Promise<void> {
        await createOrUpdate(
            rawName,
            body,
            CreateMPSKRequestType,
            UpdateMPSKRequestType,
            (name) => this.mpskStorage.getByName(name),
            (name, value) => this.mpskStorage.createOrUpdateByName(name, { name, ...value }),
        )()
    }

    @Delete("/:name")
    async delete(@Param("name") name: string): Promise<void> {
        await this.mpskStorage.deleteByName(name)
    }

    @Get("/")
    @EncodeResponseWith(ListMPSKsResponseType)
    async list(): Promise<ListMPSKsResponse> {
        return await this.mpskStorage.all()
    }
}
