import { basename, resolve } from "path"

import { Inject, forwardRef } from "@nestjs/common"
import pino from "pino"
import { DataSource } from "typeorm"
import { DataSourceOptions } from "typeorm/browser"

import { entities as ClientEntities } from "./clients"
import { Initial1700000000001 } from "./migrations/1700000000001-initial"
import { SqlitePki1700000000002 } from "./migrations/1700000000002-sqlite-pki"
import { entities as MPSKEntities } from "./mpsks"
import { entities as PkiEntities } from "./pki"
import { Config } from "../../config"

const logger = pino({ name: `${basename(__dirname)}/${basename(__filename)}` })

const entities = [...ClientEntities, ...MPSKEntities, ...PkiEntities]

function createSqliteDataSourceOptions(filePath: string, enableSynchronize: boolean): DataSourceOptions {
    return {
        type: "sqlite",
        database: filePath,
        entities,
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
