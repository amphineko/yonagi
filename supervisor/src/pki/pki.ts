import { Inject, Injectable, forwardRef } from "@nestjs/common"
import { RelativeDistinguishedNames } from "@yonagi/common/pki"
import * as pkijs from "pkijs"

import { exportPkiCertificateState, getCertificateSerialAsHexString, importPkiCertificateState } from "./exchange"
import { CreateCertificateIssuer, createCertificate } from "./issue"
import { PkiCertificateState, PkiState } from "./storage"

export class InvalidStateError extends Error {}

type Nullable<T> = T | null

type FieldRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

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
        const { cert, privKey: privateKey } = await createCertificate({
            crypto,
            isCa: true,
            selfSigned: true,
            subject,
            keyUsages: {
                cRLSign: true,
                digitalSignature: true,
                keyCertSign: true,
            },
            validityDays: validity,
        })
        return new CertificateAuthority(cert, privateKey)
    }

    static async fromPkiState(state: PkiCertificateState, crypto: pkijs.ICryptoEngine): Promise<CertificateAuthority> {
        const { cert, privKey } = await importPkiCertificateState(state, crypto)
        return new CertificateAuthority(cert, privKey)
    }
}

export class ServerCertificate extends Certificate {
    static async createAsync(
        subject: RelativeDistinguishedNames,
        issuer: CreateCertificateIssuer,
        validity: number,
        crypto: pkijs.ICryptoEngine,
    ): Promise<ServerCertificate> {
        const { cert, privKey: privateKey } = await createCertificate({
            crypto,
            extendedKeyUsages: {
                serverAuth: true,
                eapOverLan: true,
            },
            issuer,
            subject,
            keyUsages: {
                digitalSignature: true,
                contentCommitment: true,
                keyEncipherment: true,
            },
            validityDays: validity,
        })
        return new ServerCertificate(cert, privateKey)
    }

    static async fromPkiState(state: PkiCertificateState, crypto: pkijs.ICryptoEngine): Promise<ServerCertificate> {
        const { cert, privKey } = await importPkiCertificateState(state, crypto)
        return new ServerCertificate(cert, privKey)
    }
}

export class ClientCertificate extends Certificate {
    static async createAsync(
        subject: RelativeDistinguishedNames,
        issuer: CreateCertificateIssuer,
        validity: number,
        crypto: pkijs.ICryptoEngine,
    ): Promise<ClientCertificate> {
        const { cert, privKey: privateKey } = await createCertificate({
            crypto,
            extendedKeyUsages: {
                clientAuth: true,
            },
            issuer,
            subject,
            keyUsages: {
                digitalSignature: true,
                contentCommitment: true,
                keyEncipherment: true,
            },
            validityDays: validity,
        })
        return new ClientCertificate(cert, privateKey)
    }

    static async fromPkiState(state: PkiCertificateState, crypto: pkijs.ICryptoEngine): Promise<ClientCertificate> {
        const { cert, privKey } = await importPkiCertificateState(state, crypto)
        return new ClientCertificate(cert, privKey)
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

    async getRequiredCertificateAuthority<
        RequirePrivKey extends boolean,
        R = RequirePrivKey extends true ? FieldRequired<CertificateAuthority, "privKey"> : CertificateAuthority,
    >(privKey?: RequirePrivKey): Promise<R> {
        const ca = await this.getCertificateAuthority()
        if (!ca) {
            throw new InvalidStateError("CA not found")
        }
        if (privKey && !ca.privKey) {
            throw new InvalidStateError("CA private key not found")
        }
        return ca as R
    }

    async deleteCertificateAuthority(): Promise<void> {
        await this.pkiState.setCertificateAuthority(undefined)
    }

    async createServerCertificate(subject: RelativeDistinguishedNames, validity: number): Promise<ServerCertificate> {
        const server = await this.getServerCertificate()
        if (server) {
            throw new InvalidStateError("Server certificate already exists")
        }

        const ca = await this.getRequiredCertificateAuthority(true)
        const cert = await ServerCertificate.createAsync(
            subject,
            { cert: ca.cert, privKey: ca.privKey },
            validity,
            this.crypto,
        )
        await this.pkiState.setServerCertificate(await cert.export(this.crypto))
        return cert
    }

    async getServerCertificate(): Promise<Nullable<ServerCertificate>> {
        const state = await this.pkiState.getServerCertificate()
        return state ? await ServerCertificate.fromPkiState(state, this.crypto) : null
    }

    async deleteServerCertificate(): Promise<void> {
        await this.pkiState.setServerCertificate(undefined)
    }

    async createClientCertificate(subject: RelativeDistinguishedNames, validity: number): Promise<ClientCertificate> {
        const ca = await this.getRequiredCertificateAuthority(true)
        const cert = await ClientCertificate.createAsync(
            subject,
            { cert: ca.cert, privKey: ca.privKey },
            validity,
            this.crypto,
        )
        await this.pkiState.setClientCertificate(
            getCertificateSerialAsHexString(cert.cert),
            await cert.export(this.crypto),
        )
        return cert
    }

    async getClientCertificate(serial: string): Promise<Nullable<ClientCertificate>> {
        const state = await this.pkiState.getClientCertificate(serial)
        return state ? await ClientCertificate.fromPkiState(state, this.crypto) : null
    }

    async listClientCertificates(): Promise<ClientCertificate[]> {
        const states = (await this.pkiState.allClientCertificates()).values()
        return await Promise.all(
            Array.from(states).map(async (state) => await ClientCertificate.fromPkiState(state, this.crypto)),
        )
    }

    async deleteClientCertificate(serial: string): Promise<void> {
        await this.pkiState.setClientCertificate(serial, undefined)
    }
}
