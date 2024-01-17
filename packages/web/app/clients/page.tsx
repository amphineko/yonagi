"use client"

import { Add, Delete, Save } from "@mui/icons-material"
import { IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material"
import { Client, ClientType } from "@yonagi/common/clients"
import { IpNetworkFromStringType, Name, NameType, SecretType } from "@yonagi/common/common"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as PR from "io-ts/lib/PathReporter"
import * as t from "io-ts/lib/index"
import { useCallback, useMemo, useState } from "react"
import { useMutation, useQuery } from "react-query"

import { createOrUpdateByName, deleteByName, getAllClients } from "./actions"
import { useQueryHelpers, useStagedNonce } from "../../lib/client"
import { ValidatedTableCell } from "../../lib/tables"

const CLIENT_QUERY_KEY = ["clients"]

function ClientTableRow({
    createOrUpdate,
    delete: deleteRow,
    initialValue,
    isCreateOrUpdate,
    name: initalName,
}: {
    createOrUpdate: (name: Name, client: Client) => Promise<void>
    delete: (name: Name) => Promise<void>
    initialValue: Partial<Client>
    isCreateOrUpdate: "create" | "update"
    key: string
    name?: Name
}): JSX.Element {
    const [name, setName] = useState<string>(initalName ?? "")
    const isNameModified = useMemo(() => name !== (initalName ?? ""), [initalName, name])

    const [ipaddr, setIpaddr] = useState<string>(
        initialValue.ipaddr ? IpNetworkFromStringType.encode(initialValue.ipaddr) : "",
    )
    const isIpaddrModified = useMemo(
        () =>
            ipaddr !==
            (initialValue.ipaddr
                ? // check against initial value if present (for updating)
                  IpNetworkFromStringType.encode(initialValue.ipaddr)
                : // otherwise check against empty string (for creating)
                  ""),
        [initialValue.ipaddr, ipaddr],
    )

    const [secret, setSecret] = useState<string>(initialValue.secret ?? "")
    const isSecretModified = useMemo(() => secret !== (initialValue.secret ?? ""), [initialValue.secret, secret])

    const formValidation = useMemo<t.Validation<{ name: Name; client: Client }>>(
        () =>
            F.pipe(
                E.Do,
                E.bind("name", () => NameType.decode(name)),
                E.bind("ipaddr", () => IpNetworkFromStringType.decode(ipaddr)),
                E.bind("client", ({ ipaddr }) => ClientType.decode({ ipaddr, secret })),
            ),
        [ipaddr, name, secret],
    )

    const { invalidate } = useQueryHelpers(CLIENT_QUERY_KEY)
    const { mutate: submit } = useMutation({
        mutationFn: async (validation: typeof formValidation) => {
            await F.pipe(
                TE.fromEither(validation),
                TE.mapLeft((errors) => new Error(PR.failure(errors).join("\n"))),
                TE.flatMap(({ name, client }) => TE.tryCatch(() => createOrUpdate(name, client), E.toError)),
                TE.getOrElse((e) => {
                    throw e
                }),
            )()
        },
        mutationKey: ["clients", "create-or-update", name],
        onSettled: invalidate,
    })
    const { mutate: submitDelete } = useMutation<unknown, unknown, Name>({
        mutationFn: async (name) => {
            await deleteRow(name)
        },
        mutationKey: ["clients", "delete", name],
        onSettled: invalidate,
    })

    return (
        <TableRow
            onKeyDown={(event) => {
                if (event.key === "Enter") submit(formValidation)
            }}
        >
            <ValidatedTableCell
                disabled={isCreateOrUpdate === "update"}
                isModified={isNameModified}
                onChange={setName}
                validate={(value) => NameType.decode(value)}
                value={name}
            />
            <ValidatedTableCell
                isModified={isIpaddrModified}
                onChange={setIpaddr}
                validate={(value) => IpNetworkFromStringType.decode(value)}
                value={ipaddr}
            />
            <ValidatedTableCell
                isModified={isSecretModified}
                onChange={setSecret}
                validate={(value) => SecretType.decode(value)}
                value={secret}
            />

            {isCreateOrUpdate === "create" && (
                <TableCell>
                    <IconButton
                        aria-label="Create"
                        disabled={E.isLeft(formValidation)}
                        onClick={() => {
                            submit(formValidation)
                        }}
                    >
                        <Add />
                    </IconButton>
                </TableCell>
            )}

            {isCreateOrUpdate === "update" && (
                <TableCell>
                    <IconButton
                        aria-label="Update"
                        disabled={E.isLeft(formValidation)}
                        onClick={() => {
                            submit(formValidation)
                        }}
                    >
                        <Save />
                    </IconButton>
                    <IconButton
                        aria-label="Delete"
                        onClick={() => {
                            submitDelete(name)
                        }}
                    >
                        <Delete />
                    </IconButton>
                </TableCell>
            )}
        </TableRow>
    )
}

function ClientTable(): JSX.Element {
    const { nonce, increaseNonce, publishNonce } = useStagedNonce()
    const { data: clients } = useQuery<ReadonlyMap<Name, Client>>({
        queryFn: async () => await getAllClients(),
        queryKey: CLIENT_QUERY_KEY,
        onSettled: publishNonce,
    })

    const createOrUpdateByNameWithNonce = useCallback(
        async (name: Name, client: Client) => {
            await createOrUpdateByName(name, client)
            increaseNonce()
        },
        [increaseNonce],
    )
    const deleteByNameWithNonce = useCallback(
        async (name: Name) => {
            await deleteByName(name)
            increaseNonce()
        },
        [increaseNonce],
    )

    const tableItems = useMemo(() => {
        if (clients === undefined) {
            return []
        }
        return Array.from(clients.entries()).map(([name, client]) => (
            <ClientTableRow
                createOrUpdate={createOrUpdateByNameWithNonce}
                delete={deleteByNameWithNonce}
                initialValue={client}
                isCreateOrUpdate="update"
                key={`${name}@${nonce}`}
                name={name}
            />
        ))
    }, [clients, createOrUpdateByNameWithNonce, deleteByNameWithNonce, nonce])

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
                    <ClientTableRow
                        createOrUpdate={createOrUpdateByNameWithNonce}
                        delete={deleteByNameWithNonce}
                        initialValue={{}}
                        isCreateOrUpdate="create"
                        key={`create@${nonce}`}
                    />
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
