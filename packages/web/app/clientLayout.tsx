"use client"

import {
    BugReport,
    Error,
    Lock,
    Notes,
    Password,
    PowerSettingsNew,
    Refresh,
    StopCircle,
    SvgIconComponent,
    Traffic,
    WifiPassword,
} from "@mui/icons-material"
import {
    AppBar,
    Box,
    Button,
    Chip,
    IconButton,
    Stack,
    SxProps,
    Theme,
    Toolbar,
    Tooltip,
    Typography,
} from "@mui/material"
import CssBaseline from "@mui/material/CssBaseline"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { FC, JSX, PropsWithChildren, ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "react-query"

import { getStatus, reloadRadiusd, restartRadiusd } from "./actions"
import { NotificationList, NotificationProvider } from "../lib/notifications"

const queryClient = new QueryClient()

const humanizer = new Intl.RelativeTimeFormat("en", { numeric: "always", style: "short" })

function humanize(seconds: number) {
    if (seconds > -60) {
        return humanizer.format(seconds, "seconds")
    } else if (seconds > -3600) {
        return humanizer.format(Math.floor(seconds / 60), "minutes")
    } else if (seconds > -86400) {
        return humanizer.format(Math.floor(seconds / 3600), "hours")
    } else {
        return humanizer.format(Math.floor(seconds / 86400), "days")
    }
}

function RadiusdMenu(): JSX.Element {
    const queryClient = useQueryClient()
    const onSuccess = useCallback(async () => {
        await queryClient.invalidateQueries(["index", "radiusd", "status"])
    }, [queryClient])

    const { mutate: mutateReload } = useMutation({
        mutationFn: reloadRadiusd,
        mutationKey: ["index", "radiusd", "reload"],
        onSuccess,
    })

    const { mutate: mutateRestart } = useMutation({
        mutationFn: restartRadiusd,
        mutationKey: ["index", "radiusd", "restart"],
        onSuccess,
    })

    return (
        <Box>
            <IconButton
                color="inherit"
                onClick={() => {
                    mutateReload()
                }}
            >
                <Tooltip title="Reload">
                    <Refresh />
                </Tooltip>
            </IconButton>

            <IconButton
                color="inherit"
                onClick={() => {
                    mutateRestart()
                }}
            >
                <Tooltip title="Restart">
                    <PowerSettingsNew />
                </Tooltip>
            </IconButton>
        </Box>
    )
}

function StatusChip(): JSX.Element {
    const { data } = useQuery({
        queryFn: async () => await getStatus(),
        queryKey: ["index", "radiusd", "status"],
        refetchInterval: 60 * 1000,
    })

    const isRunning = data?.lastExitCode === undefined

    const [now, setNow] = useState(() => Date.now())
    const uptime = Math.floor(((data?.lastRestartedAt?.getTime() ?? now) - now) / 1000)

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now())
        }, 1000)

        return () => {
            clearInterval(interval)
        }
    }, [])

    return isRunning ? (
        <Tooltip title={`Radiusd is up since ${data?.lastRestartedAt?.toLocaleString()}`}>
            <Chip color="success" icon={<Traffic />} label={humanize(uptime)} variant="outlined"></Chip>
        </Tooltip>
    ) : data.lastExitCode === 0 ? (
        <Tooltip title={`Exited with code ${data.lastExitCode}`}>
            <Chip color="warning" icon={<StopCircle />} label="Stopped" variant="outlined" />
        </Tooltip>
    ) : (
        <Tooltip title={`Exited with code ${data.lastExitCode}`}>
            <Chip color="error" icon={<Error />} label="Failed" variant="outlined" />
        </Tooltip>
    )
}

function TabButton({
    href,
    icon: IconComponent,
    isSelected,
    label,
}: {
    href: string
    icon: SvgIconComponent
    isSelected: boolean
    label: string
}): JSX.Element {
    return (
        <Link href={href} legacyBehavior passHref>
            <Button
                aria-selected={isSelected}
                role="tab"
                startIcon={<IconComponent />}
                sx={{ color: isSelected ? "text.primary.light" : "text.secondary" }}
                variant={isSelected ? "contained" : "text"}
            >
                {label}
            </Button>
        </Link>
    )
}

function SiteTitle({ children }: { children: ReactNode }): JSX.Element {
    return (
        <Typography color="text.secondary" fontSize="1em" variant="h1">
            {children}
        </Typography>
    )
}

const darkTheme = createTheme({
    palette: {
        mode: "dark",
    },
})

function FlexBox({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }): JSX.Element {
    return <Box sx={{ display: "flex", ...sx }}>{children}</Box>
}

function ProviderReducer({ children, providers }: PropsWithChildren<{ providers: FC<PropsWithChildren>[] }>) {
    return providers.reduce((children, Provider) => {
        return <Provider>{children}</Provider>
    }, children)
}

export function RootClientLayout({ children }: { children: React.ReactNode }): JSX.Element {
    const pathname = usePathname()
    const router = useRouter()

    const tabs: Record<string, { label: string; icon: SvgIconComponent; hidden?: boolean }> = useMemo(
        () => ({
            "/radiusd/logs": { label: "radiusd.log", icon: Notes },
            "/clients": { label: "NAS Clients", icon: WifiPassword },
            "/mpsks": { label: "Device MPSKs", icon: Password },
            "/pki": { label: "PKI", icon: Lock },
            "/debug": { label: "Debug", icon: BugReport, hidden: true },
        }),
        [],
    )
    const currentTab = Object.keys(tabs).find((key) => pathname.startsWith(key)) ?? ""

    const tabNodes = useMemo(
        () =>
            Array.from(Object.entries(tabs)).map(([href, { label, hidden, icon }]) =>
                href === currentTab || !hidden ? (
                    <Box key={href} sx={{ flexGrow: 0 }}>
                        <TabButton href={href} icon={icon} isSelected={href === currentTab} label={label} />
                    </Box>
                ) : null,
            ),
        [currentTab, tabs],
    )

    useEffect(() => {
        const defaultTab = Object.keys(tabs).pop()
        if (currentTab === "" && defaultTab) {
            router.push(defaultTab)
        }
    })

    return (
        <ProviderReducer
            providers={[
                ({ children }) => <NotificationProvider>{children}</NotificationProvider>,
                ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
                ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
            ]}
        >
            <CssBaseline />
            <Stack spacing={1}>
                <AppBar color="default" position="sticky">
                    <Toolbar role="navigation" sx={{ gap: "1em" }} variant="dense">
                        {tabNodes}
                        <FlexBox key="title" sx={{ flexGrow: 1, justifyContent: "end" }}>
                            <SiteTitle>yonagi-web</SiteTitle>
                        </FlexBox>
                        <FlexBox key="status" sx={{ alignItems: "center", gap: "0.5em" }}>
                            <StatusChip />
                            <RadiusdMenu />
                        </FlexBox>
                    </Toolbar>
                </AppBar>
                <Box>{children}</Box>
            </Stack>
            <NotificationList />
        </ProviderReducer>
    )
}
