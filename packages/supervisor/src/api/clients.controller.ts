import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Inject,
    Param,
    Post,
    UseInterceptors,
    forwardRef,
} from "@nestjs/common"
import {
    BulkCreateOrUpdateClientsRequestType,
    CreateClientRequestType,
    ListClientsResponse,
    ListClientsResponseType,
    UpdateClientRequestType,
} from "@yonagi/common/api/clients"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"

import { ResponseInterceptor } from "./api.middleware"
import { EncodeResponseWith, createOrUpdate, resolveOrThrow, validateNameOfRequest } from "./common"
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
            (name, value) => this.clientStorage.createOrUpdateByName(name, { name, ...value }),
        )()
    }

    @Delete("/:name")
    async delete(@Param("name") name: string): Promise<void> {
        await F.pipe(
            TE.fromEither(validateNameOfRequest(name)),
            TE.flatMap((name) => TE.tryCatch(async () => await this.clientStorage.deleteByName(name), E.toError)),
            resolveOrThrow(),
        )()
    }

    @Post("/")
    async import(@Body() body: unknown): Promise<void> {
        await F.pipe(
            TE.fromEither(BulkCreateOrUpdateClientsRequestType.decode(body)),
            TE.mapLeft((errors) => new BadRequestException(errors.join(", "))),
            TE.flatMap((clients) =>
                TE.tryCatch(async () => {
                    await this.clientStorage.bulkCreateOrUpdate(clients)
                }, E.toError),
            ),
            resolveOrThrow(),
        )()
    }

    @Get("/")
    @EncodeResponseWith(ListClientsResponseType)
    async list(): Promise<ListClientsResponse> {
        return await this.clientStorage.all()
    }
}
