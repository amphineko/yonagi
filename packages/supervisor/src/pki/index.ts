import { Inject } from "@nestjs/common"
import { CertificateMetadata } from "@yonagi/common/types/pki/CertificateMetadata"
import { RelativeDistinguishedNames } from "@yonagi/common/types/pki/RelativeDistinguishedNames"
import { SerialNumberString } from "@yonagi/common/types/pki/SerialNumberString"

import { Nullable } from "../common/types"
import { AbstractCertificateStorage } from "../storages"

export interface Certificate {
    readonly metadata: CertificateMetadata

    readonly privateKey?: CryptoKey

    exportAsPkcs12(password: string, addCerts?: readonly Certificate[]): Promise<ArrayBuffer>

    exportCertificateAsBer(): Promise<ArrayBuffer>
    exportCertificateAsPem(): Promise<string>

    exportPrivateKeyPkcs8AsBer(): Promise<ArrayBuffer | undefined>
    exportPrivateKeyPkcs8AsPem(): Promise<string | undefined>
}

export interface KeyUsages {
    digitalSignature?: boolean // KeyUsage (0)
    contentCommitment?: boolean // KeyUsage (1)
    keyEncipherment?: boolean // KeyUsage (2)
    keyCertSign?: boolean // KeyUsage (5)
    cRLSign?: boolean // KeyUsage (6)
}

export interface ExtendedKeyUsages {
    serverAuth?: boolean // OID_ServerAuth
    clientAuth?: boolean // OID_ClientAuth
    eapOverLan?: boolean // OID_KP_EapOverLan
}

export interface CreateCertificateProps {
    readonly subject: RelativeDistinguishedNames
    readonly privateKeyParams: EcKeyGenParams | RsaHashedKeyGenParams

    readonly keyUsages: KeyUsages
    readonly extendedKeyUsages?: ExtendedKeyUsages

    readonly notBefore: Date
    readonly notAfter: Date

    readonly issuer: Nullable<Certificate>

    readonly hashingAlgorithm: "SHA-256"
}

export abstract class CertificateFactory {
    abstract createCertificate(props: CreateCertificateProps): Promise<Certificate>

    abstract importCertificateFromPem(certBer: ArrayBuffer, privKeyPkcs8Pem?: ArrayBuffer): Promise<Certificate>
}

type KeyGenParams = EcKeyGenParams | RsaHashedKeyGenParams

abstract class AbstractCertificateState {
    /**
     * Reusable method to create a certificate for CA/server/clients
     */
    protected async createCertificate(
        subject: RelativeDistinguishedNames,
        validity: number,
        privateKeyParams: KeyGenParams,
        issuer: Certificate | null,
        keyUsages: KeyUsages,
        extendedKeyUsages?: ExtendedKeyUsages,
    ): Promise<{
        certBer: ArrayBuffer
        certificate: Certificate
        metadata: CertificateMetadata
        privateKeyBer: ArrayBuffer
    }> {
        const now = new Date()
        const cert = await this.factory.createCertificate({
            subject,
            privateKeyParams,
            keyUsages,
            extendedKeyUsages,
            notAfter: new Date(now.getTime() + validity * 24 * 60 * 60 * 1000),
            notBefore: now,
            issuer,
            hashingAlgorithm: "SHA-256",
        })

        const certBer = await cert.exportCertificateAsBer()
        const privateKeyBer = await cert.exportPrivateKeyPkcs8AsBer()
        if (!privateKeyBer) {
            throw new Error("Unexpected missing private key from newly created certificate")
        }

        return {
            certBer,
            certificate: cert,
            metadata: cert.metadata,
            privateKeyBer,
        }
    }

    constructor(@Inject(CertificateFactory) protected readonly factory: CertificateFactory) {}
}

export class CertificateAuthorityState extends AbstractCertificateState {
    async create(
        subject: RelativeDistinguishedNames,
        validity: number,
        privateKeyParams: KeyGenParams,
    ): Promise<Certificate> {
        if (await this.storage.getCertificateAuthority()) {
            throw new Error("Certificate Authority already exists")
        }

        const keyUsages: KeyUsages = {
            cRLSign: true,
            digitalSignature: true,
            keyCertSign: true,
        }
        const { certBer, certificate, metadata, privateKeyBer } = await super.createCertificate(
            subject,
            validity,
            privateKeyParams,
            null,
            keyUsages,
        )
        await this.storage.setCertificateAuthority(metadata, certBer, privateKeyBer)

        return certificate
    }

