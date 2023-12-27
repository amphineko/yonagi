"use client"

import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material"
import { Client, ClientType } from "@yonagi/common/clients"
import { IpNetworkFromStringType, Name, SecretType } from "@yonagi/common/common"
import { useMemo } from "react"
import { useQuery } from "react-query"

import { MutableTableCell, MutableTableRow, useTableHelpers } from "../../lib/tables"
import { createOrUpdateByName, deleteByName, getAllClients } from "./actions"

const CLIENT_QUERY_KEY = ["clients"]

function tableCells(client: Partial<Client>, stage: (field: string, partial: Partial<Client>) => void): JSX.Element {
    return (
        <>
            <MutableTableCell
                codec={IpNetworkFromStringType}
                initialValue={client.ipaddr ?? { address: "0.0.0.0", netmask: 0 }}
                stage={(ipaddr) => {
                    stage("ipaddr", ipaddr ? { ipaddr } : {})
                }}
            />
            <MutableTableCell
                codec={SecretType}
                initialValue={client.secret ?? ""}
                stage={(secret) => {
                    stage("secret", secret ? { secret } : {})
                }}
            />
        </>
    )
}

function ClientTable(): JSX.Element {
    const { data: clients } = useQuery<ReadonlyMap<Name, Client>>(CLIENT_QUERY_KEY, async () => await getAllClients())
    const { invalidate, nonce, queryClient } = useTableHelpers(CLIENT_QUERY_KEY)

    const tableItems = useMemo(() => {
        if (clients === undefined) {
            return []
        }
        return Array.from(clients.entries()).map(([name, client]) => (
            <MutableTableRow
                codec={ClientType}
                initialValue={client}
                key={`${name}/${nonce}`}
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
                {(_, client, stage) => tableCells(client, stage)}
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
                <TableBody>
                    {tableItems}
                    <MutableTableRow
                        codec={ClientType}
                        initialValue={{ ipaddr: { address: "0.0.0.0", netmask: 0 } }}
                        key={`new/${nonce}`}
                        name={""}
                        rowType="create"
                        submit={async (name: Name, client: Client) => {
                            await createOrUpdateByName(name, client)
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

export default function ClientDashboardPage() {
    return (
        <div>
            <ClientTable />
        </div>
    )
}
