"use client"

import { Add, Delete, Download, Save, Upload } from "@mui/icons-material"
import {
    Button,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableFooter,
    TableHead,
    TableRow,
    TextField,
} from "@mui/material"
import { ListClientsResponseType } from "@yonagi/common/api/clients"
import { Client } from "@yonagi/common/types/Client"
import { IpNetwork } from "@yonagi/common/types/IpNetwork"
import { IpNetworkFromStringType } from "@yonagi/common/types/IpNetworkFromString"
import { Name, NameType } from "@yonagi/common/types/Name"
import { Secret, SecretType } from "@yonagi/common/types/Secret"
import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts/lib/index"
import React, { useEffect, useMemo, useState } from "react"

import { useCreateClient, useDeleteClient, useImportClients, useRadiusClients, useUpdateClient } from "./queries"
import { useNonce } from "../../lib/client"
import { CodecTextField } from "../../lib/forms"
import { useNotifications } from "../../lib/notifications"
import { useExportDownload, useImportUpload } from "../../lib/upload"

interface ClientTableRowValidations {
    name: t.Validation<Name>
    ipaddr: t.Validation<IpNetwork>
    secret: t.Validation<Secret>
}

function ClientTableRow({
    actions,
    serverValues,
    onChange,
    onKeyDown,
}: {
    actions: React.ReactNode
    key?: React.Key
    serverValues?: Client
    onChange: (validations: ClientTableRowValidations) => void
    onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void
}): JSX.Element {
    /**
     * states of **latest validations** of each field
     * new values are updated to the input fields, and only their validations will be propagated here
     */
    const [name, setName] = useState(serverValues ? t.success(serverValues.name) : NameType.decode(""))
    const [ipaddr, setIpaddr] = useState(
        serverValues ? t.success(serverValues.ipaddr) : IpNetworkFromStringType.decode(""),
    )
    const [secret, setSecret] = useState(serverValues ? t.success(serverValues.secret) : SecretType.decode(""))

    const textFieldProps: React.ComponentProps<typeof TextField> = {
        variant: "standard",
    }

    useEffect(() => {
        // propagates the latest validations to the parent component
        onChange({ name, ipaddr, secret })
    }, [name, ipaddr, secret, onChange])

    return (
        <TableRow onKeyDown={onKeyDown}>
            <TableCell>
                <CodecTextField
                    codec={NameType}
                    initialValue={serverValues?.name ?? ""}
                    onChange={setName}
                    textFieldProps={textFieldProps}
                />
            </TableCell>
            <TableCell>
                <CodecTextField
                    codec={IpNetworkFromStringType}
                    initialValue={serverValues ? IpNetworkFromStringType.encode(serverValues.ipaddr) : ""}
                    onChange={setIpaddr}
                    textFieldProps={textFieldProps}
                />
            </TableCell>
            <TableCell>
                <CodecTextField
                    codec={SecretType}
                    initialValue={serverValues?.secret ?? ""}
                    onChange={setSecret}
                    textFieldProps={textFieldProps}
                />
            </TableCell>
            <TableCell>{actions}</TableCell>
        </TableRow>
    )
}

function useClientValidatedSubmit(submit: (client: Client) => void) {
    const [validations, setValidations] = useState<ClientTableRowValidations | null>(null)

    const handleSubmit = () => {
        if (validations === null) {
            return
        }

        F.pipe(
            E.Do,
            E.bind("name", () => validations.name),
            E.bind("ipaddr", () => validations.ipaddr),
            E.bind("secret", () => validations.secret),
            E.map((client) => {
                submit(client)
            }),
        )
    }

    return { handleSubmit, setValidations }
}

function CreateClientTableRow(): JSX.Element {
    const { trigger: createClient } = useCreateClient()
    const { handleSubmit, setValidations } = useClientValidatedSubmit((client) => {
        void createClient(client)
    })

    return (
        <ClientTableRow
            actions={
                <>
                    <IconButton aria-label="Create" onClick={handleSubmit}>
                        <Add />
                    </IconButton>
                </>
            }
            onChange={setValidations}
            onKeyDown={(e) => {
                e.key === "Enter" && handleSubmit()
            }}
        />
    )
}

function UpdateClientTableRow({ client }: { client: Client; key: React.Key }): JSX.Element {
    const { trigger: updateClient } = useUpdateClient()
    const { trigger: deleteClient } = useDeleteClient()
    const { handleSubmit, setValidations } = useClientValidatedSubmit((client) => {
        void updateClient(client)
    })

    return (
        <ClientTableRow
            actions={
                <>
                    <IconButton aria-label="Update" onClick={handleSubmit}>
                        <Save />
                    </IconButton>
                    <IconButton
                        aria-label="Delete"
                        onClick={() => {
                            void deleteClient(client.name)
                        }}
                    >
                        <Delete />
                    </IconButton>
                </>
            }
            onChange={setValidations}
            onKeyDown={(e) => {
                e.key === "Enter" && handleSubmit()
            }}
            serverValues={client}
        />
    )
}

function ClientTable(): JSX.Element {
    const { data: clients } = useRadiusClients()
    const { trigger: importClients } = useImportClients()

    const { notifyError } = useNotifications()

    const { download } = useExportDownload("clients.json", ListClientsResponseType)
    const { upload } = useImportUpload(
        ListClientsResponseType,
        (clients) => void importClients(clients),
        (error) => {
            notifyError(`Failed on upload`, String(error))
        },
    )

    const tableItems = useMemo(() => {
        if (clients === undefined) {
            return []
        }
        return clients.map((client) => <UpdateClientTableRow client={client} key={client.name} />)
    }, [clients])

    const { nonce: createRowKey, increaseNonce: increaseCreateRowKey } = useNonce()
    useEffect(() => {
        increaseCreateRowKey()
    }, [clients, increaseCreateRowKey])

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
                    <CreateClientTableRow key={createRowKey} />
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={4}>
                            <Button
                                aria-label="Export all clients"
                                startIcon={<Download />}
                                onClick={() => {
                                    if (clients !== undefined && clients.length > 0) {
                                        download(clients)
                                    } else {
                                        notifyError("No clients to export")
                                    }
                                }}
                            >
                                Export
                            </Button>
                            <Button aria-label="Import clients" startIcon={<Upload />} onClick={upload}>
                                Import
                            </Button>
                        </TableCell>
                    </TableRow>
                </TableFooter>
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
