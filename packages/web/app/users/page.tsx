"use client"

import { Delete, ExpandMore, Lock, LockOpen, Person, PersonAdd, Save, Warning } from "@mui/icons-material"
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    FormControlLabel,
    Grid,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material"
import { RadiusUser, RadiusUserPasswordStatus } from "@yonagi/common/types/users/RadiusUser"
import { Username, UsernameType } from "@yonagi/common/types/users/Username"
import { useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import useSWRMutation from "swr/mutation"

import { createUser, deleteUser, listUserPasswords, listUsers, updateUserPasswords } from "./actions"
import { nthash, ssha512 } from "./crypto"
import { useNotifications } from "../../lib/notifications"

function PasswordHashChip({ status, method }: { status: boolean; method: "SSHA-512" | "NT-Hash" | "Clear Text" }) {
    const tooltip = status ? "A password hash is stored for this method" : "No password hash is stored for this method"

    return (
        <Tooltip title={tooltip}>
            <Chip
                color={status ? "primary" : "default"}
                label={method}
                size="small"
                variant={status ? "filled" : "outlined"}
            />
        </Tooltip>
    )
}

function SupportedMethodChip({
    status,
    method,
    short,
}: {
    status: boolean
    method: "EAP-PEAP-GTC" | "EAP-PEAP-MSCHAPv2"
    short: "gtc" | "mschapv2"
}) {
    return (
        <Tooltip title={method}>
            <Chip
                color={status ? "success" : "default"}
                icon={status ? <Lock /> : <LockOpen />}
                label={short}
                size="small"
                sx={{
                    gap: "0.1em",
                }}
                variant={status ? "filled" : "outlined"}
            />
        </Tooltip>
    )
}

function UserAccordion({ user, passwords }: { user: RadiusUser; passwords?: RadiusUserPasswordStatus }) {
    const gtc = passwords?.clearText === true || passwords?.ntHash === true || passwords?.ssha512 === true
    const mschapv2 = passwords?.clearText === true || passwords?.ntHash === true

    const [enableSsha512, setSsha512] = useState(passwords?.ssha512 ?? true)
    const [enableNtHash, setNtHash] = useState(passwords?.ntHash ?? false)
    const [enableCleartext, setCleartext] = useState(passwords?.clearText ?? false)
    const [password, setPassword] = useState("")

    const { mutate } = useSWRConfig()
    const { trigger: updatePasswords } = useSWRMutation(
        ["passwords", "update", user.username],
        async () => {
            if (!password || password.length === 0) {
                throw new Error("Password is empty")
            }

            await updateUserPasswords(user.username, {
                clearText: enableCleartext ? password : null,
                ntHash: enableNtHash ? await nthash(password) : null,
                ssha512: enableSsha512 ? await ssha512(password) : null,
            })
        },
        {
            onError: (error) => {
                notifyError("Failed to update passwords", String(error))
            },
            onSuccess: () => {
                notifySuccess("Passwords updated")
                setPassword("")
                mutate(["passwords", "list"]).catch(() => {
                    /**/
                })
            },
        },
    )

    const { trigger: deleteThisUser } = useSWRMutation(
        ["users", "delete", user.username],
        async () => {
            await deleteUser(user.username)
        },
        {
            onError: (error) => {
                notifyError("Failed to delete user", String(error))
            },
            onSuccess: () => {
                notifySuccess("User deleted")
                mutate(["users", "list"]).catch(() => {
                    /**/
                })
            },
        },
    )

    const { notifyError, notifySuccess } = useNotifications()

    return (
        <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Person />
                    <Typography
                        variant="h2"
                        sx={{
                            fontFamily: "monospace",
                            fontSize: "1.2em",
                            lineHeight: "1.5em",
                        }}
                    >
                        {user.username}
                    </Typography>
                    {passwords && (
                        <Stack direction="row" spacing={1}>
                            <SupportedMethodChip method="EAP-PEAP-GTC" short="gtc" status={gtc} />
                            <SupportedMethodChip method="EAP-PEAP-MSCHAPv2" short="mschapv2" status={mschapv2} />
                        </Stack>
                    )}
                </Stack>
            </AccordionSummary>
            <AccordionDetails>
                <Grid container direction="column" spacing={2}>
                    <Grid item>
                        <Stack direction="column" spacing={2}>
                            <Typography>Current Password Hashes</Typography>
                            <Stack direction="row" spacing={1}>
                                <PasswordHashChip status={passwords?.ssha512 === true} method="SSHA-512" />
                                <PasswordHashChip status={passwords?.ntHash === true} method="NT-Hash" />
                                <PasswordHashChip status={passwords?.clearText === true} method="Clear Text" />
                            </Stack>
                        </Stack>
                    </Grid>
                    <Grid item>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault()
                                updatePasswords().catch(() => {
                                    /* */
                                })
                            }}
                        >
                            <Stack spacing={2}>
                                <Typography>Update Password</Typography>
                                <TextField
                                    placeholder="(new password)"
                                    type="password"
                                    variant="standard"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value)
                                    }}
                                />
                                <Stack direction="row" spacing={2}>
                                    <Tooltip title="Supports EAP-PEAP-GTC">
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={enableSsha512}
                                                    onChange={(e) => {
                                                        setSsha512(e.target.checked)
                                                    }}
                                                />
                                            }
                                            label="SSHA-512"
                                        />
                                    </Tooltip>
                                    <Tooltip title="Supports EAP-PEAP-GTC and MSCHAPv2">
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={enableNtHash}
                                                    onChange={(e) => {
                                                        setNtHash(e.target.checked)
                                                    }}
                                                />
                                            }
                                            label="NT-Hash"
                                        />
                                    </Tooltip>
                                    <Tooltip title="Supports all EAP methods, insecure unencrypted">
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={enableCleartext}
                                                    onChange={(e) => {
                                                        setCleartext(e.target.checked)
                                                    }}
                                                />
                                            }
                                            label={
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Typography>Clear Text</Typography>
                                                    {enableCleartext && <Warning color="warning" />}
                                                </Stack>
                                            }
                                        />
                                    </Tooltip>
                                </Stack>
                                <Stack direction="row" spacing={2}>
                                    <Button type="submit" startIcon={<Save />} variant="contained">
                                        Update
                                    </Button>
                                    <Button
                                        type="button"
                                        startIcon={<Delete />}
                                        variant="contained"
                                        color="error"
                                        onClick={() => {
                                            deleteThisUser().catch(() => {
                                                /**/
                                            })
                                        }}
                                    >
                                        Delete
                                    </Button>
                                </Stack>
                            </Stack>
                        </form>
                    </Grid>
                </Grid>
            </AccordionDetails>
        </Accordion>
    )
}

