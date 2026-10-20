export interface ExportTable {
  name: string
  headers: string[]
  rows: string[][]
}

function xml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`
  return value
}

export function toCsv(tables: ExportTable[], emptyNote: string): string {
  return tables
    .map((table) => {
      const lines = [`# ${table.name}`, table.headers.map(csvCell).join(',')]
      if (!table.rows.length) lines.push(csvCell(emptyNote))
      else table.rows.forEach((row) => lines.push(row.map(csvCell).join(',')))
      return lines.join('\n')
    })
    .join('\n\n')
}

export function toWorkbook(tables: ExportTable[], emptyNote: string): string {
  const sheets = tables
    .map((table) => {
      const rows = table.rows.length ? table.rows : [[emptyNote]]
      const header = `<Row>${table.headers.map((cell) => `<Cell><Data ss:Type="String">${xml(cell)}</Data></Cell>`).join('')}</Row>`
      const body = rows
        .map((row) => `<Row>${row.map((cell) => `<Cell><Data ss:Type="String">${xml(cell)}</Data></Cell>`).join('')}</Row>`)
        .join('')
      return `<Worksheet ss:Name="${xml(table.name)}"><Table>${header}${body}</Table></Worksheet>`
    })
    .join('')
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${sheets}
</Workbook>`
}
