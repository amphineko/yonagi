import { Body, Controller, Delete, Get, Inject, Param, Post, UseInterceptors, forwardRef } from "@nestjs/common"
import {
    CreateClientRequestType,
    ListClientsResponse,
    ListClientsResponseType,
    UpdateClientRequestType,
} from "@yonagi/common/api/clients"

import { ResponseInterceptor } from "./api.middleware"
import { EncodeResponseWith, createOrUpdate } from "./common"
import { AbstractClientStorage } from "../storages"

@Controller("/api/v1/clients")
@UseInterceptors(ResponseInterceptor)
export class RadiusClientController {
    constructor(@Inject(forwardRef(() => AbstractClientStorage)) private clientStorage: AbstractClientStorage) {}

    @Post("/:name")
    async createOrUpdate(@Param("name") rawName: string, @Body() body: unknown): Promise<void> {
        await createOrUpdate(
            rawName,
            body,
            CreateClientRequestType,
            UpdateClientRequestType,
            (name) => this.clientStorage.getByName(name),
            (name, value) => this.clientStorage.createOrUpdateByName(name, value),
        )()
    }

    @Delete("/:name")
    async delete(@Param("name") name: string): Promise<void> {
        await this.clientStorage.deleteByName(name)
    }

    @Get("/")
    @EncodeResponseWith(ListClientsResponseType)
    async list(): Promise<ListClientsResponse> {
        return await this.clientStorage.all()
    }
}
