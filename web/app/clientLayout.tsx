"use client"

import { Notes, Password, Refresh, SvgIconComponent, WifiPassword } from "@mui/icons-material"
import { AppBar, Box, Button, Tab, Toolbar, Tooltip, Typography } from "@mui/material"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ReactNode, useEffect, useMemo } from "react"
import { QueryClient, QueryClientProvider, useMutation } from "react-query"

import { reload as doReload } from "./actions"

const queryClient = new QueryClient()

function ReloadButton(): JSX.Element {
    const { mutate: reload } = useMutation({
        mutationFn: doReload,
        mutationKey: ["index", "radiusd", "reload"],
    })

    return (
        <Button
            color="inherit"
            onClick={() => {
                reload()
            }}
        >
            <Tooltip title="Reload">
                <Refresh />
            </Tooltip>
        </Button>
    )
}

function CustomTab({
    href,
    icon: IconComponent,
    isSelected,
    label,
}: {
    href: string
    icon: SvgIconComponent
    isSelected: boolean
    key: string
    label: string
}): JSX.Element {
    const LinkComponent = useMemo(
        () =>
            ({ href }: { href: string }) => (
                <Button
                    color="inherit"
                    href={href}
                    startIcon={<IconComponent />}
                    variant={isSelected ? "contained" : "text"}
                >
                    {label}
                </Button>
            ),
        [IconComponent, isSelected, label],
    )

    return (
        <Link href={href} legacyBehavior passHref>
            <Tab LinkComponent={LinkComponent} />
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

export function RootClientLayout({ children }: { children: React.ReactNode }): JSX.Element {
    const pathname = usePathname()
    const router = useRouter()

    const tabs: Record<string, { label: string; icon: SvgIconComponent }> = useMemo(
        () => ({
            "/radiusd/logs": { label: "radiusd.log", icon: Notes },
            "/clients": { label: "NAS Clients", icon: WifiPassword },
            "/mpsks": { label: "Device MPSKs", icon: Password },
        }),
        [],
    )
    const currentTab = Object.keys(tabs).find((key) => pathname.startsWith(key)) ?? ""

    const tabNodes = useMemo(
        () =>
            Array.from(Object.entries(tabs)).map(([href, { label, icon }]) => (
                <Box sx={{ flexGrow: 0 }}>
                    <CustomTab href={href} icon={icon} isSelected={href === currentTab} key={href} label={label} />
                </Box>
            )),
        [currentTab, tabs],
    )

    useEffect(() => {
        const defaultTab = Object.keys(tabs).pop()
        if (currentTab === "" && defaultTab) {
            router.push(defaultTab)
        }
    })

    return (
        <QueryClientProvider client={queryClient}>
            <AppBar color="default" position="sticky">
                <Toolbar role="navigation" sx={{ gap: "1em" }} variant="dense">
                    {tabNodes}
                    <Box sx={{ display: "flex", flexGrow: 1, justifyContent: "end" }}>
                        <SiteTitle>yonagi-web</SiteTitle>
                    </Box>
                    <Box sx={{ flexGrow: 0 }}>
                        <ReloadButton />
                    </Box>
                </Toolbar>
            </AppBar>
            {children}
        </QueryClientProvider>
    )
}
