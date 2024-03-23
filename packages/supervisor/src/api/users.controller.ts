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
} from "@nestjs/common"
import {
    CreateOrUpdateUserRequestType,
    ListUserPasswordStatusResponseType,
    ListUserResponse,
    UpdateUserPasswordsRequestType,
} from "@yonagi/common/api/users"
import { RadiusUserPasswordStatus } from "@yonagi/common/types/users/RadiusUser"
import { UsernameType } from "@yonagi/common/types/users/Username"
import { mapValidationLeftError } from "@yonagi/common/utils/Either"
import { getOrThrow, tryCatchF } from "@yonagi/common/utils/TaskEither"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"

import { ResponseInterceptor } from "./api.middleware"
import { EncodeResponseWith } from "./common"
import { AbstractRadiusUserPasswordStorage, AbstractRadiusUserStorage } from "../storages"

@Controller("/api/v1/users")
@UseInterceptors(ResponseInterceptor)
export class RadiusUserController {
    @Get("/")
    async all(): Promise<ListUserResponse> {
        return await this.storage.all()
    }

    @Post("/:username")
    async createOrUpdate(@Param("username") unknownUsername: unknown, @Body() u: unknown): Promise<void> {
        await F.pipe(
            TE.fromEither(
                F.pipe(
                    E.Do,
                    E.bindW("username", () => UsernameType.decode(unknownUsername)),
                    E.bindW("form", () => CreateOrUpdateUserRequestType.decode(u)),
                    mapValidationLeftError((e) => new BadRequestException(String(e))),
                ),
            ),
            tryCatchF(
                ({ username, form }) => this.storage.createOrUpdate(username, { username, ...form }),
                (reason) => new Error(String(reason)),
            ),
            getOrThrow(),
        )()
    }

    @Delete("/:username")
    async delete(@Param("username") unknownUsername: unknown): Promise<void> {
        await F.pipe(
            TE.fromEither(
                F.pipe(
                    UsernameType.decode(unknownUsername),
                    mapValidationLeftError((e) => new Error(String(e))),
                ),
            ),
            tryCatchF(
                (username) => this.storage.deleteByUsername(username),
                (reason) => new Error(String(reason)),
            ),
            getOrThrow(),
        )()
    }

    constructor(@Inject(AbstractRadiusUserStorage) private readonly storage: AbstractRadiusUserStorage) {}
}

@Controller("/api/v1/passwords")
@UseInterceptors(ResponseInterceptor)
export class RadiusUserPasswordController {
    @Get("/")
    @EncodeResponseWith(ListUserPasswordStatusResponseType)
    async all(): Promise<readonly RadiusUserPasswordStatus[]> {
        return await this.storage.allStatus()
    }

    @Post("/:username")
    async update(@Param("username") unknownUsername: unknown, @Body() u: unknown): Promise<void> {
        await F.pipe(
            TE.fromEither(
                F.pipe(
                    E.Do,
                    E.bindW("username", () => UsernameType.decode(unknownUsername)),
                    E.bindW("form", () => UpdateUserPasswordsRequestType.decode(u)),
                    mapValidationLeftError((e) => new BadRequestException(String(e))),
                ),
            ),
            tryCatchF(
                ({ username, form }) => this.storage.createOrUpdate(username, form),
                (reason) => new Error(String(reason)),
            ),
            getOrThrow(),
        )()
    }

    constructor(
        @Inject(AbstractRadiusUserPasswordStorage) private readonly storage: AbstractRadiusUserPasswordStorage,
    ) {}
}
