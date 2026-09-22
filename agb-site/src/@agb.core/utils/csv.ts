/**
 * Minimal CSV export — replaces the `@molteni/export-csv` dependency, which
 * five components each instantiated to dump the table they were showing.
 */
export interface CsvColumn<T> {
  header: string
  /** Property name, or a projection for computed/joined values. */
  value: keyof T | ((row: T) => unknown)
}

const escapeCell = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  const text = Array.isArray(value) ? value.join('; ') : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const toCsv = <T>(rows: T[], columns: CsvColumn<T>[]): string => {
  const header = columns.map(column => escapeCell(column.header)).join(',')
  const body = rows.map(row =>
    columns
      .map(column =>
        escapeCell(typeof column.value === 'function' ? column.value(row) : row[column.value])
      )
      .join(',')
  )

  return [header, ...body].join('\n')
}

export const downloadCsv = <T>(rows: T[], columns: CsvColumn<T>[], filename: string): void => {
  // BOM so Excel reads the file as UTF-8 rather than the local code page.
  const blob = new Blob(['\uFEFF', toCsv(rows, columns)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
