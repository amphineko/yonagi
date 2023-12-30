import * as t from "io-ts"

export const RelativeDistinguishedNamesType = t.type({
    commonName: t.string,
    organizationName: t.string,
})

export type RelativeDistinguishedNames = t.TypeOf<typeof RelativeDistinguishedNamesType>
