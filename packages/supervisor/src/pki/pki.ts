import { writeFile } from "node:fs/promises"
import { basename } from "node:path"

import { Inject, Injectable, forwardRef } from "@nestjs/common"
import { RelativeDistinguishedNames } from "@yonagi/common/types/pki/RelativeDistinguishedNames"
import { pino } from "pino"
import * as pkijs from "pkijs"

import { CryptoEngineShim } from "./cryptoEngine"
import {
    exportCertificatePem,
    exportClientCertificateP12,
    exportPkiCertificateState,
    exportPrivateKeyPem,
    getCertificateSerialAsHexString,
    importPkiCertificateState,
} from "./exchange"
import { CreateCertificateIssuer, createCertificate } from "./issue"
import { PkiCertificateState, PkiState } from "./storage"
import { Config } from "../config"

const logger = pino({ name: `${basename(__dirname)}/${basename(__filename)}` })

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
        keyParams: EcKeyGenParams | RsaHashedKeyGenParams,
        hashAlg: string,
        crypto: pkijs.ICryptoEngine,
    ): Promise<CertificateAuthority> {
        const { cert, privKey: privateKey } = await createCertificate({
            crypto,
            hashAlg,
            isCa: true,
            keyParams,
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
        keyParams: EcKeyGenParams | RsaHashedKeyGenParams,
        hashAlg: string,
        crypto: pkijs.ICryptoEngine,
    ): Promise<ServerCertificate> {
        const { cert, privKey: privateKey } = await createCertificate({
            crypto,
            extendedKeyUsages: {
                serverAuth: true,
                eapOverLan: true,
            },
            hashAlg,
            issuer,
            keyParams,
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
        keyParams: EcKeyGenParams | RsaHashedKeyGenParams,
        hashAlg: string,
        crypto: pkijs.ICryptoEngine,
    ): Promise<ClientCertificate> {
        const { cert, privKey: privateKey } = await createCertificate({
            crypto,
            extendedKeyUsages: {
                clientAuth: true,
            },
            hashAlg,
            issuer,
            keyParams,
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
    private certHashAlg: string

    private keyParams: EcKeyGenParams | RsaHashedKeyGenParams

    private deployPaths: {
        ca: { cert: string }
        server: { cert: string; privKey: string }
    }

    constructor(
        @Inject(forwardRef(() => Config)) config: Config,
        @Inject(forwardRef(() => CryptoEngineShim)) private crypto: pkijs.ICryptoEngine,
        @Inject(forwardRef(() => PkiState)) private pkiState: PkiState,
    ) {
        this.certHashAlg = config.pkiMode.certHashAlg
        this.keyParams = config.pkiMode.key
        this.deployPaths = config.pkiOutputPath
    }

    async createCertificateAuthority(
        subject: RelativeDistinguishedNames,
        validity: number,
    ): Promise<CertificateAuthority> {
        if (await this.pkiState.getCertificateAuthority()) {
            throw new InvalidStateError("CA already exists")
        }

        const ca = await CertificateAuthority.createAsync(
            subject,
            validity,
            this.keyParams,
            this.certHashAlg,
            this.crypto,
        )
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
            this.keyParams,
            this.certHashAlg,
            this.crypto,
        )
        await this.pkiState.setServerCertificate(await cert.export(this.crypto))
        return cert
    }

    async getServerCertificate(): Promise<Nullable<ServerCertificate>> {
        const state = await this.pkiState.getServerCertificate()
        return state ? await ServerCertificate.fromPkiState(state, this.crypto) : null
    }

    async getRequiredServerCertificate<
        RequirePrivKey extends boolean,
        R = RequirePrivKey extends true ? FieldRequired<ServerCertificate, "privKey"> : ServerCertificate,
    >(privKey?: RequirePrivKey): Promise<R> {
        const server = await this.getServerCertificate()
        if (!server) {
            throw new InvalidStateError("Server certificate not found")
        }
        if (privKey && !server.privKey) {
            throw new InvalidStateError("Server private key not found")
        }
        return server as R
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
            this.keyParams,
            this.certHashAlg,
            this.crypto,
        )
        await this.pkiState.setClientCertificate(
            getCertificateSerialAsHexString(cert.cert),
            await cert.export(this.crypto),
        )
        return cert
    }

    async exportClientCertificateP12(serial: string, p12Password: string): Promise<ArrayBuffer> {
        const client = await this.getClientCertificate(serial)
        if (!client?.privKey) {
            throw new InvalidStateError("Client certificate and/or private key not found")
        }

        const ca = await this.getRequiredCertificateAuthority(false)
        const server = await this.getRequiredServerCertificate(false)
        return await exportClientCertificateP12(
            client.cert,
            client.privKey,
            [ca.cert, server.cert],
            p12Password,
            this.crypto,
        )
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

    async deployToRadiusd(): Promise<boolean> {
        const ca = await this.getCertificateAuthority()
        if (!ca) {
            logger.warn("Cannot deploy PKI to radiusd: CA not found")
            return false
        }

        const server = await this.getServerCertificate()
        if (!server) {
            logger.warn("Cannot deploy PKI to radiusd: Server certificate not found")
            return false
        }
        if (!server.privKey) {
            throw new InvalidStateError("Unexpected missing private key for server certificate")
        }

        await Promise.all([
            writeFile(this.deployPaths.ca.cert, exportCertificatePem(ca.cert)),
            writeFile(this.deployPaths.server.cert, exportCertificatePem(server.cert)),
            exportPrivateKeyPem(server.privKey, this.crypto).then((pem) =>
                writeFile(this.deployPaths.server.privKey, pem),
            ),
        ])

        return true
    }
}
