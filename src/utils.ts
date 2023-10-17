export function getRandomNumber(min: number, max: number) {
    // Ensure parameters are integers
    min = Math.ceil(min)
    max = Math.floor(max)

    // Return a random number between min and max (inclusive)
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export function chunkArray(array: any[], chunkSize: number) {
    const chunks = []

    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize))
    }

    return chunks
}

export function sortMapKeys(map: Map<any, any>) {
    // Convert the Map to an array of [key, value] pairs
    const entries = [...map.entries()];

    // Sort the array based on the keys
    entries.sort((a, b) => {
        if (a[0] < b[0])
            return -1

        if (a[0] > b[0])
            return 1

        return 0
    });

    // Create a new Map from the sorted array
    return new Map(entries)
}

export async function getGlyphHash(palette: number[], width: number) {
    const rgb_palette: number[] = []

    for (const color of palette) {
        rgb_palette.push(...[
            color >> 16,
            color >> 8 & 0xff,
            color & 0xff
        ])
    }

    rgb_palette.push(...[
        0,
        width >> 16,
        width >> 8 & 0xff,
        width & 0xff,
    ])

    const digest = new Uint8Array(
        await crypto.subtle.digest(
            { name: 'SHA-256' },
            new Uint8Array(rgb_palette)
        )
    )

    return [...digest]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('')
}