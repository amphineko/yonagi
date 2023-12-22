import { Body, Controller, Delete, Get, Inject, Param, Post, UseInterceptors, forwardRef } from "@nestjs/common"
import {
    CreateClientRequestType,
    ListClientsResponse,
    ListClientsResponseType,
    UpdateClientRequestType,
} from "@yonagi/common/api/clients"

import { ResponseInterceptor } from "./api.middleware"
import { EncodeResponseWith, createOrUpdate } from "./common"
import { ClientStorage } from "../radiusd/storages"

@Controller("/api/v1/clients")
@UseInterceptors(ResponseInterceptor)
export class RadiusClientController {
    constructor(@Inject(forwardRef(() => ClientStorage)) private clientStorage: ClientStorage) {}

    @Post("/:name")
    async createOrUpdate(@Param("name") rawName: string, @Body() body: unknown): Promise<void> {
        await createOrUpdate(rawName, body, CreateClientRequestType, UpdateClientRequestType, this.clientStorage)()
    }

    @Delete("/:name")
    async delete(@Param("name") name: string): Promise<void> {
        await this.clientStorage.delete(name)
    }

    @Get("/")
    @EncodeResponseWith(ListClientsResponseType)
    async list(): Promise<ListClientsResponse> {
        return await this.clientStorage.all()
    }
}
