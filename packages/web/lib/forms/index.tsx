"use client"

import { TextField } from "@mui/material"
import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as PR from "io-ts/lib/PathReporter"
import * as t from "io-ts/lib/index"
import { useState } from "react"

type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>
}

export function ValidatedTextField<A, IO = string>({
    decoder,
    initialValue,
    label,
    onChange,
}: {
    decoder: t.Decoder<IO, A>
    initialValue: IO
    label: string
    onChange: (value: A | undefined) => void
}): JSX.Element {
    const [value, setValue] = useState(initialValue)
    const [error, setError] = useState<string | null>(null)

    const handleChange = (newValue: IO) => {
        setValue(newValue)
        F.pipe(
            decoder.decode(newValue),
            E.fold(
                (errors) => {
                    setError(PR.failure(errors).join("\n"))
                    onChange(undefined)
                },
                (value) => {
                    setError(null)
                    onChange(value)
                },
            ),
        )
    }

    return (
        <TextField
            error={error !== null}
            focused={error !== null}
            helperText={error}
            label={label}
            type="text"
            value={value}
            onChange={(e) => {
                handleChange(e.currentTarget.value as IO)
            }}
        />
    )
}

export function ValidatedForm<A>({
    decoder,
    children,
    submit,
}: {
    decoder: t.Decoder<unknown, A>
    children: (
        update: (f: (current: RecursivePartial<A>) => RecursivePartial<A>) => void,
        trySubmit: () => void,
    ) => JSX.Element
    submit: (form: A) => void
}): JSX.Element {
    const [fields, setFields] = useState<RecursivePartial<A>>({})
    return children(setFields, () => {
        F.pipe(decoder.decode(fields), E.map(submit))
    })
}

export function CodecTextField<A, IO extends string = string>({
    codec,
    focusOnModified,
    initialValue,
    label,
    onChange,
    textFieldProps,
}: {
    codec: t.Decoder<IO, A> & t.Encoder<A, IO>
    focusOnModified?: boolean
    initialValue: IO
    label?: string
    onChange: (validation: t.Validation<A>) => void
    textFieldProps?: React.ComponentProps<typeof TextField>
}): JSX.Element {
    const [value, setValue] = useState<IO>(initialValue)
    const [error, setError] = useState<string | null>(null)

    const handleChange = (newValue: IO) => {
        setValue(newValue)

        const validation = codec.decode(newValue)
        if (E.isLeft(validation)) {
            setError(PR.failure(validation.left).join("/"))
        } else {
            setError(null)
        }

        onChange(validation)
    }

    return (
        <TextField
            label={label}
            error={error !== null}
            color={error !== null ? "error" : "success"}
            focused={(focusOnModified ?? true) && value !== initialValue}
            {...textFieldProps}
            value={value}
            onChange={(e) => {
                handleChange(e.currentTarget.value as IO)
            }}
        />
    )
}
