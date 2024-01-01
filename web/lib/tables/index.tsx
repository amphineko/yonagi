"use client"

import { Add, DeleteForever, Save } from "@mui/icons-material"
import { CircularProgress, IconButton, TableCell, TableRow, TextField } from "@mui/material"
import { Name, NameType } from "@yonagi/common/common"
import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import { PathReporter } from "io-ts/lib/PathReporter"
import * as t from "io-ts/lib/index"
import { useMemo, useState } from "react"
import { useMutation } from "react-query"

export type ElementOfArray<T extends readonly unknown[]> = T extends readonly (infer ET)[] ? ET : never

export function MutableTableCell<A, IO = string>({
    codec,
    initialValue: initialValue,
    readOnly,
    stage,
}: {
    codec: t.Decoder<IO, A> & t.Encoder<A, IO>
    initialValue: A
    readOnly?: boolean
    stage: (update?: A) => void
}): JSX.Element {
    const encodedInitialValue = codec.encode(initialValue)
    const [encodedValue, setEncodedValue] = useState<IO>(encodedInitialValue)

    const decoding = codec.decode(encodedValue)
    const error = E.isLeft(decoding) ? PathReporter.report(decoding) : null
    const isModified = error === null && encodedInitialValue !== encodedValue

    const onChange = (newValue: IO) => {
        setEncodedValue(newValue)
        F.pipe(
            newValue !== encodedInitialValue ? E.right(newValue) : E.left(null),
            E.flatMap((newValue) => codec.decode(newValue)),
            E.fold(
                () => {
                    stage(undefined)
                },
                (newValue) => {
                    stage(newValue)
                },
            ),
        )
    }

    return (
        <TableCell>
            <TextField
                color={isModified ? "success" : "primary"}
                error={error !== null}
                disabled={readOnly ?? false}
                focused={isModified}
                type="text"
                value={encodedValue}
                variant="standard"
                onChange={(e) => {
                    onChange(e.currentTarget.value as IO)
                }}
            />
        </TableCell>
    )
}

interface MutableTableRowProps<A, RT extends "create" | "update"> {
    children: (
        key: Name,
        value: Partial<A>,
        stage: (cell: string, partial: Partial<A> | Record<string, never>) => void,
    ) => JSX.Element
    codec: t.Decoder<unknown, A> & t.Encoder<A, unknown>
    deleteRow?: (key: Name) => Promise<void>
    initialValue: RT extends "create" ? Partial<A> : A
    key: Name
    name: Name
    rowType: RT
    submit: (key: Name, value: A) => Promise<void>
}

/**
 * @todo    Known race condition: Staged updates are one-way propagated to this
 *          component, but not the other way around. This means that if the user
 *          touches a cell during a mutation, the staging will be lost when the
 *          mutation completes and become out of sync with the input field.
 */
export function MutableTableRow<A, RT extends "create" | "update">(props: MutableTableRowProps<A, RT>): JSX.Element {
    const { children, codec, deleteRow, initialValue, name: initialName, rowType, submit } = props

    const [submitName, setSubmitName] = useState<Name>(() => (rowType === "create" ? "" : initialName))
    const nameValidation = NameType.validate(submitName, [])

    const [updates, setUpdates] = useState<Record<string, Partial<A> | Record<string, never>>>({})
    const update = useMemo(
        () => Object.values(updates).reduce((acc, partial) => ({ ...acc, ...partial }), initialValue),
        [initialValue, updates],
    )

    const { mutate, isLoading } = useMutation({
        mutationFn: async (value: A) => {
            await submit(submitName, value)
        },
        mutationKey: [codec.name, "update", submitName],
        onSuccess: () => {
            setUpdates({})
        },
    })

    const { mutate: mutateDelete, isLoading: isLoadingDelete } = useMutation({
        mutationFn: async () => {
            await deleteRow?.(submitName)
        },
        mutationKey: [codec.name, "delete", submitName],
    })

    const validation = codec.validate(update, [])
    const canSubmit =
        E.isRight(validation) &&
        E.isRight(nameValidation) &&
        Array.from(Object.values(updates)).reduce((acc, partial) => acc + Object.keys(partial).length, 0) > 0

    const stage = (cell: string, partial: Partial<A> | Record<string, never>) => {
        setUpdates((updates) => ({ ...updates, [cell]: partial }))
    }
    const trySubmit = () => {
        if (canSubmit) {
            mutate(validation.right)
        }
    }

    return (
        <TableRow
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                    trySubmit()
                }
            }}
        >
            <MutableTableCell
                codec={NameType}
                initialValue={initialName}
                readOnly={rowType === "update"}
                stage={(newName?: string) => {
                    setSubmitName(newName ?? "")
                }}
            />
            {children(initialName, initialValue, stage)}
            <TableCell>
                <IconButton
                    aria-label="submit"
                    color="primary"
                    disabled={!canSubmit || isLoading}
                    type="submit"
                    onClick={trySubmit}
                >
                    {isLoading ? <CircularProgress size="1em" /> : rowType === "create" ? <Add /> : <Save />}
                </IconButton>
                {deleteRow && (
                    <IconButton
                        aria-label="delete"
                        color="warning"
                        disabled={isLoadingDelete}
                        type="button"
                        onClick={() => {
                            mutateDelete()
                        }}
                    >
                        {isLoadingDelete ? <CircularProgress size="1em" /> : <DeleteForever />}
                    </IconButton>
                )}
            </TableCell>
        </TableRow>
    )
}
