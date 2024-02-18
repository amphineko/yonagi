import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts/lib/index"

import { IntegerRangeType } from "./Integers"
import { IpAddress, IpAddressType } from "./IpAddress"

/**
 * Internal IP network representation.
 */

export interface IpNetwork {
    address: IpAddress
    netmask: number
}

const InetNetMaskType = IntegerRangeType(0, 32)
const Inet6NetMaskType = IntegerRangeType(0, 128)

function getNetMaskTypeByFamily(family: "inet" | "inet6"): t.Type<number> {
    switch (family) {
        case "inet":
            return InetNetMaskType
        case "inet6":
            return Inet6NetMaskType
    }
}

const BaseIpNetworkType: t.Type<IpNetwork> = t.type({
    address: IpAddressType,
    netmask: t.number,
})

export const IpNetworkType = new t.Type<IpNetwork>(
    "IpNetwork",
    (u): u is IpNetwork => E.isRight(IpNetworkType.validate(u, [])),
    (u, c) =>
        F.pipe(
            BaseIpNetworkType.validate(u, c),
            E.tap(({ address, netmask }) => getNetMaskTypeByFamily(address.family).validate(netmask, c)),
        ),
    (a) => a,
)
