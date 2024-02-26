import { Logger, pino } from "pino"

const logLevel = process.env.SUPERVISOR_LOG_LEVEL ?? "info"

export function createLogger(name: string): Logger {
    return pino({ name, level: logLevel })
}
