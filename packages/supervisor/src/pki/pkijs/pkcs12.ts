import * as asn1js from "asn1js"
import * as pkijs from "pkijs"

import {
    OID_PKCS12_BagId_CertBag,
    OID_PKCS12_BagId_PKCS8ShroudedKeyBag,
    OID_PKCS9_FriendlyName,
    OID_PKCS9_LocalKeyId,
} from "../consts"

function getSafeContentEncryptionParams(algorithm: "DES-EDE3-CBC" | "RC2-40-CBC", password: ArrayBuffer) {
    const params = {
        contentEncryptionAlgorithm: {
            name: algorithm,
        } as pkijs.ContentEncryptionAlgorithm,
        hmacHashAlgorithm: "",
        iterationCount: 2048,
        password,
        pbeScheme: "pbes1",
    }
    return params as Omit<typeof params, "pbeScheme">
}

export async function exportAsPkcs12(
    cert: pkijs.Certificate,
    privKey: CryptoKey,
    addCerts: pkijs.Certificate[],
    p12Password: string,
    crypto: pkijs.ICryptoEngine,
): Promise<ArrayBuffer> {
    const password = Buffer.from(p12Password, "utf8")
    const certKeyId = crypto.getRandomValues(new Uint8Array(4))

    /* certificates */
    const certBag = new pkijs.SafeBag({
        bagId: OID_PKCS12_BagId_CertBag,
        bagValue: new pkijs.CertBag({
            parsedValue: cert,
        }),
        bagAttributes: [
            new pkijs.Attribute({
                type: OID_PKCS9_LocalKeyId,
                values: [
                    new asn1js.OctetString({
                        valueHex: certKeyId,
                    }),
                ],
            }),
            new pkijs.Attribute({
                type: OID_PKCS9_FriendlyName,
                values: [new asn1js.BmpString({ value: "certificate" })],
            }),
        ],
    })

    const certSafeContent = new pkijs.SafeContents({
        safeBags: [
            certBag,
            ...addCerts.map(
                (cert) =>
                    new pkijs.SafeBag({
                        bagId: OID_PKCS12_BagId_CertBag,
                        bagValue: new pkijs.CertBag({
                            parsedValue: cert,
                        }),
                        bagAttributes: [
                            new pkijs.Attribute({
                                type: OID_PKCS9_FriendlyName,
                                values: [new asn1js.BmpString({ value: "trust anchor" })],
                            }),
                        ],
                    }),
            ),
        ],
    })

    /* private key */
    const pkcs8KeyBag = new pkijs.PKCS8ShroudedKeyBag({
        parsedValue: pkijs.PrivateKeyInfo.fromBER(await crypto.exportKey("pkcs8", privKey)),
    })
    await pkcs8KeyBag.makeInternalValues(getSafeContentEncryptionParams("DES-EDE3-CBC", password), crypto)

    const privKeySafeContent = new pkijs.SafeContents({
        safeBags: [
            new pkijs.SafeBag({
                bagId: OID_PKCS12_BagId_PKCS8ShroudedKeyBag,
                bagValue: pkcs8KeyBag,
                bagAttributes: [
                    new pkijs.Attribute({
                        type: OID_PKCS9_FriendlyName,
                        values: [new asn1js.BmpString({ value: "private key" })],
                    }),
                    new pkijs.Attribute({
                        type: OID_PKCS9_LocalKeyId,
                        values: [new asn1js.OctetString({ valueHex: certKeyId })],
                    }),
                ],
            }),
        ],
    })

    /* pfx of cert and private key */
    const authenticatedSafe = new pkijs.AuthenticatedSafe({
        parsedValue: {
            safeContents: [
                {
                    privacyMode: 1, // password-based privacy
                    value: certSafeContent,
                },
                {
                    privacyMode: 0, // no privacy: private key is encrypted
                    value: privKeySafeContent,
                },
            ],
        },
    })
    await authenticatedSafe.makeInternalValues(
        {
            safeContents: [
                // cert: password-based privacy
                getSafeContentEncryptionParams("RC2-40-CBC", password),
                // private key: inner key is encrypted
                {},
            ],
        },
        crypto,
    )

    const pkcs12 = new pkijs.PFX({
        parsedValue: {
            integrityMode: 0,
            authenticatedSafe,
        },
    })

    await pkcs12.makeInternalValues(
        {
            hmacHashAlgorithm: "SHA-1",
            iterations: 1,
            password,
            pbkdf2HashAlgorithm: "SHA-1",
        },
        crypto,
    )

    return pkcs12.toSchema().toBER(false)
}
