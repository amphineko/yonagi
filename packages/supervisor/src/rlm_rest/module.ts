import { Module } from "@nestjs/common"

import { DynamicClientResolver } from "./dynclients"
import { StorageModule } from "../storages/module"

@Module({
    providers: [DynamicClientResolver],
    exports: [DynamicClientResolver],
    imports: [StorageModule],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class RlmRestModule {}
