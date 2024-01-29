import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"

function validateCallingStationId(u: unknown, c: t.Context): t.Validation<CallingStationId> {
    return F.pipe(
        t.string.validate(u, c),
        E.map((s) => s.replace(/[:-]/g, "-").toLowerCase().split("-")),
        E.chain((a) =>
            a.length === 6 && a.every((s) => /^[0-9a-f]{2}$/.test(s))
                ? E.right(a.join("-") as CallingStationId)
                : t.failure(u, c, "Input is not a valid MAC address"),
        ),
    )
}

export type CallingStationId = t.Branded<string, "CallingStationId">

export const CallingStationIdType = new t.Type<CallingStationId, string>(
    "CallingStationId",
    // is string
    (u): u is CallingStationId => {
        const validation = validateCallingStationId(u, [])
        return E.isRight(validation) && u === validation.right
    },
    // match and normalize to aa-bb-cc-dd-ee-ff
    (u, c) => validateCallingStationId(u, c),
    // normalize to aa-bb-cc-dd-ee-ff
    (a) => a.toLowerCase().replace(/[:-]/g, "-"),
)
