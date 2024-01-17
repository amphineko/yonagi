import * as t from "io-ts/lib/index"

import { CallingStationIdAuthenticationType, CallingStationIdType, PSKType } from "../mpsks"

export const CreateOrUpdateMPSKRequestProps = {
    callingStationId: CallingStationIdType,
    psk: PSKType,
}

export const CreateMPSKRequestType = t.type(CreateOrUpdateMPSKRequestProps)

export const UpdateMPSKRequestType = t.partial(CreateOrUpdateMPSKRequestProps)

export const ListMPSKsResponseType = t.readonlyArray(CallingStationIdAuthenticationType)

export type ListMPSKsResponse = t.TypeOf<typeof ListMPSKsResponseType>
