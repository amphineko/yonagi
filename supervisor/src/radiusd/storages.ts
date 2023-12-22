import { Inject, Injectable, Scope, forwardRef } from "@nestjs/common"
import { ClientStorage as RawClientStorage, MPSKStorage as RawMPSKStorage } from "@yonagi/common/storage"

import { Config } from "../config"

@Injectable({ scope: Scope.DEFAULT })
export class ClientStorage extends RawClientStorage {
    constructor(@Inject(forwardRef(() => Config)) { clientsFilePath }: Config) {
        super(clientsFilePath)
    }
}

@Injectable({ scope: Scope.DEFAULT })
export class MPSKStorage extends RawMPSKStorage {
    constructor(@Inject(forwardRef(() => Config)) { authorizedMpsksFilePath }: Config) {
        super(authorizedMpsksFilePath)
    }
}
