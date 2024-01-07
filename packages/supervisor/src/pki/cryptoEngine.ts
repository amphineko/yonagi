import * as nodeCrypto from "node:crypto"

import { Injectable } from "@nestjs/common"
import { Crypto } from "@peculiar/webcrypto"
import * as asn1js from "asn1js"
import * as pkijs from "pkijs"

import { pkcs12DeriveSha1Key } from "./crypto"

const OID_pbeWithSHAAnd3_KeyTripleDES_CBC = "1.2.840.113549.1.12.1.3"
const OID_pbeWithSHAAnd40BitRC2_CBC = "1.2.840.113549.1.12.1.6"

export function encryptWithPbeSha1(
    message: Buffer,
    password: string,
    salt: Buffer,
    keyIterations: number,
    cipherName: string,
): Buffer {
    let cipherKeySize: number, cipherIvSize: number
    if (cipherName === "rc2-40-cbc") {
        cipherKeySize = 5
        cipherIvSize = 8
    } else if (cipherName === "des-ede3-cbc") {
        cipherKeySize = 24
        cipherIvSize = 8
    } else {
        throw new Error(`Unsupported cipher ${cipherName}`)
    }

    const derivedKey = pkcs12DeriveSha1Key(password, salt, 1 /* key */, cipherKeySize, keyIterations)
    const iv = pkcs12DeriveSha1Key(password, salt, 2 /* IV */, cipherIvSize, keyIterations)

    const cipher = nodeCrypto.createCipheriv(cipherName, derivedKey, iv)
    const encrypted = Buffer.concat([cipher.update(message), cipher.final()])
    return encrypted
}

export function pkcs7Pad(message: Buffer, blockSize: number): Buffer {
    const size = blockSize - (message.length % blockSize)
    return Buffer.concat([message, Buffer.alloc(size, size)])
}

/**
 * A shim for pkijs.CryptoEngine that implements the legacy pbeWithSHA1And3-KeyTripleDES-CBC.
 */
@Injectable()
export class CryptoEngineShim extends pkijs.CryptoEngine {
    constructor() {
        super({
            crypto: new Crypto(),
            name: "shimCryptoEngine",
            subtle: new Crypto().subtle,
        })
    }

    public override getOIDByAlgorithm(algorithm: Algorithm, safety?: boolean, target?: string): string {
        switch (algorithm.name.toUpperCase()) {
            case "RC2-40-CBC":
                return "1.2.840.113549.3.2"
            case "DES-EDE3-CBC":
                return "1.2.840.113549.3.7"
            default:
                return super.getOIDByAlgorithm(algorithm, safety, target)
        }
    }

    private getOIDByPBEEncryptionAlgorithm(algorithm: string): string {
        switch (algorithm.toUpperCase()) {
            case "RC2-40-CBC":
                return OID_pbeWithSHAAnd40BitRC2_CBC
            case "DES-EDE3-CBC":
                return OID_pbeWithSHAAnd3_KeyTripleDES_CBC
            default:
                return ""
        }
    }

    private encryptEncryptedContentInfoWithPbe1(
        parameters: pkijs.CryptoEngineEncryptParams,
    ): pkijs.EncryptedContentInfo {
        const contentToEncrypt = pkcs7Pad(Buffer.from(parameters.contentToEncrypt), 8)
        const {
            contentEncryptionAlgorithm: { name: algorithm },
            contentType,
            iterationCount,
            password,
        } = parameters

        const salt = this.getRandomValues(new Uint8Array(8))

        const encryptedContent = encryptWithPbeSha1(
            contentToEncrypt,
            Buffer.from(password).toString("utf8"),
            Buffer.from(salt),
            iterationCount,
            algorithm.toLowerCase(),
        )

        return new pkijs.EncryptedContentInfo({
            contentType,
            contentEncryptionAlgorithm: new pkijs.AlgorithmIdentifier({
                schema: new asn1js.Sequence({
                    value: [
                        new asn1js.ObjectIdentifier({ value: this.getOIDByPBEEncryptionAlgorithm(algorithm) }),
                        new asn1js.Sequence({
                            value: [
                                new asn1js.OctetString({
                                    valueHex: salt.buffer,
                                }),
                                new asn1js.Integer({
                                    value: iterationCount,
                                }),
                            ],
                        }),
                    ],
                }),
            }),
            encryptedContent: new asn1js.OctetString({
                valueHex: encryptedContent,
            }),
        })
    }

    public override async encryptEncryptedContentInfo(
        parameters: pkijs.CryptoEngineEncryptParams & { pbeScheme?: string },
    ): Promise<pkijs.EncryptedContentInfo> {
        const { hmacHashAlgorithm, pbeScheme } = parameters
        if (pbeScheme?.toLowerCase() === "pbes1" && hmacHashAlgorithm === "") {
            return this.encryptEncryptedContentInfoWithPbe1(parameters)
        }

        return super.encryptEncryptedContentInfo(parameters)
    }
}
