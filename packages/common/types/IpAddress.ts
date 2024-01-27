import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"

export interface IpAddress {
    family: "inet" | "inet6"
    address: bigint
}

const BaseIpAddressType: t.Type<IpAddress> = t.type({
    family: t.union([t.literal("inet"), t.literal("inet6")]),
    address: t.bigint,
})

function getAddressUpperBound(family: "inet" | "inet6"): E.Either<string, bigint> {
    switch (family) {
        case "inet":
            return E.right(0xffffffffn)
        case "inet6":
            return E.right(0xffffffffffffffffffffffffffffffffn)
        default:
            return E.left(`Unknown IP address family: ${family as string}`)
    }
}

export const IpAddressType = new t.Type<IpAddress>(
    "IpAddress",
    (u): u is IpAddress => E.isRight(IpAddressType.validate(u, [])),
    (u, c) =>
        F.pipe(
            BaseIpAddressType.validate(u, c),
            E.tap(({ address, family }) =>
                F.pipe(
                    getAddressUpperBound(family),
                    E.chain((upperBound) =>
                        address >= 0 && address <= upperBound
                            ? E.right(void 0)
                            : E.left(`IP address is out of range: ${address}`),
                    ),
                    E.orElse((e) => t.failure(u, c, e)),
                ),
            ),
        ),
    (a) => a,
)
