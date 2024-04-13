import { Add } from "@mui/icons-material"
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Stack } from "@mui/material"
import { CreateCertificateRequest } from "@yonagi/common/api/pki"
import { PositiveIntegerFromString } from "@yonagi/common/types/Integers"
import { NonEmptyStringType } from "@yonagi/common/types/StringWithLengthRange"
import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import { BaseSyntheticEvent, useMemo, useState } from "react"
import useSWRMutation from "swr/mutation"

import { createCertificateAuthority, createClientCertificate, createServerCertificate } from "./actions"
import { CodecTextField } from "../../lib/forms"
import { useNotifications } from "../../lib/notifications"

function CreateCertificateAccordion({
    onSubmit,
    title,
}: {
    onSubmit: (form: CreateCertificateRequest) => void
    title: string
}) {
    const [commonName, setCommonName] = useState(NonEmptyStringType.decode(""))
    const [organizationName, setOrganizationName] = useState(NonEmptyStringType.decode(""))
    const [validity, setValidity] = useState(PositiveIntegerFromString.decode(""))

    const validation = useMemo(
        () =>
            F.pipe(
                E.Do,
                E.bind("subject", () =>
                    F.pipe(
                        E.Do,
                        E.bind("commonName", () => commonName),
                        E.bind("organizationName", () => organizationName),
                    ),
                ),
                E.bind("organizationName", () => organizationName),
                E.bind("validity", () => validity),
            ),
        [commonName, organizationName, validity],
    )

    const submit = (e: BaseSyntheticEvent) => {
        e.preventDefault()
        E.isRight(validation) && onSubmit(validation.right)
    }

    return (
        <Accordion defaultExpanded>
            <AccordionSummary>{title}</AccordionSummary>
            <AccordionDetails>
                <form onSubmit={submit}>
                    <Stack direction="column" gap={2}>
                        <CodecTextField
                            codec={NonEmptyStringType}
                            initialValue=""
                            onChange={setCommonName}
                            label="Common Name"
                        />
                        <CodecTextField
                            codec={NonEmptyStringType}
                            initialValue=""
                            onChange={setOrganizationName}
                            label="Organization Name"
                        />
                        <CodecTextField
                            codec={PositiveIntegerFromString}
                            initialValue=""
                            onChange={setValidity}
                            label="Valid Days"
                        />
                        <Box>
                            <Button
                                color="success"
                                onClick={submit}
                                startIcon={<Add />}
                                type="submit"
                                variant="contained"
                            >
                                Create
                            </Button>
                        </Box>
                    </Stack>
                </form>
            </AccordionDetails>
        </Accordion>
    )
}

function useCreateQuery(fn: (form: CreateCertificateRequest) => Promise<void>) {
    const { notifyError, notifySuccess } = useNotifications()

    return useSWRMutation(
        ["pki"],
        async (_, { arg: form }: { arg: CreateCertificateRequest }) => {
            await fn(form)
        },
        {
            onError: (error) => {
                notifyError("Cannot create certificate", String(error))
            },
            onSuccess: () => {
                notifySuccess("Certificate created")
            },
        },
    ).trigger
}

export function CreateCertificateAuthorityAccordion() {
    const create = useCreateQuery(async (form) => {
        await createCertificateAuthority(form)
    })
    return <CreateCertificateAccordion title="Certificate Authority" onSubmit={(form) => void create(form)} />
}

export function CreateServerCertificateAccordion() {
    const create = useCreateQuery(async (form) => {
        await createServerCertificate(form)
    })
    return <CreateCertificateAccordion title="Server Certificate" onSubmit={(form) => void create(form)} />
}

export function CreateClientCertificateAccordion() {
    const create = useCreateQuery(async (form) => {
        await createClientCertificate(form)
    })
    return <CreateCertificateAccordion title="Client Certificate" onSubmit={(form) => void create(form)} />
}
