import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts/lib/index"
import * as ipaddr from "ipaddr.js"

import { IpAddress, IpAddressType } from "./IpAddress"

function byteArrayToBigInt(bytes: readonly number[]): bigint {
    return bytes.reduce((acc, byte) => (acc << 8n) + BigInt(byte), 0n)
}

function bigIntToByteArray(n: bigint, size: number): number[] {
    const bytes = new Array<number>(size)
    for (let i = 0; i < size; i++) {
        bytes[size - i - 1] = Number(n & 0xffn)
        n >>= 8n
    }
    return bytes
}

function validateIpAddressString(s: string, c: t.Context): t.Validation<IpAddress> {
    return F.pipe(
        E.tryCatch(
            () => ipaddr.parse(s),
            (e) => String(e),
        ),
        E.orElse((e) => t.failure(s, c, `${e}: ${s}`)),
        E.flatMap((a) => {
            const kind = a.kind()
            switch (kind) {
                case "ipv4":
                    return t.success({
                        family: "inet",
                        address: byteArrayToBigInt(a.toByteArray()),
                    })
                case "ipv6":
                    return t.success({
                        family: "inet6",
                        address: byteArrayToBigInt(a.toByteArray()),
                    })
                default:
                    return t.failure(s, c, `Unknown IP address kind: ${kind as string}`)
            }
        }),
    )
}

function encodeIpAddressString(a: IpAddress): string {
    switch (a.family) {
        case "inet":
            return ipaddr.fromByteArray(bigIntToByteArray(a.address, 4)).toString()
        case "inet6":
            return ipaddr.fromByteArray(bigIntToByteArray(a.address, 16)).toString()
    }
}

export const IpAddressFromStringType = new t.Type<IpAddress, string, unknown>(
    "IpAddressFromString",
    (u): u is IpAddress => E.isRight(IpAddressType.validate(u, [])),
    (u, c) =>
        F.pipe(
            t.string.validate(u, c),
            E.flatMap((s) => validateIpAddressString(s, c)),
        ),
    (a) => encodeIpAddressString(a),
)
