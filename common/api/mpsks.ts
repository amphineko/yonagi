import * as t from "io-ts/lib"

import { SanitizedCallingStationId, SanitizedPSK } from "../mpsks"

export const CreateOrUpdateMPSKRequestProps = {
    callingStationId: SanitizedCallingStationId,
    psk: SanitizedPSK,
}

export const CreateMPSKRequestCodec = t.type({
    callingStationId: SanitizedCallingStationId,
    psk: SanitizedPSK,
})

export interface CreateMPSKRequest extends t.TypeOf<typeof CreateMPSKRequestCodec> {}

export const UpdateMPSKRequestCodec = t.partial({
    callingStationId: SanitizedCallingStationId,
    psk: SanitizedPSK,
})

export interface UpdateMPSKRequest extends t.TypeOf<typeof UpdateMPSKRequestCodec> {}
