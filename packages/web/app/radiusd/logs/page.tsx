"use client"

import styled from "@emotion/styled"
import useSWR from "swr"

import { getRecentLogs } from "../actions"

const LogLine = styled.span`
    display: block;
    font-family: monospace;
`

export default function RadiusdLogPage() {
    const { data: logs } = useSWR<readonly string[]>(["radiusd"], async () => await getRecentLogs())

    return <div>{logs?.map((log, idx) => <LogLine key={idx}>{log}</LogLine>)}</div>
}
