import { basename, resolve } from "path"

import { Inject, forwardRef } from "@nestjs/common"
import pino from "pino"
import { AbstractLogger, DataSource, LogLevel, LogMessage } from "typeorm"
import { DataSourceOptions } from "typeorm/browser"

import { entities as ClientEntities } from "./clients"
import { Initial1700000000001 } from "./migrations/1700000000001-initial"
import { SqlitePki1700000000002 } from "./migrations/1700000000002-sqlite-pki"
import { entities as MPSKEntities } from "./mpsks"
import { entities as PkiEntities } from "./pki"
import { createLogger } from "../../common/logger"
import { Config } from "../../config"

const logger = createLogger(`${basename(__dirname)}/${basename(__filename)}`)

const entities = [...ClientEntities, ...MPSKEntities, ...PkiEntities]

class PinoTypeormLogger extends AbstractLogger {
    private readonly _logger: pino.Logger

    constructor() {
        super("all")
        this._logger = createLogger("typeorm")
    }

    protected writeLog(
        level: LogLevel,
        message: string | number | LogMessage | (string | number | LogMessage)[],
    ): void {
        const messages = this.prepareLogMessages(message, { highlightSql: true })
        for (const message of messages) {
            let s = message.message

            if (message.prefix) {
                s = `${message.prefix}: ${s}`
            }

            if (message.type !== level) {
                s = `[${message.type}] ${s}`
            }

            switch (message.type ?? level) {
                case "error":
                case "query-error":
                    this._logger.error(s)
                    break
                case "info":
                case "migration":
                case "schema":
                case "schema-build":
                    this._logger.info(s)
                    break
                case "log":
                case "query":
                    this._logger.debug(s)
                    break
                case "warn":
                case "query-slow":
                    this._logger.warn(s)
                    break
                default:
                    this._logger.debug(s)
                    break
            }
        }
    }
}

function createSqliteDataSourceOptions(filePath: string, enableSynchronize: boolean): DataSourceOptions {
    return {
        type: "sqlite",
        database: filePath,
        entities,
        logger: new PinoTypeormLogger(),
        migrations: [Initial1700000000001, SqlitePki1700000000002],
        migrationsRun: true,
        migrationsTableName: "migrations",
        synchronize: enableSynchronize,
    }
}

export class SqliteDataSource extends DataSource {
    constructor(@Inject(forwardRef(() => Config)) { sqliteFilePath, typeormEnableSynchronize }: Config) {
        if (typeormEnableSynchronize) {
            logger.warn("typeormEnableSynchronize is enabled. This is not recommended for production use.")
        }

        super(createSqliteDataSourceOptions(sqliteFilePath, typeormEnableSynchronize))
    }
}

export default new DataSource(
    createSqliteDataSourceOptions(resolve(__dirname, "../../../../..", "data/states.sqlite3"), false),
)
