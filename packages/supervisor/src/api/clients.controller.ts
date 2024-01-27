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
    CreateOrUpdateClientRequestType,
    ListClientsResponse,
    ListClientsResponseType,
} from "@yonagi/common/api/clients"
import { Client } from "@yonagi/common/types/Client"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"

import { ResponseInterceptor } from "./api.middleware"
import { EncodeResponseWith, mapLeftDecodeError, resolveOrThrow, validateNameOfRequest } from "./common"
import { AbstractClientStorage } from "../storages"

@Controller("/api/v1/clients")
@UseInterceptors(ResponseInterceptor)
export class RadiusClientController {
    constructor(@Inject(forwardRef(() => AbstractClientStorage)) private clientStorage: AbstractClientStorage) {}

    @Post("/:name")
    async createOrUpdate(@Param("name") rawName: string, @Body() body: unknown): Promise<void> {
        await F.pipe(
            E.Do,
            E.bind("name", () => validateNameOfRequest(rawName)),
            E.bind(
                "value",
                (): E.Either<Error, Client> =>
                    F.pipe(
                        CreateOrUpdateClientRequestType.decode(body),
                        mapLeftDecodeError((message) => new BadRequestException(message)),
                    ),
            ),
            E.tap(
                F.flow(
                    E.fromPredicate(
                        ({ name, value }) => name === value.name,
                        () => "Name in path and body must be same",
                    ),
                    E.orElse((error) => E.left(new BadRequestException(error))),
                ),
            ),
            TE.fromEither,
            TE.flatMap(({ name, value }) =>
                TE.tryCatch(async () => {
                    await this.clientStorage.createOrUpdateByName(name, value)
                }, E.toError),
            ),
            resolveOrThrow(),
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
    async bulkCreateOrUpdate(@Body() body: unknown): Promise<void> {
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
        return (await this.clientStorage.all()).map((client) => ({
            name: client.name,
            ipaddr: client.ipaddr,
            secret: client.secret,
        }))
    }
}
