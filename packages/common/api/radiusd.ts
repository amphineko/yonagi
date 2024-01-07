import * as t from "io-ts"

export const GetRecentLogsResponseType = t.array(t.string)

export type GetRecentLogsResponse = t.TypeOf<typeof GetRecentLogsResponseType>
