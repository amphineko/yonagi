import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"

export const RelativeDistinguishedNamesType = t.type({
    commonName: t.string,
    organizationName: t.string,
})

export type RelativeDistinguishedNames = t.TypeOf<typeof RelativeDistinguishedNamesType>

export const SerialNumberStringType = new t.Type<string, string, unknown>(
    "SerialNumberString",
    (u): u is string => typeof u === "string",
    (u, c) =>
        F.pipe(
            t.string.validate(u, c),
            E.map((u) => u.split(":").map((s) => s.trim().toLowerCase())),
            E.flatMap((u) =>
                u.length > 0 && u.length <= 20 && u.every((s) => /^[0-9a-f]{2}$/.test(s))
                    ? t.success(u.join(":"))
                    : t.failure(u, c, "Input is not a valid serial number"),
            ),
        ),
    (a) => a,
)

export type SerialNumberString = t.TypeOf<typeof SerialNumberStringType>
