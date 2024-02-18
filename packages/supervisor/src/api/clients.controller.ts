import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Inject,
    InternalServerErrorException,
    Param,
    Post,
    UseInterceptors,
    forwardRef,
} from "@nestjs/common"
import {
    BulkCreateOrUpdateClientsRequestType,
    CreateOrUpdateClientRequestType,
    ListClientsResponse,
    ListClientsResponseType,
} from "@yonagi/common/api/clients"
import { NameType } from "@yonagi/common/types/Name"
import { getOrThrow, tryCatchF } from "@yonagi/common/utils/TaskEither"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"

import { ResponseInterceptor } from "./api.middleware"
import { EncodeResponseWith, validateRequestParam } from "./common"
import { AbstractClientStorage } from "../storages"

@Controller("/api/v1/clients")
@UseInterceptors(ResponseInterceptor)
export class RadiusClientController {
    constructor(@Inject(forwardRef(() => AbstractClientStorage)) private clientStorage: AbstractClientStorage) {}

    @Post("/:name")
    async createOrUpdate(@Param("name") rawName: string, @Body() body: unknown): Promise<void> {
        await F.pipe(
            E.Do,
            E.bind("name", () => validateRequestParam(rawName, NameType)),
            E.bind("value", () => validateRequestParam(body, CreateOrUpdateClientRequestType)),
            E.filterOrElseW(
                ({ name, value }) => name === value.name,
                () => new BadRequestException("Name in path and body must be same"),
            ),
            TE.fromEither,
            tryCatchF(
                ({ name, value }) => this.clientStorage.createOrUpdateByName(name, value),
                (reason) => new InternalServerErrorException(String(reason)),
            ),
            getOrThrow(),
        )()
    }

    @Delete("/:name")
    async delete(@Param("name") name: string): Promise<void> {
        await F.pipe(
            TE.fromEither(validateRequestParam(name, NameType)),
            tryCatchF(
                (name) => this.clientStorage.deleteByName(name),
                (reason) => new InternalServerErrorException(String(reason)),
            ),
            getOrThrow(),
        )()
    }

    @Post("/")
    async bulkCreateOrUpdate(@Body() body: unknown): Promise<void> {
        await F.pipe(
            TE.fromEither(BulkCreateOrUpdateClientsRequestType.decode(body)),
            TE.mapLeft((errors) => new BadRequestException(errors.join(", "))),
            tryCatchF(
                (clients) => this.clientStorage.bulkCreateOrUpdate(clients),
                (reason) => new InternalServerErrorException(String(reason)),
            ),
            getOrThrow(),
        )()
    }

    @Get("/")
    @EncodeResponseWith(ListClientsResponseType)
    async list(): Promise<ListClientsResponse> {
        return (await this.clientStorage.all()).map((client) => ({
            name: client.name,
            ipaddr: client.ipaddr,
            secret: client.secret,
        }))
    }
}
