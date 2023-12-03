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
    CreateMPSKRequest,
    CreateMPSKRequestCodec,
    UpdateMPSKRequest,
    UpdateMPSKRequestCodec,
} from "@yonagi/common/api/mpsks"
import { CallingStationIdAuthentication, SanitizedName } from "@yonagi/common/mpsks"
import * as E from "fp-ts/lib/Either"
import { PathReporter } from "io-ts/lib/PathReporter"
import * as t from "io-ts/lib/index"

import { ResponseInterceptor } from "./api.middleware"
import { MPSKStorage } from "../radiusd/storages"

@Controller("/api/v1/mpsks")
@UseInterceptors(ResponseInterceptor)
export class MPSKController {
    constructor(@Inject(forwardRef(() => MPSKStorage)) private mpskStorage: MPSKStorage) {}

    @Post("/:name")
    async createOrUpdate(@Param("name") rawName: string, @Body() body: unknown): Promise<void> {
        const name = E.getOrElse<t.Errors, string>(() => {
            throw new Error(`Malformed MPSK entry name: ${rawName}`)
        })(SanitizedName.decode(rawName))

        let mpsk = await this.mpskStorage.get(name)
        if (mpsk) {
            // parse and validate with partial codec, omitted fields will not be updated
            const request = E.getOrElse<t.Errors, UpdateMPSKRequest>((error) => {
                throw new BadRequestException(
                    `Invalid request payload: ${PathReporter.report(E.left(error)).join(", ")}`,
                )
            })(UpdateMPSKRequestCodec.decode(body))
            mpsk = {
                ...mpsk,
                ...request,
            }
        } else {
            // parse and validate with full codec, all fields are required
            const request = E.getOrElse<t.Errors, CreateMPSKRequest>((error) => {
                throw new BadRequestException(`Invalid request: ${PathReporter.report(E.left(error)).join(", ")}`)
            })(CreateMPSKRequestCodec.decode(body))
            mpsk = {
                name,
                ...request,
                allowedAssociations: undefined,
            }
        }

        await this.mpskStorage.set(name, mpsk)
    }

    @Delete("/:name")
    async delete(@Param("name") name: string): Promise<void> {
        await this.mpskStorage.delete(name)
    }

    @Get("/")
    async list(): Promise<CallingStationIdAuthentication[]> {
        return await this.mpskStorage.list()
    }
}
