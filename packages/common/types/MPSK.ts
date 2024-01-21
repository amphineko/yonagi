import * as t from "io-ts/lib/index"

import { CallingStationId, CallingStationIdType } from "./CallingStationId"
import { Name, NameType } from "./Name"
import { PSK, PSKType } from "./PSK"

export interface CallingStationIdAuthentication {
    callingStationId: CallingStationId
    name: Name
    psk: PSK
    ssid?: string
    vlan?: number
}

interface EncodedCallingStationIdAuthentication {
    callingStationId: string
    name: string
    psk: string
    ssid?: string
    vlan?: number
}

export const MPSKType: t.Type<CallingStationIdAuthentication, EncodedCallingStationIdAuthentication> = t.intersection([
    t.type({
        callingStationId: CallingStationIdType,
        name: NameType,
        psk: PSKType,
    }),
    t.partial({
        ssid: t.string,
        vlan: t.number,
    }),
])
