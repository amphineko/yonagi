import { Injectable, Module } from "@nestjs/common"
import { PkiMode } from "@yonagi/common/pki"

@Injectable()
export class Config {
    public readonly dataDirPath: string

    public readonly logRetention: number = 1000

    public readonly outputDirPath: string

    constructor() {
        this.dataDirPath = process.env.SUPERVISOR_DATA_DIR ?? "/data"
        this.outputDirPath = process.env.SUPERVISOR_OUTPUT_DIR ?? "/var/run"
    }

    public get clientsFilePath(): string {
        return `${this.dataDirPath}/clients.json`
    }

    public get pkiPath(): string {
        return `${this.dataDirPath}/pki`
    }

    public get pkiStatePath(): string {
        return `${this.pkiPath}/state.json`
    }

    public get clientsOutputPath(): string {
        return `${this.outputDirPath}/clients.conf`
    }

    public get authorizedMpsksFilePath(): string {
        return `${this.dataDirPath}/authorized_mpsks.json`
    }

    public get authorizedMpsksOutputPath(): string {
        return `${this.outputDirPath}/authorized_mpsks`
    }

    public get radiusdPath(): string {
        return process.env.SUPERVISOR_RADIUSD ?? "/usr/sbin/radiusd"
    }

    public get pkiMode(): PkiMode {
        return {
            certHashAlg: "SHA-256",
            key: {
                name: "ECDSA",
                namedCurve: "P-384",
            } as EcKeyGenParams,
        }
    }
}

@Module({ exports: [Config], providers: [Config] })
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ConfigModule {}
