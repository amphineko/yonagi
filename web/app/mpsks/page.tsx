"use client"

import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material"
import { Name } from "@yonagi/common/common"
import {
    CallingStationIdAuthentication,
    CallingStationIdAuthenticationType,
    CallingStationIdType,
    PSKType,
} from "@yonagi/common/mpsks"
import { useMemo } from "react"
import { useQuery } from "react-query"

import { MutableTableCell, MutableTableRow, useTableHelpers } from "../../lib/tables"
import { createOrUpdateByName, deleteByName, getAllMpsks } from "./actions"

const MPSK_QUERY_KEY = ["mpsks"]

function tableCells(
    mpsk: Partial<CallingStationIdAuthentication>,
    stage: (field: string, partial: Partial<CallingStationIdAuthentication>) => void,
): JSX.Element {
    return (
        <>
            <MutableTableCell
                codec={CallingStationIdType}
                initialValue={mpsk.callingStationId ?? ""}
                stage={(callingStationId) => {
                    stage("callingStationId", callingStationId ? { callingStationId } : {})
                }}
            />
            <MutableTableCell
                codec={PSKType}
                initialValue={mpsk.psk ?? ""}
                stage={(psk) => {
                    stage("psk", psk ? { psk } : {})
                }}
            />
        </>
    )
}

function MpskTable(): JSX.Element {
    const { data: mpsks } = useQuery<ReadonlyMap<Name, CallingStationIdAuthentication>>(
        MPSK_QUERY_KEY,
        async () => await getAllMpsks(),
    )
    const { invalidate, nonce, queryClient } = useTableHelpers(MPSK_QUERY_KEY)

    const tableItems = useMemo(() => {
        if (mpsks === undefined) {
            return []
        }
        return Array.from(mpsks.entries()).map(([name, mpsk]) => (
            <MutableTableRow
                codec={CallingStationIdAuthenticationType}
                initialValue={mpsk}
                key={`${name}/${nonce}`}
                name={name}
                rowType="update"
                submit={async (name: Name, mpsk: CallingStationIdAuthentication) => {
                    await createOrUpdateByName(name, mpsk)
                    await invalidate()
                }}
                deleteRow={async (name: Name) => {
                    await deleteByName(name)
                    await invalidate()
                }}
            >
                {(_, mpsk, stage) => tableCells(mpsk, stage)}
            </MutableTableRow>
        ))
    }, [mpsks, queryClient])

    return (
        <TableContainer>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Calling Station ID</TableCell>
                        <TableCell>PSK</TableCell>
                        <TableCell>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>{tableItems}</TableBody>
            </Table>
        </TableContainer>
    )
}

export default function MpskDashboardPage() {
    return (
        <div>
            <MpskTable />
        </div>
    )
}
