"use client"

import { CheckCircle, Dangerous, ExpandMore } from "@mui/icons-material"
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Container, Typography } from "@mui/material"
import { useReducer } from "react"

import { useNotifications } from "../../lib/notifications"

export default function NotificationDebugPage() {
    const { notifySuccess, notifyError } = useNotifications()
    const [key, newKey] = useReducer((state: number): number => state + 1, 0)

    return (
        <Container>
            <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>Notifications</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Box>
                        <Button
                            startIcon={<CheckCircle />}
                            onClick={() => {
                                notifySuccess("Success", "This is a success message")
                            }}
                        >
                            Success with default key
                        </Button>
                        <Button
                            onClick={() => {
                                notifySuccess("Success", "This is a success message", key)
                                newKey()
                            }}
                        >
                            Success with new key
                        </Button>
                        <Button
                            onClick={() => {
                                notifySuccess("Success without message", undefined, key)
                                newKey()
                            }}
                        >
                            Success without message
                        </Button>
                    </Box>
                    <Box>
                        <Button
                            startIcon={<Dangerous />}
                            onClick={() => {
                                notifyError("Error", "This is an error message")
                            }}
                        >
                            Error with default key
                        </Button>
                        <Button
                            onClick={() => {
                                notifyError("Error", "This is an error message", key)
                                newKey()
                            }}
                        >
                            Error with new key
                        </Button>
                    </Box>
                </AccordionDetails>
            </Accordion>
        </Container>
    )
}