    async get(): Promise<Certificate | null> {
        const ca = await this.storage.getCertificateAuthority()
        return ca ? await this.factory.importCertificateFromPem(ca.certBer, ca.privKeyPkcs8Ber) : null
    }

    async revoke(serialNumber: SerialNumberString): Promise<void> {
        await this.storage.revokeCertificateAuthority(serialNumber)
    }

    constructor(
        @Inject(CertificateFactory) factory: CertificateFactory,
        @Inject(AbstractCertificateStorage) private readonly storage: AbstractCertificateStorage,
    ) {
        super(factory)
    }
}

export class ServerCertificateState extends AbstractCertificateState {
    async create(
        subject: RelativeDistinguishedNames,
        validity: number,
        privateKeyParams: KeyGenParams,
    ): Promise<Certificate> {
        if (await this.storage.getServerCertificate()) {
            throw new Error("Server certificate already exists")
        }

        const ca = await this.ca.get()
        if (!ca) {
            throw new Error("Certificate Authority is not found")
        }

        const keyUsages: KeyUsages = {
            contentCommitment: true,
            digitalSignature: true,
            keyEncipherment: true,
        }
        const extendedKeyUsages: ExtendedKeyUsages = {
            eapOverLan: true,
            serverAuth: true,
        }
        const { certBer, certificate, metadata, privateKeyBer } = await super.createCertificate(
            subject,
            validity,
            privateKeyParams,
            ca,
            keyUsages,
            extendedKeyUsages,
        )
        await this.storage.setServerCertificate(metadata, certBer, privateKeyBer)

        return certificate
    }

    async get(): Promise<Certificate | null> {
        const server = await this.storage.getServerCertificate()
        return server ? await this.factory.importCertificateFromPem(server.certBer, server.privKeyPkcs8Ber) : null
    }

    async revoke(serialNumber: SerialNumberString): Promise<void> {
        await this.storage.revokeServerCertificate(serialNumber)
    }

    constructor(
        @Inject(CertificateAuthorityState) private readonly ca: CertificateAuthorityState,
        @Inject(CertificateFactory) factory: CertificateFactory,
        @Inject(AbstractCertificateStorage) private readonly storage: AbstractCertificateStorage,
    ) {
        super(factory)
    }
}

export class ClientCertificateState extends AbstractCertificateState {
    async create(
        subject: RelativeDistinguishedNames,
        validity: number,
        privateKeyParams: KeyGenParams,
    ): Promise<Certificate> {
        const ca = await this.ca.get()
        if (!ca) {
            throw new Error("Certificate Authority is not found")
        }

        const keyUsages: KeyUsages = {
            digitalSignature: true,
            keyEncipherment: true,
        }
        const extendedKeyUsages: ExtendedKeyUsages = {
            clientAuth: true,
        }
        const { certBer, certificate, metadata, privateKeyBer } = await super.createCertificate(
            subject,
            validity,
            privateKeyParams,
            ca,
            keyUsages,
            extendedKeyUsages,
        )
        await this.storage.createClientCertificate(metadata, certBer, privateKeyBer)

        return certificate
    }

    async all(): Promise<readonly Certificate[]> {
        const clients = await this.storage.allClientCertificates()
        return await Promise.all(
            clients.map(async (c) => await this.factory.importCertificateFromPem(c.certBer, c.privKeyPkcs8Ber)),
        )
    }

    async getBySerial(serial: SerialNumberString): Promise<Certificate | null> {
        const cert = await this.storage.getClientCertificateBySerialNumber(serial)
        return cert ? await this.factory.importCertificateFromPem(cert.certBer, cert.privKeyPkcs8Ber) : null
    }

    async revokeBySerial(serial: SerialNumberString): Promise<void> {
        await this.storage.revokeClientCertificate(serial)
    }

    constructor(
        @Inject(CertificateAuthorityState) private readonly ca: CertificateAuthorityState,
        @Inject(CertificateFactory) factory: CertificateFactory,
        @Inject(AbstractCertificateStorage) private readonly storage: AbstractCertificateStorage,
    ) {
        super(factory)
    }
}
