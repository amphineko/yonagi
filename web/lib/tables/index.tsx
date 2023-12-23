import { Button, Input, Tooltip, tokens } from "@fluentui/react-components"
import { DeleteIcon, ErrorIcon, ProgressRingDotsIcon, SaveIcon } from "@fluentui/react-icons-mdl2"
import { Name } from "@yonagi/common/common"
import * as E from "fp-ts/lib/Either"
import { PathReporter } from "io-ts/lib/PathReporter"
import * as t from "io-ts/lib/index"
import { useMemo, useState } from "react"

export type ElementOfArray<T extends readonly unknown[]> = T extends readonly (infer ET)[] ? ET : never

export function MutableCell<A, IO extends string = string>({
    codec,
    decodedInitialValue,
    isMutating,
    mutate,
}: {
    codec: t.Decoder<IO, A> & t.Encoder<A, IO>
    decodedInitialValue: A
    isMutating: boolean
    mutate: (newValue: A) => void
}): JSX.Element {
    const encodedInitialValue = useMemo(() => codec.encode(decodedInitialValue), [decodedInitialValue])

    const [encodedValue, setEncodedValue] = useState(encodedInitialValue)
    const isModified = encodedValue !== encodedInitialValue

    const decoding = codec.decode(encodedValue)
    const error = E.isLeft(decoding) ? PathReporter.report(decoding) : undefined

    const icon = isModified ? (
        isMutating ? (
            <ProgressRingDotsIcon />
        ) : error ? (
            <ErrorIcon style={{ color: tokens.colorStatusDangerForeground1 }} />
        ) : (
            <Button
                appearance="subtle"
                icon={<SaveIcon />}
                onClick={() => {
                    mutate(decodedInitialValue)
                }}
            />
        )
    ) : undefined

    const submit = () => {
        if (isModified && E.isRight(decoding)) {
            mutate(decoding.right)
        }
    }

    return (
        <Input
            appearance={isModified ? "outline" : "underline"}
            contentAfter={icon}
            onBlur={submit}
            onChange={(event) => {
                setEncodedValue(event.target.value as IO)
            }}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    submit()
                }
            }}
            type="text"
            value={encodedValue}
        />
    )
}

export function DeleteRowButton({
    name,
    isMutating,
    mutate,
}: {
    name: Name
    isMutating: boolean
    mutate: (name: Name) => void
}): JSX.Element {
    return (
        <Tooltip content={isMutating ? "Delete in progress" : "Delete"} relationship="description">
            <Button
                appearance="subtle"
                icon={isMutating ? <ProgressRingDotsIcon /> : <DeleteIcon />}
                onClick={() => {
                    mutate(name)
                }}
            />
        </Tooltip>
    )
}
