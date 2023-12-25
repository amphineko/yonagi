"use client"

import { Tab, Tabs } from "@mui/material"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo } from "react"
import { QueryClient, QueryClientProvider } from "react-query"

const queryClient = new QueryClient()

function KeyedLinkTab({ href, label }: { href: string; key: string; label: string }): JSX.Element {
    return <Tab LinkComponent={Link} href={href} label={label} />
}

export function RootClientLayout({ children }: { children: React.ReactNode }): JSX.Element {
    const pathname = usePathname()
    const router = useRouter()

    const tabs = {
        "/clients": "Clients",
        "/mpsks": "MPSKs",
    }
    const currentTab = Object.keys(tabs).find((key) => pathname.startsWith(key)) ?? ""
    const currentTabIndex = Object.keys(tabs).indexOf(currentTab)

    const tabNodes = useMemo(
        () => Object.entries(tabs).map(([href, label]) => <KeyedLinkTab href={href} key={href} label={label} />),
        [tabs],
    )

    useEffect(() => {
        const defaultTab = Object.keys(tabs).pop()
        if (currentTab === "" && defaultTab) {
            router.push(defaultTab)
        }
    })

    return (
        <QueryClientProvider client={queryClient}>
            <Tabs aria-label="Navigation Tabs" role="navigation" value={currentTabIndex}>
                {...tabNodes}
            </Tabs>
            {children}
        </QueryClientProvider>
    )
}
