"use client"

import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material"
import { Client, ClientType } from "@yonagi/common/clients"
import { IpNetworkFromStringType, Name, SecretType } from "@yonagi/common/common"
import { useMemo } from "react"
import { useQuery, useQueryClient } from "react-query"

import { createOrUpdateByName, deleteByName, getAllClients } from "./actions"
import { MutableTableCell, MutableTableRow, ReadonlyTableCell } from "../../lib/tables"

const CLIENT_QUERY_KEY = ["clients"]

function ClientTable(): JSX.Element {
    const { data: clients } = useQuery<ReadonlyMap<Name, Client>>(CLIENT_QUERY_KEY, async () => await getAllClients())
    const queryClient = useQueryClient()

    const tableItems = useMemo(() => {
        if (clients === undefined) {
            return []
        }
        return Array.from(clients.entries()).map(([name, client]) => (
            <MutableTableRow
                codec={ClientType}
                initialValue={client}
                key={name}
                name={name}
                rowType="update"
                submit={async (name: Name, client: Client) => {
                    await createOrUpdateByName(name, client)
                    await queryClient.invalidateQueries(CLIENT_QUERY_KEY)
                }}
                deleteRow={async (name: Name) => {
                    await deleteByName(name)
                    await queryClient.invalidateQueries(CLIENT_QUERY_KEY)
                }}
            >
                {(name, client, stage) => (
                    <>
                        <ReadonlyTableCell value={name} />
                        <MutableTableCell
                            codec={IpNetworkFromStringType}
                            initialValue={client.ipaddr}
                            stage={(ipaddr) => {
                                stage("ipaddr", ipaddr ? { ipaddr } : {})
                            }}
                        />
                        <MutableTableCell
                            codec={SecretType}
                            initialValue={client.secret}
                            stage={(secret) => {
                                stage("secret", secret ? { secret } : {})
                            }}
                        />
                    </>
                )}
            </MutableTableRow>
        ))
    }, [clients, queryClient])

    return (
        <TableContainer>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Allowed Subnet</TableCell>
                        <TableCell>Secret</TableCell>
                        <TableCell>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>{tableItems}</TableBody>
            </Table>
        </TableContainer>
    )
}

export default function ClientDashboardPage() {
    return (
        <div>
            <ClientTable />
        </div>
    )
}
