import { Module } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify"

import { ApiModule } from "./api/module"
import { RadiusdModule } from "./radiusd/module"

@Module({ imports: [ApiModule, RadiusdModule] })
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class RootModule {}

async function main() {
    const app = await NestFactory.create<NestFastifyApplication>(RootModule, new FastifyAdapter())
    app.enableShutdownHooks()
    await app.listen(8000)
}

main().catch((err) => {
    console.error("Main function exited with error:", err)
    process.exit(1)
})
