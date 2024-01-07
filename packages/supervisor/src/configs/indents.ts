export function dedent(input: string): string {
    const lines = input.split("\n")

    // find the minimum indentation
    const minIndent = lines.reduce(
        (minimum: number, line: string) => (line.trim().length > 0 ? Math.min(minimum, line.search(/\S/)) : minimum),
        Infinity,
    )

    // remove the minimum indentation from each line
    return lines.map((line: string) => (line.trim().length > 0 ? line.slice(minIndent) : line)).join("\n")
}
