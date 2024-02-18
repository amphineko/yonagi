import * as t from "io-ts/lib/index"

import { MPSKType } from "../types/mpsks/MPSK"

export const CreateOrUpdateMPSKRequestType = MPSKType

export const ListMPSKsResponseType = t.readonlyArray(MPSKType)

export type ListMPSKsResponse = t.TypeOf<typeof ListMPSKsResponseType>

export const BulkCreateOrUpdateMPSKsRequestType = t.readonlyArray(MPSKType)

export type BulkCreateOrUpdateMPSKsRequest = t.TypeOf<typeof BulkCreateOrUpdateMPSKsRequestType>
