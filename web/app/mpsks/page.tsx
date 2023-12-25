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
import { useQuery, useQueryClient } from "react-query"

import { createOrUpdateByName, getAllMpsks } from "./actions"
import { MutableTableCell, MutableTableRow, ReadonlyTableCell } from "../../lib/tables"

const MPSK_QUERY_KEY = "mpsks"

function MpskTable(): JSX.Element {
    const { data: mpsks } = useQuery<ReadonlyMap<Name, CallingStationIdAuthentication>>(
        MPSK_QUERY_KEY,
        async () => await getAllMpsks(),
    )
    const queryClient = useQueryClient()

    const tableItems = useMemo(() => {
        if (mpsks === undefined) {
            return []
        }
        return Array.from(mpsks.entries()).map(([name, mpsk]) => (
            <MutableTableRow
                codec={CallingStationIdAuthenticationType}
                initialValue={mpsk}
                key={name}
                name={name}
                rowType="update"
                submit={async (name: Name, mpsk: CallingStationIdAuthentication) => {
                    await createOrUpdateByName(name, mpsk)
                    await queryClient.invalidateQueries(MPSK_QUERY_KEY)
                }}
            >
                {(name, mpsk, stage) => (
                    <>
                        <ReadonlyTableCell value={name} />
                        <MutableTableCell
                            codec={CallingStationIdType}
                            initialValue={mpsk.callingStationId}
                            stage={(callingStationId) => {
                                stage("callingStationId", callingStationId ? { callingStationId } : {})
                            }}
                        />
                        <MutableTableCell
                            codec={PSKType}
                            initialValue={mpsk.psk}
                            stage={(psk) => {
                                stage("psk", psk ? { psk } : {})
                            }}
                        />
                    </>
                )}
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
