import * as t from "io-ts/lib/index"

import { IpAddressString, IpAddressStringType } from "./IpAddressFromString"
import { NetMask, NetMaskType } from "./NetMask"

export interface IpNetwork {
    address: IpAddressString
    netmask: NetMask
}

export interface EncodedIpNetwork {
    address: string
    netmask: number
}

export const IpNetworkType: t.Type<IpNetwork, EncodedIpNetwork> = t.type({
    address: IpAddressStringType,
    netmask: NetMaskType,
})

export const IpNetworkFromStringType = new t.Type<IpNetwork, string, unknown>(
    "IpNetworkFromString",
    (u): u is IpNetwork => IpNetworkType.is(u),
    (u, c) => {
        if (typeof u !== "string") {
            return t.failure(u, c)
        }

        const parts = u.split("/")
        return IpNetworkType.validate(
            {
                address: parts[0],
                netmask: parts[1] ?? 32,
            },
            c,
        )
    },
    (a) => `${a.address}/${a.netmask}`,
)
