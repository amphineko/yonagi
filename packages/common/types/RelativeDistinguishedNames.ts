import * as t from "io-ts"

import { NonEmptyStringType } from "./StringWithLengthRange"

export const RelativeDistinguishedNamesType = t.type({
    commonName: NonEmptyStringType,
    organizationName: NonEmptyStringType,
})

export type RelativeDistinguishedNames = t.TypeOf<typeof RelativeDistinguishedNamesType>
