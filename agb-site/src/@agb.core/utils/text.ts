/** Case-insensitive "does any field of this row contain the needle" filter. */
export const matchesAnyField = (row: unknown, needle: string): boolean => {
  if (!needle) return true

  const term = needle.toLowerCase()

  return Object.values(row as Record<string, unknown>).some(value => {
    if (value === null || value === undefined) return false
    return String(value).toLowerCase().includes(term)
  })
}

export const filterRows = <T>(rows: T[], needle: string): T[] =>
  needle ? rows.filter(row => matchesAnyField(row, needle)) : rows
