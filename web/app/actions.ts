"use server"

export async function reload(): Promise<void> {
    await fetch(`http://localhost:8000/api/v1/radiusd/reload`, {
        method: "POST",
    })
}
