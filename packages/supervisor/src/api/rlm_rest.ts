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
import { CallingStationIdAuthentication } from "@yonagi/common/types/MPSK"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as PR from "io-ts/lib/PathReporter"

import { resolveOrThrow } from "./common"
import { RawRlmRestResponse, RlmRestRequestType } from "../rlm_rest/types"
import { AbstractMPSKStorage } from "../storages"

@Controller("/api/v1/rlm_rest")
export class RlmRestController {
    constructor(@Inject(forwardRef(() => AbstractMPSKStorage)) private readonly mpskStorage: AbstractMPSKStorage) {}

    @Post("/authorize")
    async authorize(@Body() rawBody: unknown): Promise<RawRlmRestResponse> {
        return await F.pipe(
            TE.Do,
            // parse request from radiusd
            TE.bind("request", () =>
                TE.fromEither(
                    F.pipe(
                        RlmRestRequestType.decode(rawBody),
                        E.mapLeft((errors) => new BadRequestException(PR.failure(errors))),
                    ),
                ),
            ),
            // lookup mpsk by calling station id (i.e. client mac) and set radius attributes (if found)
            TE.bind("mpsk", ({ request: { callingStationId } }) =>
                F.pipe(
                    TE.tryCatch(async () => {
                        const mpsk = await this.mpskStorage.getByCallingStationId(callingStationId)
                        if (mpsk) {
                            return this.createMpskResponse(mpsk)
                        }
                    }, E.toError),
                    TE.mapLeft((error) => new InternalServerErrorException(error.message)),
                ),
            ),
            // flatten previous lookup results
            TE.map(({ mpsk }): RawRlmRestResponse => ({ ...mpsk })),
            // return not found error if nothing found
            TE.flatMap((response) =>
                Object.keys(response).length > 0 ? TE.right(response) : TE.left(new NotFoundException("No MPSK found")),
            ),
            // throw caught errors
            resolveOrThrow(),
        )()
    }

    private createMpskResponse(mpsk: CallingStationIdAuthentication): RawRlmRestResponse {
        return {
            "Aruba-MPSK-Passphrase": {
                type: "string",
                value: [mpsk.psk],
            },
            "Tunnel-Medium-Type": {
                type: "string",
                value: ["IEEE-802"],
            },
        }
    }
}
