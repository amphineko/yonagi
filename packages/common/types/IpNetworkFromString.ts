import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts/lib/index"

import { PositiveIntegerFromString } from "./Integers"
import { IpAddressFromStringType } from "./IpAddressFromString"
import { IpNetwork, IpNetworkType } from "./IpNetwork"

/**
 * CIDR-notated IP network representation.
 */

export const IpNetworkFromStringType = new t.Type<IpNetwork, string, unknown>(
    "IpNetworkFromString",
    (u): u is IpNetwork => IpNetworkType.is(u),
    (u, c) =>
        F.pipe(
            t.string.validate(u, c),
            E.flatMap((s) => validateRegExp(s, c, /^([0-9a-fA-F.:]+)(\/([0-9]+))?$/)),
            E.flatMap(([, address, , netmask]) =>
                F.pipe(
                    E.Do,
                    E.bind("address", () => IpAddressFromStringType.validate(address, c)),
                    E.bind("netmask", ({ address: { family } }) =>
                        netmask
                            ? PositiveIntegerFromString.validate(netmask, c)
                            : E.right(getDefaultNetMaskByFamily(family)),
                    ),
                ),
            ),
            E.flatMap((network) => IpNetworkType.validate(network, c)),
        ),
    (a) => `${IpAddressFromStringType.encode(a.address)}/${a.netmask}`,
)

function getDefaultNetMaskByFamily(family: "inet" | "inet6"): number {
    switch (family) {
        case "inet":
            return 32
        case "inet6":
            return 128
    }
}

function validateRegExp(s: string, c: t.Context, regexp: RegExp): t.Validation<RegExpExecArray> {
    return F.pipe(
        regexp.exec(s),
        E.fromNullable(`Input string does not match the pattern: ${regexp}`),
        E.orElse((e) => t.failure(s, c, e)),
    )
}
