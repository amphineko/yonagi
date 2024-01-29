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
    BulkCreateOrUpdateMPSKsRequestType,
    CreateOrUpdateMPSKRequestType,
    ListMPSKsResponse,
    ListMPSKsResponseType,
} from "@yonagi/common/api/mpsks"
import { NameType } from "@yonagi/common/types/Name"
import { getOrThrow, tryCatchF } from "@yonagi/common/utils/TaskEither"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"

import { ResponseInterceptor } from "./api.middleware"
import { EncodeResponseWith, validateRequestParam } from "./common"
import { AbstractMPSKStorage } from "../storages"

@Controller("/api/v1/mpsks")
@UseInterceptors(ResponseInterceptor)
export class MPSKController {
    constructor(@Inject(forwardRef(() => AbstractMPSKStorage)) private mpskStorage: AbstractMPSKStorage) {}

    @Post("/:name")
    async createOrUpdate(@Param("name") rawName: string, @Body() body: unknown): Promise<void> {
        await F.pipe(
            E.Do,
            E.bind("name", () => validateRequestParam(rawName, NameType)),
            E.bind("value", () => validateRequestParam(body, CreateOrUpdateMPSKRequestType)),
            E.filterOrElseW(
                ({ name, value }) => name === value.name,
                () => new BadRequestException("Name in path and body must be same"),
            ),
            TE.fromEither,
            tryCatchF(
                ({ name, value }) => this.mpskStorage.createOrUpdateByName(name, value),
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
                (name) => this.mpskStorage.deleteByName(name),
                (reason) => new BadRequestException(String(reason)),
            ),
            getOrThrow(),
        )()
    }

    @Post("/")
    async import(@Body() body: unknown): Promise<void> {
        await F.pipe(
            TE.fromEither(validateRequestParam(body, BulkCreateOrUpdateMPSKsRequestType)),
            tryCatchF(
                (clients) => this.mpskStorage.bulkCreateOrUpdate(clients),
                (reason) => new BadRequestException(String(reason)),
            ),
            getOrThrow(),
        )()
    }

    @Get("/")
    @EncodeResponseWith(ListMPSKsResponseType)
    async list(): Promise<ListMPSKsResponse> {
        return await this.mpskStorage.all()
    }
}
