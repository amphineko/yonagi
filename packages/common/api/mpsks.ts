import * as t from "io-ts/lib/index"

import { CallingStationIdType } from "../types/CallingStationId"
import { MPSKType } from "../types/MPSK"
import { PSKType } from "../types/PSK"

export const CreateOrUpdateMPSKRequestProps = {
    callingStationId: CallingStationIdType,
    psk: PSKType,
}

export const CreateMPSKRequestType = t.type(CreateOrUpdateMPSKRequestProps)

export const UpdateMPSKRequestType = t.partial(CreateOrUpdateMPSKRequestProps)

export const ListMPSKsResponseType = t.readonlyArray(MPSKType)

export type ListMPSKsResponse = t.TypeOf<typeof ListMPSKsResponseType>

export const BulkCreateOrUpdateMPSKsRequestType = t.readonlyArray(MPSKType)

export type BulkCreateOrUpdateMPSKsRequest = t.TypeOf<typeof BulkCreateOrUpdateMPSKsRequestType>
