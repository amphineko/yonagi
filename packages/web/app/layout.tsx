import { Metadata } from "next"
import type * as React from "react"
import { ReactNode } from "react"

import { RootClientLayout } from "./clientLayout"

export const metadata: Metadata = {
    title: "Yonagi Web",
}

export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
    return (
        <html lang="en">
            <body>
                <RootClientLayout>{children}</RootClientLayout>
            </body>
        </html>
    )
}
