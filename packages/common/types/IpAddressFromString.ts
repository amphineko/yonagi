import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts/lib/index"

export type IpAddressString = t.Branded<string, "IpAddress">

export const IpAddressStringType = new t.Type<IpAddressString, string, unknown>(
    "IpAddress",
    (u): u is IpAddressString => E.isRight(IpAddressStringType.validate(u, [])),
    (u, c) =>
        F.pipe(
            t.string.validate(u, c),
            E.flatMap((s): t.Validation<number[]> => {
                const parts = s.split(".").map((p) => Number(p))
                return parts.length === 4 && parts.every((p) => Number.isInteger(p))
                    ? t.success(parts)
                    : t.failure(u, c, `Malformed IP address: ${s}`)
            }),
            E.flatMap((parts) => {
                return parts.every((p) => p >= 0 && p <= 255)
                    ? t.success(parts.join("."))
                    : t.failure(u, c, `IP octets are out of range: ${parts.join(", ")}`)
            }),
            E.map((s) => s as IpAddressString),
        ),
    (a) => a,
)
