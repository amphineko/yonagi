import { Inject, Module, OnApplicationBootstrap, OnApplicationShutdown, forwardRef } from "@nestjs/common"
import { DataSource } from "typeorm"

import {
    AbstractCertificateStorage,
    AbstractClientStorage,
    AbstractMPSKStorage,
    AbstractRadiusUserPasswordStorage,
    AbstractRadiusUserStorage,
} from "."
import { SqlClientStorage } from "./sql/clients"
import { SqlMPSKStorage } from "./sql/mpsks"
import { SqliteCertificateStorage } from "./sql/pki"
import { SqliteDataSource } from "./sql/sqlite"
import { SqlRadiusUserPasswordStorage, SqlRadiusUserStorage } from "./sql/users"
import { Config, ConfigModule } from "../config"

@Module({
    exports: [
        AbstractCertificateStorage,
        AbstractClientStorage,
        AbstractMPSKStorage,
        AbstractRadiusUserPasswordStorage,
        AbstractRadiusUserStorage,
    ],
    imports: [ConfigModule],
    providers: [
        {
            provide: DataSource,
            useFactory: (config: Config) => new SqliteDataSource(config),
            inject: [Config],
        },
        {
            provide: AbstractCertificateStorage,
            useClass: SqliteCertificateStorage,
        },
        {
            provide: AbstractClientStorage,
            useClass: SqlClientStorage,
        },
        {
            provide: AbstractMPSKStorage,
            useClass: SqlMPSKStorage,
        },
        {
            provide: AbstractRadiusUserPasswordStorage,
            useClass: SqlRadiusUserPasswordStorage,
        },
        {
            provide: AbstractRadiusUserStorage,
            useClass: SqlRadiusUserStorage,
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
