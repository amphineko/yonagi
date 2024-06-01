import { RelativeDistinguishedNames } from "@yonagi/common/types/pki/RelativeDistinguishedNames"
import * as asn1js from "asn1js"
import * as pkijs from "pkijs"

import { OID_CommonName, OID_OrganizationName } from "../consts"

export class ExtendedRelativeDistinguishedNames extends pkijs.RelativeDistinguishedNames {
    toSchema(): asn1js.Sequence {
        return new asn1js.Sequence({
            value: Array.from(this.typesAndValues, (element) => new asn1js.Set({ value: [element.toSchema()] })),
        })
    }
}

export function convertRdnToPkijsRdn(rdn: RelativeDistinguishedNames): ExtendedRelativeDistinguishedNames {
    return new ExtendedRelativeDistinguishedNames({
        typesAndValues: [
            new pkijs.AttributeTypeAndValue({
                type: OID_CommonName,
                value: new asn1js.BmpString({ value: rdn.commonName }),
            }),
            new pkijs.AttributeTypeAndValue({
                type: OID_OrganizationName,
                value: new asn1js.BmpString({ value: rdn.organizationName }),
            }),
        ],
    })
}
