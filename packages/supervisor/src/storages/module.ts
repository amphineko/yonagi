import { Inject, Module, OnApplicationBootstrap, OnApplicationShutdown, forwardRef } from "@nestjs/common"
import { DataSource } from "typeorm"

import { AbstractClientStorage, AbstractMPSKStorage } from "."
import { FileBasedMPSKStorage } from "./files"
import { SqliteDataSource } from "./sql/backends"
import { SqlClientStorage } from "./sql/clients"
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
            useFactory: (config: Config) => new FileBasedMPSKStorage(config.authorizedMpsksFilePath),
            inject: [Config],
        },
    ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class StorageModule implements OnApplicationBootstrap, OnApplicationShutdown {
    constructor(@Inject(forwardRef(() => DataSource)) private readonly dataSource: DataSource) {}

    async onApplicationBootstrap(): Promise<void> {
        await this.dataSource.initialize()
        await this.dataSource.synchronize(false)
    }

    async onApplicationShutdown(): Promise<void> {
        await this.dataSource.destroy()
    }
}
