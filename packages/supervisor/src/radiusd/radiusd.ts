import { ChildProcess, spawn } from "child_process"
import { basename } from "path"

import { Inject, Injectable, forwardRef } from "@nestjs/common"
import pino from "pino"

import { Config } from "../config"
import { generateConfigs } from "../configs"
import { Pki } from "../pki/pki"
import { AbstractClientStorage, AbstractMPSKStorage } from "../storages"

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

class Process {
    private _lastExitCode: number | null = null

    private _lastRestart: Date | null = null

    private _logBuffer: CircularBuffer = new CircularBuffer(1000)

    private _process: ChildProcess | null = null

    private _restartEnabled = false

    get lastExitCode(): number | null {
        return this._lastExitCode
    }

    get lastRestartedAt(): Date | null {
        return this._lastRestart
    }

    get log(): string[] {
        return this._logBuffer.get()
    }

    constructor(private readonly executable: string) {}

    private autoRestart(): ChildProcess | null {
        if (this._lastRestart && Date.now() - this._lastRestart.getTime() < 1000) {
            this.logError(`Cannot restart process ${this.executable} so soon`)
            return null
        }

        if (!this._restartEnabled) {
            return null
        }

        if (this._process) {
            throw new Error("Process already started")
        }

        const child = spawn(this.executable, ["-f", "-l", "stdout"], {
            shell: false,
            stdio: [null, "pipe", "pipe"],
        })

        child.on("error", (error: Error | string) => {
            this.logError(`Cannot spawn process ${this.executable}: ${error.toString()}`)
            process.nextTick(() => this.autoRestart())
        })

        child.on("exit", (code, signal) => {
            if (this._process == child) {
                this._lastExitCode = code
                this._process = null
            }

            this.logInfo(`Process ${this.executable} exited with code ${code} and signal ${signal}`)
            this.autoRestart()
        })

        child.on("spawn", () => {
            this.logInfo(`Process ${this.executable} spawned (pid: ${child.pid})`)
        })

        child.stderr.on("data", (data: Buffer | string) => {
            const lines = data.toString().split("\n")
            this._logBuffer.append(lines)
            process.stderr.write(data)
        })

        child.stdout.on("data", (data: Buffer | string) => {
            const lines = data.toString().split("\n")

            if (lines[lines.length - 1].trim() === "") {
                // strip last empty line
                lines.pop()
            }

            this._logBuffer.append(lines)
            process.stdout.write(data)
        })

        this._process = child
        this._lastExitCode = null
        this._lastRestart = new Date()
        return child
    }

    start(): Promise<void> {
        this._lastRestart = null
        this._restartEnabled = true

        const child = this.autoRestart()
        if (child == null) {
            throw new Error("Unexpected null child process")
        }

        return new Promise<void>((resolve, reject) => {
            child.on("spawn", () => {
                resolve()
            })
            child.on("error", (error: Error | string) => {
                reject(new Error(`Cannot spawn process ${this.executable}: ${error.toString()}`))
            })
        })
    }

    stop(): Promise<number> {
        this._restartEnabled = false
        return new Promise<number>((resolve) => {
            if (this._process) {
                this._process.on("exit", (code) => {
                    resolve(code ?? 0)
                })
                if (this._process.exitCode !== null) {
                    resolve(this._process.exitCode)
                }
                this._process.kill()
            } else {
                resolve(0)
            }
        })
    }

    private logError(message: string): void {
        logger.error(message)
        this._logBuffer.append([message])
    }

    private logInfo(message: string): void {
        logger.info(message)
        this._logBuffer.append([message])
    }
}

@Injectable()
export class Radiusd {
    public get lastExitCode(): number | null {
        return this._process.lastExitCode
    }

    public get lastRestartedAt(): Date | null {
        return this._process.lastRestartedAt
    }

    public get log(): string[] {
        return this._process.log
    }

    private _process: Process

    constructor(
        @Inject(forwardRef(() => AbstractClientStorage)) private clientStorage: AbstractClientStorage,
        @Inject(forwardRef(() => Config)) private config: Config,
        @Inject(forwardRef(() => AbstractMPSKStorage)) private mpskStorage: AbstractMPSKStorage,
        @Inject(forwardRef(() => Pki)) private pki: Pki,
    ) {
        this._process = new Process(config.radiusdPath)
    }

    private async _regenerateFiles(): Promise<void> {
        const clients = await this.clientStorage.all()
        const pkiDeployed = await this.pki.deployToRadiusd()
        await generateConfigs({
            clients,
            pki: pkiDeployed ? this.config.pkiOutputPath : undefined,
            raddbPath: this.config.raddbDirPath,
        })
    }

    async start(): Promise<void> {
        await this._regenerateFiles()
        await this._process.start()
    }

    async stop(): Promise<number> {
        return await this._process.stop()
    }

    async reload(): Promise<void> {
        await this.stop()
        await this.start()
    }
}
