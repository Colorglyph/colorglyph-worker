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