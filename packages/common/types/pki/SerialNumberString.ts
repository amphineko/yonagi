import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"

export const SerialNumberStringType = new t.Type<string, string, unknown>(
    "SerialNumberString",
    (u): u is string => {
        const validation = SerialNumberStringType.validate(u, [])
        return E.isRight(validation) && u === validation.right
    },
    (u, c) =>
        F.pipe(
            t.string.validate(u, c),
            E.map((s) => s.toLowerCase().replace(/:/g, "")),
            E.tap(
                F.flow(
                    E.fromPredicate(
                        (s) => /^[0-9a-f]+$/.test(s),
                        () => "Serial number contains non-hexadecimal characters",
                    ),
                    E.filterOrElse(
                        (s) => s.length === 32,
                        () => "Serial number is not 16 bytes long",
                    ),
                    E.orElse((e) => t.failure(u, c, e)),
                ),
            ),
        ),
    (a) => a,
)

export type SerialNumberString = t.TypeOf<typeof SerialNumberStringType>
