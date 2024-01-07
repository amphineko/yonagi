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

import { createOrUpdateByName, deleteByName, getAllMpsks } from "./actions"
import { useQueryHelpers } from "../../lib/client"
import { MutableTableCell, MutableTableRow } from "../../lib/tables"

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
    const { invalidate, nonce } = useQueryHelpers(MPSK_QUERY_KEY)

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
    }, [invalidate, mpsks, nonce])

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
                <TableBody>
                    {tableItems}
                    <MutableTableRow
                        codec={CallingStationIdAuthenticationType}
                        initialValue={{ allowedAssociations: [], callingStationId: "", psk: "" }}
                        key={`new/${nonce}`}
                        name={""}
                        rowType="create"
                        submit={async (name: Name, mpsk: CallingStationIdAuthentication) => {
                            await createOrUpdateByName(name, mpsk)
                            await invalidate()
                        }}
                    >
                        {(_, client, stage) => tableCells(client, stage)}
                    </MutableTableRow>
                </TableBody>
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
