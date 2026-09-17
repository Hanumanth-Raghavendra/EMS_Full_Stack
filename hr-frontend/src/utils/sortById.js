export function sortById(items, idField) {
    return [...items].sort((a, b) => {
        const aId = Number(a?.[idField] ?? Number.MAX_SAFE_INTEGER)
        const bId = Number(b?.[idField] ?? Number.MAX_SAFE_INTEGER)

        return aId - bId
    })
}

export function sortByFields(items, fields) {
    return [...items].sort((a, b) => {
        for (const field of fields) {
            const aValue = Number(a?.[field] ?? Number.MAX_SAFE_INTEGER)
            const bValue = Number(b?.[field] ?? Number.MAX_SAFE_INTEGER)

            if (aValue !== bValue) {
                return aValue - bValue
            }
        }

        return 0
    })
}