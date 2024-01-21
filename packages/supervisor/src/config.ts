import { Injectable, Module } from "@nestjs/common"
import { PkiMode } from "@yonagi/common/types/PKI"

@Injectable()
export class Config {
    public readonly dataDirPath: string

    public readonly logRetention: number = 1000

    public readonly outputDirPath: string

    public readonly raddbDirPath: string

    public readonly typeormEnableSynchronize: boolean

    constructor() {
        this.dataDirPath = process.env.SUPERVISOR_DATA_DIR ?? "/data"
        this.outputDirPath = process.env.SUPERVISOR_OUTPUT_DIR ?? "/var/run"
        this.raddbDirPath = process.env.SUPERVISOR_RADDB_DIR ?? "/etc/freeradius/3.0"
        this.typeormEnableSynchronize = process.env.SUPERVISOR_TYPEORM_SYNC?.toLowerCase() === "true"
    }

    public get authorizedMpsksFilePath(): string {
        return `${this.dataDirPath}/authorized_mpsks.json`
    }

    public get clientsFilePath(): string {
        return `${this.dataDirPath}/clients.json`
    }

    public get sqliteFilePath(): string {
        return `${this.dataDirPath}/states.sqlite3`
    }

    public get pkiPath(): string {
        return `${this.dataDirPath}/pki`
    }

    public get pkiStatePath(): string {
        return `${this.pkiPath}/state.json`
    }

    public get radiusdPath(): string {
        return process.env.SUPERVISOR_RADIUSD ?? "/usr/sbin/radiusd"
    }

    public get pkiOutputPath(): { ca: { cert: string }; server: { cert: string; privKey: string } } {
        return {
            ca: {
                cert: `${this.outputDirPath}/ca.pem`,
            },
            server: {
                cert: `${this.outputDirPath}/server.pem`,
                privKey: `${this.outputDirPath}/server.key`,
            },
        }
    }

    public get pkiMode(): PkiMode {
        // TODO: make configurable from UI or env
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
