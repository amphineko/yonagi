import {
    BadRequestException,
    Body,
    Controller,
    Inject,
    InternalServerErrorException,
    NotFoundException,
    Post,
    forwardRef,
} from "@nestjs/common"
import { Client } from "@yonagi/common/types/Client"
import { CallingStationIdAuthentication } from "@yonagi/common/types/MPSK"
import { NameType } from "@yonagi/common/types/Name"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as PR from "io-ts/lib/PathReporter"

import { EncodeResponseWith, mapLeftDecodeError, resolveOrThrow } from "./common"
import { DynamicClientResolver } from "../rlm_rest/dynclients"
import {
    RlmRestClientAuthRequestType,
    RlmRestClientAuthResponse,
    RlmRestClientAuthResponseType,
} from "../rlm_rest/types/clientAuth"
import {
    RlmRestMacAuthRequestType,
    RlmRestMacAuthResponse,
    RlmRestMacAuthResponseType,
} from "../rlm_rest/types/macAuth"
import { AbstractMPSKStorage } from "../storages"

@Controller("/api/v1/rlm_rest")
export class RlmRestController {
    constructor(
        @Inject(forwardRef(() => AbstractMPSKStorage)) private readonly mpskStorage: AbstractMPSKStorage,
        @Inject(forwardRef(() => DynamicClientResolver)) private readonly clientResolver: DynamicClientResolver,
    ) {}

    @Post("/mac/authorize")
    @EncodeResponseWith(RlmRestMacAuthResponseType)
    async authorize(@Body() rawBody: unknown): Promise<RlmRestMacAuthResponse> {
        return await F.pipe(
            TE.fromEither(
                F.pipe(
                    RlmRestMacAuthRequestType.decode(rawBody),
                    E.mapLeft((errors) => new BadRequestException(PR.failure(errors))),
                ),
            ),
            TE.flatMap(({ callingStationId }) =>
                TE.tryCatch(
                    () => this.mpskStorage.getByCallingStationId(callingStationId),
                    (reason) => new InternalServerErrorException(reason),
                ),
            ),
            TE.filterOrElse(
                (mpsk): mpsk is CallingStationIdAuthentication => mpsk !== null,
                () => new NotFoundException("No MPSK found"),
            ),
            TE.map(({ psk }) => ({ arubaMpskPassphrase: psk, mediumType: "IEEE-802" as const })),
            resolveOrThrow(),
        )()
    }

    @Post("/clients/authorize")
    @EncodeResponseWith(RlmRestClientAuthResponseType)
    async authorizeClient(@Body() rawBody: unknown): Promise<RlmRestClientAuthResponse> {
        const o = await F.pipe(
            TE.Do,
            TE.bind("request", () =>
                TE.fromEither(
                    F.pipe(
                        RlmRestClientAuthRequestType.decode(rawBody),
                        mapLeftDecodeError((message) => new BadRequestException(message)),
                    ),
                ),
            ),
            TE.bind("client", ({ request: { clientIpAddr } }) =>
                F.pipe(
                    TE.tryCatch(
                        async () => await this.clientResolver.getClientBySourceIp(clientIpAddr),
                        (reason) => new InternalServerErrorException(reason),
                    ),
                    TE.filterOrElse(
                        (client): client is Client => client !== null,
                        () => new NotFoundException("No client found"),
                    ),
                ),
            ),
            TE.bind("name", ({ client: { name }, request: { clientIpAddr } }) =>
                F.pipe(
                    NameType.decode(`${name}-${clientIpAddr.address.toString()}`),
                    mapLeftDecodeError((message) => new InternalServerErrorException(message)),
                    TE.fromEither,
                ),
            ),
            TE.map(({ name, client: { secret } }) => ({ name, secret })),
            resolveOrThrow(),
        )()
        return o
    }
}
