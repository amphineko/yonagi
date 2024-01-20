import * as t from "io-ts"

import { DateFromUnixTimestamp } from "../types/Date"

export const GetStatusResponseType = t.partial({
    lastExitCode: t.number,
    lastRestartedAt: DateFromUnixTimestamp,
})

export type GetStatusResponse = t.TypeOf<typeof GetStatusResponseType>

export const GetRecentLogsResponseType = t.array(t.string)

export type GetRecentLogsResponse = t.TypeOf<typeof GetRecentLogsResponseType>
