import { Metadata } from "next"
import { ReactNode } from "react"

import { RootClientLayout } from "./clientLayout"

export const metadata: Metadata = {
    title: "Yonagi Web",
}

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
    return (
        <html lang="en">
            <body>
                <RootClientLayout>{children}</RootClientLayout>
            </body>
        </html>
    )
}
