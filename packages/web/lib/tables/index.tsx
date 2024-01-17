"use client"

import { TableCell, TextField } from "@mui/material"
import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as PR from "io-ts/lib/PathReporter"
import * as t from "io-ts/lib/index"
import { useMemo } from "react"

export type ElementOfArray<T extends readonly unknown[]> = T extends readonly (infer ET)[] ? ET : never

export function ValidatedTableCell<A>({
    disabled,
    isModified,
    onChange,
    validate,
    value,
}: {
    disabled?: boolean
    isModified?: boolean
    onChange: (value: string) => void
    validate: (value: string) => t.Validation<A>
    value: string
}): JSX.Element {
    const error = useMemo(
        () =>
            F.pipe(
                validate(value),
                E.fold(
                    (errors) => PR.failure(errors).join("\n"),
                    () => null,
                ),
            ),
        [validate, value],
    )

    return (
        <TableCell>
            <TextField
                color={isModified ? "success" : "primary"}
                disabled={disabled}
                error={isModified && error !== null}
                focused={isModified}
                type="text"
                value={value}
                variant="standard"
                onChange={(e) => {
                    onChange(e.target.value)
                }}
            />
        </TableCell>
    )
}
