import * as child_process from "child_process"
import { spawn } from "child_process"
import { basename } from "path"

import { Inject, Injectable, forwardRef } from "@nestjs/common"
import pino from "pino"

import { ClientStorage, MPSKStorage } from "./storages"
import { Config } from "../config"
import { generateAuthorizedMpsksFile } from "../configs/authorizedMpsks"
import { generateClientsFile } from "../configs/clients"

const logger = pino({ name: `${basename(__dirname)}/${basename(__filename)}` })

class CircularBuffer {
    private _buffer: string[] = []

    constructor(private size: number) {}

    append(lines: string[]): void {
        this._buffer.push(...lines)
        while (this._buffer.length > this.size) {
            this._buffer.shift()
        }
    }

    get(): string[] {
        return this._buffer
    }
}

@Injectable()
export class Radiusd {
    constructor(
        @Inject(forwardRef(() => ClientStorage)) private clientStorage: ClientStorage,
        @Inject(forwardRef(() => MPSKStorage)) private mpskStorage: MPSKStorage,
        @Inject(forwardRef(() => Config)) private config: Config,
    ) {
        this._buffer = new CircularBuffer(config.logRetention)
    }

    public get log(): string[] {
        return this._buffer.get()
    }

    public get uptime(): number {
        return Date.now() - this.since
    }

    private readonly _buffer: CircularBuffer
    private process: child_process.ChildProcess | null = null
    private since = 0

    async _regenerateFiles(): Promise<void> {
        const clients = await this.clientStorage.all()
        const mpsks = await this.mpskStorage.all()
        await Promise.all([
            generateAuthorizedMpsksFile(mpsks, this.config.authorizedMpsksOutputPath),
            generateClientsFile(clients, this.config.clientsOutputPath),
        ])
    }

    async start(): Promise<void> {
        if (this.process) {
            throw new Error("Radiusd already started")
        }

        await this._regenerateFiles()

        const child = spawn(this.config.radiusdPath, ["-f", "-l", "stdout"], {
            shell: false,
            stdio: [null, "pipe", "pipe"],
        })

        this.process = child
        this.since = Date.now()

        await new Promise<void>((resolve, reject) => {
            child.on("exit", (code) => {
                reject(new Error(`Radiusd exited unexpectedly: ${code}`))
            })
            child.on("error", (error: Error | string) => {
                reject(new Error(`Cannot spawn radiusd: ${error.toString()}`))
            })
            child.on("spawn", () => {
                logger.info(`Radiusd spawned (pid: ${child.pid})`)
                resolve()
            })
        })

        child.stderr.on("data", (data: Buffer | string) => {
            const lines = data.toString().split("\n")
            this._buffer.append(lines)
            process.stderr.write(data)
        })

        child.stdout.on("data", (data: Buffer | string) => {
            const lines = data.toString().split("\n")

            if (lines[lines.length - 1].trim() === "") {
                // strip last empty line
                lines.pop()
            }

            this._buffer.append(lines)
            process.stdout.write(data)
        })
    }

    async stop(): Promise<number> {
        if (!this.process) {
            throw new Error("Radiusd not started yet")
        }

        const process = this.process
        this.process = null

        return new Promise<number>((resolve) => {
            logger.info(`Stopping radiusd (pid: ${process.pid})`)

            process.on("exit", (code) => {
                resolve(code ?? 0)
            })
            process.kill()

            if (process.exitCode !== null) {
                resolve(process.exitCode)
            }
        }).then((code) => {
            logger.info(`Radiusd stopped (pid: ${process.pid}), exit code: ${code}`)
            return code
        })
    }

    async reload(): Promise<void> {
        if (!this.process || this.process.exitCode !== null) {
            await this.start()
            return
        }

        await this._regenerateFiles()
        this.process.kill("SIGHUP")
    }

    getLastLogLines(): string[] {
        return this._buffer.get()
    }
}
