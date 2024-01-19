import { Inject, forwardRef } from "@nestjs/common"
import { DataSource } from "typeorm"

import { SqlClientEntity } from "./clients"
import { Config } from "../../config"

export class SqliteDataSource extends DataSource {
    constructor(@Inject(forwardRef(() => Config)) { sqliteFilePath }: Config) {
        super({
            type: "sqlite",
            database: sqliteFilePath,
            entities: [SqlClientEntity],
        })
    }
}
