import { Module } from "@nestjs/common"

import { AbstractClientStorage, AbstractMPSKStorage } from "."
import { FileBasedClientStorage, FileBasedMPSKStorage } from "./files"
import { Config, ConfigModule } from "../config"

@Module({
    exports: [AbstractClientStorage, AbstractMPSKStorage],
    imports: [ConfigModule],
    providers: [
        {
            provide: AbstractClientStorage,
            useFactory: (config: Config) => new FileBasedClientStorage(config.clientsFilePath),
            inject: [Config],
        },
        {
            provide: AbstractMPSKStorage,
            useFactory: (config: Config) => new FileBasedMPSKStorage(config.authorizedMpsksFilePath),
            inject: [Config],
        },
    ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class StorageModule {}
