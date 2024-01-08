import { Module } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify"

import { ApiModule } from "./api/module"
import { RadiusdModule } from "./radiusd/module"

const LISTEN_PORT = process.env.LISTEN_PORT ?? 8000
const LISETN_HOST = process.env.LISTEN_HOST ?? "localhost"

@Module({ imports: [ApiModule, RadiusdModule] })
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class RootModule {}

async function main() {
    const app = await NestFactory.create<NestFastifyApplication>(RootModule, new FastifyAdapter())
    app.enableShutdownHooks()
    await app.listen(LISTEN_PORT, LISETN_HOST)
}

main().catch((err) => {
    console.error("Main function exited with error:", err)
    process.exit(1)
})
