import { Client } from "@yonagi/common/types/Client"
import { Name } from "@yonagi/common/types/Name"
import { CallingStationId } from "@yonagi/common/types/mpsks/CallingStationId"
import { CallingStationIdAuthentication } from "@yonagi/common/types/mpsks/MPSK"
import { CertificateMetadata } from "@yonagi/common/types/pki/CertificateMetadata"
import { SerialNumberString } from "@yonagi/common/types/pki/SerialNumberString"
import { RadiusUser, RadiusUserPasswordStatus, RadiusUserPasswords } from "@yonagi/common/types/users/RadiusUser"
import { Username } from "@yonagi/common/types/users/Username"

export abstract class AbstractClientStorage {
    abstract all(): Promise<readonly Client[]>

    abstract bulkCreateOrUpdate(values: readonly Client[]): Promise<void>

    abstract createOrUpdateByName(name: Name, value: Client): Promise<void>

    abstract deleteByName(name: Name): Promise<boolean>

    abstract getByName(name: Name): Promise<Client | null>
}

export abstract class AbstractMPSKStorage {
    abstract all(): Promise<readonly CallingStationIdAuthentication[]>

    abstract bulkCreateOrUpdate(values: readonly CallingStationIdAuthentication[]): Promise<void>

    abstract createOrUpdateByName(name: Name, value: CallingStationIdAuthentication): Promise<void>

    abstract deleteByName(name: Name): Promise<boolean>

    abstract getByCallingStationId(callingStationId: CallingStationId): Promise<CallingStationIdAuthentication | null>

    abstract getByName(name: Name): Promise<CallingStationIdAuthentication | null>
}

export interface GetCertificateResult {
    readonly certBer: ArrayBuffer
    readonly privKeyPkcs8Ber: ArrayBuffer
}

export abstract class AbstractCertificateStorage {
    /* singleton certificate authority */

    abstract getCertificateAuthority(): Promise<GetCertificateResult | null>
    abstract setCertificateAuthority(
        metadata: CertificateMetadata,
        certBer: ArrayBuffer,
        privKeyPkcs8Ber: ArrayBuffer,
    ): Promise<void>
    abstract revokeCertificateAuthority(serialNumber: SerialNumberString): Promise<void>

    /* singleton server certificate */

    abstract getServerCertificate(): Promise<GetCertificateResult | null>
    abstract setServerCertificate(
        metadata: CertificateMetadata,
        certBer: ArrayBuffer,
        privKeyPkcs8Ber: ArrayBuffer,
    ): Promise<void>
    abstract revokeServerCertificate(serialNumber: SerialNumberString): Promise<void>

    /* client certificates */

    abstract allClientCertificates(): Promise<readonly GetCertificateResult[]>
    abstract createClientCertificate(
        metadata: CertificateMetadata,
        certBer: ArrayBuffer,
        privKeyPkcs8Ber: ArrayBuffer,
    ): Promise<void>
    abstract getClientCertificateBySerialNumber(serialNumber: SerialNumberString): Promise<GetCertificateResult | null>
    abstract isClientCertificateRevokedBySerialNumber(serialNumber: SerialNumberString): Promise<boolean | null>
    abstract revokeClientCertificate(serialNumber: SerialNumberString): Promise<void>
}

export abstract class AbstractRadiusUserStorage {
    abstract all(): Promise<readonly RadiusUser[]>

    abstract createOrUpdate(username: Username, record: Partial<RadiusUser>): Promise<void>

    abstract deleteByUsername(username: Username): Promise<boolean>
}

export abstract class AbstractRadiusUserPasswordStorage {
    abstract allStatus(): Promise<readonly RadiusUserPasswordStatus[]>

    abstract createOrUpdate(username: Username, record: Partial<RadiusUserPasswords>): Promise<void>

    abstract deleteByUsername(username: Username): Promise<boolean>

    abstract getByUsername(username: Username): Promise<RadiusUserPasswords | null>
}
