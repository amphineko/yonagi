import { Injectable } from "@nestjs/common"
import {} from "@nestjs/config"

@Injectable()
export class Config {
    public readonly dataDirPath: string

    public readonly logRetention: number = 1000

    public readonly outputDirPath: string

    constructor() {
        this.dataDirPath = process.env["SUPERVISOR_DATA_DIR"] || "/data"
        this.outputDirPath = process.env["SUPERVISOR_OUTPUT_DIR"] || "/var/run"
    }

    public get clientsFilePath(): string {
        return `${this.dataDirPath}/clients.json`
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
}