function AddUserForm() {
    const [username, setUsername] = useState("")

    const { mutate } = useSWRConfig()
    const { trigger } = useSWRMutation(
        ["users", "create", username],
        async () => {
            if (!username || username.length === 0) {
                throw new Error("Username is empty")
            }

            if (!UsernameType.is(username)) {
                throw new Error("Username is invalid")
            }

            await createUser(username)
        },
        {
            onError: (error) => {
                notifyError("Failed to create user", String(error))
            },
            onSuccess: () => {
                notifySuccess("User created")
                setUsername("")
                mutate(["users", "list"]).catch(() => {
                    /* */
                })
            },
        },
    )

    const { notifyError, notifySuccess } = useNotifications()

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault()
                trigger()
                    .then(() => {
                        setUsername("")
                    })
                    .catch(() => {
                        /* */
                    })
            }}
        >
            <Card>
                <CardHeader
                    title={
                        <Stack direction="row" spacing={1} alignItems="center">
                            <PersonAdd />
                            <Typography color="InactiveCaptionText">New User</Typography>
                        </Stack>
                    }
                />
                <CardContent>
                    <Stack direction="row" gap={2}>
                        <TextField
                            focused
                            error={!!username && !UsernameType.is(username)}
                            label="Username"
                            onChange={(e) => {
                                setUsername(e.target.value as Username)
                            }}
                            variant="standard"
                            size="small"
                        />
                        <Button type="submit" variant="contained">
                            Create
                        </Button>
                    </Stack>
                </CardContent>
            </Card>
        </form>
    )
}

export default function UserDashboardPage() {
    const { data: users } = useSWR(["users", "list"], async (): Promise<readonly RadiusUser[]> => {
        return await listUsers()
    })

    const { data: passwords } = useSWR(
        ["passwords", "list"],
        async (): Promise<Record<Username, RadiusUserPasswordStatus>> => {
            return Object.fromEntries(
                await listUserPasswords().then((passwords) =>
                    passwords.map((password) => [password.username, password]),
                ),
            )
        },
    )

    return (
        <Stack spacing={2}>
            {users?.map((user) => (
                <UserAccordion key={user.username} user={user} passwords={passwords?.[user.username]} />
            ))}
            <AddUserForm />
        </Stack>
    )
}
