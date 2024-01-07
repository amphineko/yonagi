"use client"

import styled from "@emotion/styled"
import { useQuery } from "react-query"

import { getRecentLogs } from "../actions"

const LogLine = styled.span`
    display: block;
    font-family: monospace;
`

export default function RadiusdLogPage() {
    const { data: logs } = useQuery<readonly string[]>({
        queryKey: ["radiusd", "logs"],
        queryFn: async () => await getRecentLogs(),
    })

    return <div>{logs?.map((log, idx) => <LogLine key={idx}>{log}</LogLine>)}</div>
}
