import { Inject, Injectable, forwardRef } from "@nestjs/common"
import { RelativeDistinguishedNames } from "@yonagi/common/pki"
import * as asn1js from "asn1js"
import * as pkijs from "pkijs"

import { PkiCertificateState, PkiState } from "./storage"
import {
    SUITE_B_192_HASH_ALG,
    createBasicConstraintsExt,
    createKeyUsageExt,
    createPkijsRdn,
    createSuiteBKeyPair,
    exportPkiCertificateState,
    importPkiCertificateState,
} from "./utils"

export class InvalidStateError extends Error {}

type Nullable<T> = T | null

export abstract class Certificate {
    constructor(
        public readonly cert: pkijs.Certificate,
        public readonly privKey?: CryptoKey,
    ) {}

    async export(crypto: pkijs.ICryptoEngine): Promise<PkiCertificateState> {
        return await exportPkiCertificateState(crypto, this.cert, this.privKey)
    }
}

export class CertificateAuthority extends Certificate {
    /**
     * @param validity in days
     */
    static async createAsync(
        subject: RelativeDistinguishedNames,
        validity: number,
        crypto: pkijs.ICryptoEngine,
    ): Promise<CertificateAuthority> {
        const cert = new pkijs.Certificate()
        cert.version = 0x02

        const serialNumber = crypto.getRandomValues(new Uint8Array(16))
        cert.serialNumber = new asn1js.Integer({ valueHex: serialNumber })

        const self = createPkijsRdn(subject)
        cert.subject = self
        cert.issuer = self

        const now = new Date()
        cert.notAfter.value = new Date(now.getTime() + validity * 24 * 60 * 60 * 1000)
        cert.notBefore.value = now

        cert.extensions = [
            createBasicConstraintsExt({ cA: true }),
            createKeyUsageExt({ cRLSign: true, digitalSignature: true, keyCertSign: true }),
        ]

        const { privateKey, publicKey } = await createSuiteBKeyPair(crypto)
        await cert.subjectPublicKeyInfo.importKey(publicKey, crypto)
        await cert.sign(privateKey, SUITE_B_192_HASH_ALG, crypto)

        return new CertificateAuthority(cert, privateKey)
    }

    static async fromPkiState(state: PkiCertificateState, crypto: pkijs.ICryptoEngine): Promise<CertificateAuthority> {
        const { cert, privKey } = await importPkiCertificateState(state, crypto)
        return new CertificateAuthority(cert, privKey)
    }
}

@Injectable()
export class Pki {
    constructor(
        @Inject(forwardRef(() => pkijs.CryptoEngine)) private crypto: pkijs.ICryptoEngine,
        @Inject(forwardRef(() => PkiState)) private pkiState: PkiState,
    ) {}

    async createCertificateAuthority(
        subject: RelativeDistinguishedNames,
        validity: number,
    ): Promise<CertificateAuthority> {
        if (await this.pkiState.getCertificateAuthority()) {
            throw new InvalidStateError("CA already exists")
        }

        const ca = await CertificateAuthority.createAsync(subject, validity, this.crypto)
        await this.pkiState.setCertificateAuthority(await ca.export(this.crypto))
        return ca
    }

    async getCertificateAuthority(): Promise<Nullable<CertificateAuthority>> {
        const state = await this.pkiState.getCertificateAuthority()
        return state ? await CertificateAuthority.fromPkiState(state, this.crypto) : null
    }

    async deleteCertificateAuthority(): Promise<void> {
        await this.pkiState.setCertificateAuthority(undefined)
    }
}
