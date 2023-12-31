import * as A from "fp-ts/lib/Array"
import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts/lib/index"

function sanitizeString(u: unknown, c: t.Context, maxLength: number): t.Validation<string> {
    return F.pipe(
        u,
        E.fromPredicate(
            (u): u is string => typeof u === "string",
            () => "Input is not a string",
        ),
        E.flatMap((u) => {
            const s = u.trim()
            return s.length > 0 && s.length <= maxLength
                ? E.right(s)
                : E.left(`Input is not a string or is longer than ${maxLength} characters`)
        }),
        E.fold(
            (e) => t.failure(u, c, e),
            (s) => t.success(s),
        ),
    )
}

export function MapType<
    KT extends t.Type<string>,
    VT extends t.Mixed,
    A extends ReadonlyMap<t.TypeOf<KT>, t.TypeOf<VT>>,
>(key: KT, value: VT, name = `Map<${key.name}, ${value.name}>`): t.Type<A, Map<t.OutputOf<KT>, t.OutputOf<VT>>> {
    return new t.Type(
        name,
        (u): u is A => u instanceof Map && Array.from(u.entries()).every(([k, v]) => key.is(k) && value.is(v)),
        (u, c) => {
            if (!(u instanceof Map)) {
                return t.failure(u, c, "Input is not a Map")
            }

            const tupleType = t.tuple([key, value])
            return F.pipe(
                Array.from(u.entries()),
                A.traverse(E.Applicative)((u) => tupleType.validate(u, c)),
                E.map((u) => new Map(u)),
            ) as t.Validation<A>
        },
        (a) =>
            F.pipe(
                Array.from(a.entries()),
                A.map(([k, v]) => [key.encode(k), value.encode(v)] as [t.OutputOf<KT>, t.OutputOf<VT>]),
                (a) => new Map(a),
            ),
    )
}

export const NameType = new t.Type<string, string, unknown>(
    "Name",
    (u): u is string => typeof u === "string",
    (u, c) => sanitizeString(u, c, 32),
    (a) => a,
)

export type Name = t.TypeOf<typeof NameType>

export const SecretType = new t.Type<string, string, unknown>(
    "Secret",
    (u): u is string => typeof u === "string",
    (u, c) => sanitizeString(u, c, 64),
    (a) => a,
)

export type Secret = t.TypeOf<typeof SecretType>

const IpAddressType = new t.Type<string, string, unknown>(
    "IpAddress",
    (u): u is string => typeof u === "string",
    (u, c) =>
        F.pipe(
            u,
            E.fromPredicate(
                (u): u is string => typeof u === "string",
                () => "Input is not a string",
            ),
            E.flatMap((u) => {
                const parts = u.split(".").map((p) => Number(p))
                return parts.length === 4 && parts.every((p) => Number.isInteger(p))
                    ? E.right(parts)
                    : E.left(`Malformed IP address: ${u}`)
            }),
            E.flatMap((parts) => {
                return parts.every((p) => p >= 0 && p <= 255)
                    ? E.right(parts.join("."))
                    : E.left(`IP octets are out of range: ${parts.join(", ")}`)
            }),
            E.fold(
                (e) => t.failure(u, c, e),
                (s) => t.success(s),
            ),
        ),
    (a) => a,
)

const NetMaskType = new t.Type<number, number, unknown>(
    "NetMask",
    (u): u is number => typeof u === "number",
    (u, c) => {
        const n = Number(u)
        return Number.isInteger(n) && n >= 0 && n <= 32 ? t.success(n) : t.failure(u, c)
    },
    (a) => a,
)

export const IpNetworkType = t.type({
    address: IpAddressType,
    netmask: NetMaskType,
})

export type IpNetwork = t.TypeOf<typeof IpNetworkType>

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

export type IpNetworkFromString = t.TypeOf<typeof IpNetworkFromStringType>
