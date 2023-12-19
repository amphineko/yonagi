import * as t from "io-ts/lib"

import { CallingStationIdType, PSKType } from "../mpsks"

export const CreateOrUpdateMPSKRequestProps = {
    callingStationId: CallingStationIdType,
    psk: PSKType,
}

export const CreateMPSKRequestCodec = t.type({
    callingStationId: CallingStationIdType,
    psk: PSKType,
})

export type CreateMPSKRequest = t.TypeOf<typeof CreateMPSKRequestCodec>

export const UpdateMPSKRequestCodec = t.partial({
    callingStationId: CallingStationIdType,
    psk: PSKType,
})

export type UpdateMPSKRequest = t.TypeOf<typeof UpdateMPSKRequestCodec>
