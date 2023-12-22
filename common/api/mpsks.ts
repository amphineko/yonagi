import * as t from "io-ts/lib/index"

import { MapFromRecordType } from "./common"
import { NameType } from "../common"
import { CallingStationIdAuthenticationType, CallingStationIdType, PSKType } from "../mpsks"

export const CreateOrUpdateMPSKRequestProps = {
    callingStationId: CallingStationIdType,
    psk: PSKType,
}

export const CreateMPSKRequestType = t.type(CreateOrUpdateMPSKRequestProps)

export const UpdateMPSKRequestType = t.partial(CreateOrUpdateMPSKRequestProps)

export const ListMPSKsResponseType = MapFromRecordType(NameType, CallingStationIdAuthenticationType)

export type ListMPSKsResponse = t.TypeOf<typeof ListMPSKsResponseType>
