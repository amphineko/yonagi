import { Inject, Module, OnApplicationBootstrap, OnApplicationShutdown, forwardRef } from "@nestjs/common"
import { DataSource } from "typeorm"

import { AbstractClientStorage, AbstractMPSKStorage } from "."
import { SqlClientStorage } from "./sql/clients"
import { SqlMPSKStorage } from "./sql/mpsks"
import { SqliteDataSource } from "./sql/sqlite"
import { Config, ConfigModule } from "../config"

@Module({
    exports: [AbstractClientStorage, AbstractMPSKStorage],
    imports: [ConfigModule],
    providers: [
        {
            provide: DataSource,
            useFactory: (config: Config) => new SqliteDataSource(config),
            inject: [Config],
        },
        {
            provide: AbstractClientStorage,
            useClass: SqlClientStorage,
        },
        {
            provide: AbstractMPSKStorage,
            useClass: SqlMPSKStorage,
        },
    ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class StorageModule implements OnApplicationBootstrap, OnApplicationShutdown {
    constructor(@Inject(forwardRef(() => DataSource)) private readonly dataSource: DataSource) {}

    async onApplicationBootstrap(): Promise<void> {
        await this.dataSource.initialize()
        await this.dataSource.runMigrations()
        await this.dataSource.synchronize(false)
    }

    async onApplicationShutdown(): Promise<void> {
        await this.dataSource.destroy()
    }
}
