import { Inject, Injectable } from "@nestjs/common"
import { CertificateMetadata } from "@yonagi/common/types/pki/CertificateMetadata"
import { SerialNumberString } from "@yonagi/common/types/pki/SerialNumberString"
import {
    BaseEntity,
    Column,
    CreateDateColumn,
    DataSource,
    Entity,
    EntityManager,
    EntityTarget,
    FindOptionsWhere,
    IsNull,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    VersionColumn,
} from "typeorm"

import { AbstractCertificateStorage, GetCertificateResult } from ".."

class BaseCertificateEntity extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id!: string

    /* metadata */

    @Column({ type: "varchar", length: 32, unique: true })
    public serialNumber!: string

    @Column({ type: "datetime" })
    public notBefore!: Date

    @Column({ type: "datetime" })
    public notAfter!: Date

    @Column({ type: "text" })
    public commonName!: string

    @Column({ type: "text" })
    public organizationName!: string

    /* certificate */

    @Column({ type: "blob" })
    public certBer!: Buffer

    @Column({ type: "blob" })
    public privateKeyBer!: Buffer

    /* revocation */

    @Column({ nullable: true, type: "datetime" })
    public revokedAt!: Date | null

    /* typeorm meta */

    @CreateDateColumn()
    public createdAt!: Date

    @UpdateDateColumn()
    public updatedAt!: Date

    @VersionColumn()
    public rowVersion!: number

    static fromMetadataAndBer<T extends BaseCertificateEntity = BaseCertificateEntity>(
        metadata: CertificateMetadata,
        certBer: ArrayBuffer,
        privateKeyBer: ArrayBuffer,
        Entity: new () => T,
    ): T {
        const entity = new Entity()
        entity.serialNumber = metadata.serialNumber
        entity.notBefore = metadata.notBefore
        entity.notAfter = metadata.notAfter
        entity.commonName = metadata.subject.commonName
        entity.organizationName = metadata.subject.organizationName
        entity.certBer = Buffer.from(certBer)
        entity.privateKeyBer = Buffer.from(privateKeyBer)
        return entity
    }
}

@Entity({ name: "certificate_authority" })
export class CertificateAuthorityEntity extends BaseCertificateEntity {}

@Entity({ name: "server_certificate" })
export class ServerCertificateEntity extends BaseCertificateEntity {}

@Entity({ name: "client_certificate" })
export class ClientCertificateEntity extends BaseCertificateEntity {}

@Injectable()
export class SqliteCertificateStorage extends AbstractCertificateStorage {
    getCertificateAuthority(): Promise<GetCertificateResult | null> {
        return this._getSingletonCertificate(CertificateAuthorityEntity)
    }

    async setCertificateAuthority(
        metadata: CertificateMetadata,
        certBer: ArrayBuffer,
        privKeyPkcs8Ber: ArrayBuffer,
    ): Promise<void> {
        const entity = BaseCertificateEntity.fromMetadataAndBer(
            metadata,
            certBer,
            privKeyPkcs8Ber,
            CertificateAuthorityEntity,
        )
        await this.manager.transaction(async (manager) => {
            if (await manager.count(CertificateAuthorityEntity, { where: { revokedAt: IsNull() } })) {
                throw new Error("Certificate Authority already exists")
            }
            await manager.save(entity)
        })
    }

    async revokeCertificateAuthority(serialNumber: SerialNumberString): Promise<void> {
        return this._revokeBySerialNumber(serialNumber, CertificateAuthorityEntity)
    }

    getServerCertificate(): Promise<GetCertificateResult | null> {
        return this._getSingletonCertificate(ServerCertificateEntity)
    }

    async setServerCertificate(
        metadata: CertificateMetadata,
        certBer: ArrayBuffer,
        privKeyPkcs8Ber: ArrayBuffer,
    ): Promise<void> {
        const entity = BaseCertificateEntity.fromMetadataAndBer(
            metadata,
            certBer,
            privKeyPkcs8Ber,
            ServerCertificateEntity,
        )
        await this.manager.transaction(async (manager) => {
            if (await manager.count(ServerCertificateEntity, { where: { revokedAt: IsNull() } })) {
                throw new Error("Server certificate already exists")
            }
            await manager.save(entity)
        })
    }

    async revokeServerCertificate(serialNumber: SerialNumberString): Promise<void> {
        return this._revokeBySerialNumber(serialNumber, ServerCertificateEntity)
    }

    async allClientCertificates(): Promise<readonly GetCertificateResult[]> {
        const entities = await this.manager.findBy(ClientCertificateEntity, { revokedAt: IsNull() })
        return entities.map(
            (entity): GetCertificateResult => ({
                certBer: entity.certBer,
                privKeyPkcs8Ber: entity.privateKeyBer,
            }),
        )
    }

    async createClientCertificate(
        metadata: CertificateMetadata,
        certBer: ArrayBuffer,
        privKeyPkcs8Ber: ArrayBuffer,
    ): Promise<void> {
        const entity = BaseCertificateEntity.fromMetadataAndBer(
            metadata,
            certBer,
            privKeyPkcs8Ber,
            ClientCertificateEntity,
        )
        await this.manager.save(entity)
    }

    async getClientCertificateBySerialNumber(serialNumber: SerialNumberString): Promise<GetCertificateResult | null> {
        const entity = await this.manager.findOneBy(ClientCertificateEntity, { serialNumber })
        return entity ? { certBer: entity.certBer, privKeyPkcs8Ber: entity.privateKeyBer } : null
    }

    async isClientCertificateRevokedBySerialNumber(serialNumber: SerialNumberString): Promise<boolean | null> {
        const entity = await this.manager.findOne(ClientCertificateEntity, { where: { serialNumber } })
        return entity ? !!entity.revokedAt : null
    }

    async revokeClientCertificate(serialNumber: SerialNumberString): Promise<void> {
        await this._revokeBySerialNumber(serialNumber, ClientCertificateEntity)
    }

    private async _getSingletonCertificate<T extends BaseCertificateEntity = BaseCertificateEntity>(
        Entity: EntityTarget<T>,
    ): Promise<GetCertificateResult | null> {
        const where: FindOptionsWhere<EntityTarget<T>> = { revokedAt: IsNull() }
        const entity = await this.manager.findOneBy(Entity, where)
        return entity ? { certBer: entity.certBer, privKeyPkcs8Ber: entity.privateKeyBer } : null
    }

    private async _revokeBySerialNumber<T extends BaseCertificateEntity = BaseCertificateEntity>(
        serialNumber: SerialNumberString,
        Entity: EntityTarget<T>,
    ): Promise<void> {
        const where: FindOptionsWhere<EntityTarget<T>> = { serialNumber }
        await this.manager.transaction(async (manager) => {
            const entity = await manager.findOneBy(Entity, where)
            if (!entity) {
                throw new Error("Certificate with given serial number not found")
            }

            if (entity.revokedAt) {
                throw new Error("Certificate is already revoked")
            }

            entity.revokedAt = new Date()
            await manager.save(entity)
        })
    }

    private readonly manager: EntityManager

    constructor(@Inject(DataSource) { manager }: DataSource) {
        super()
        this.manager = manager
    }
}

export const entities = [CertificateAuthorityEntity, ServerCertificateEntity, ClientCertificateEntity]
