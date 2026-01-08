/**
 * CSV Parser
 *
 * Parses CSV files and converts to standard format.
 * Supports various delimiters and formats.
 */

export class CSVParser {
  /**
   * Parse CSV data
   */
  async parse(
    content: string,
    options: {
      delimiter?: ',' | ';' | '\t'
      hasHeaders?: boolean
    } = {}
  ): Promise<any[]> {
    const delimiter = options.delimiter || ','
    const hasHeaders = options.hasHeaders !== false

    // Split into lines
    const lines = content.split(/\r?\n/).filter(line => line.trim())

    if (lines.length === 0) {
      throw new Error('CSV file is empty')
    }

    // Extract headers
    let headers: string[] = []
    let dataLines = lines

    if (hasHeaders) {
      headers = this.parseLine(lines[0], delimiter)
      dataLines = lines.slice(1)
    }

    // Parse data rows
    const rows: any[] = []
    for (const line of dataLines) {
      const values = this.parseLine(line, delimiter)

      if (values.length === 0) continue

      const row: any = {}

      if (hasHeaders) {
        for (let i = 0; i < headers.length; i++) {
          row[headers[i]] = values[i] || ''
        }
      } else {
        rows.push(values)
        continue
      }

      rows.push(row)
    }

    return rows
  }

  /**
   * Parse a single CSV line
   */
  private parseLine(line: string, delimiter: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"'
          i++
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes
        }
      } else if (char === delimiter && !inQuotes) {
        // Field separator
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    // Add last field
    result.push(current.trim())

    return result
  }

  /**
   * Detect CSV delimiter
   */
  static detectDelimiter(content: string): ',' | ';' | '\t' {
    const lines = content.split(/\r?\n/).slice(0, 10)
    let commaCount = 0
    let semicolonCount = 0
    let tabCount = 0

    for (const line of lines) {
      commaCount += (line.match(/,/g) || []).length
      semicolonCount += (line.match(/;/g) || []).length
      tabCount += (line.match(/\t/g) || []).length
    }

    if (tabCount > commaCount && tabCount > semicolonCount) return '\t'
    if (semicolonCount > commaCount) return ';'
    return ','
  }

  /**
   * Detect if content is CSV
   */
  static detectFormat(content: string): boolean {
    // Check for common CSV patterns
    const hasComma = content.includes(',')
    const hasSemicolon = content.includes(';')
    const hasTab = content.includes('\t')
    const hasMultipleLines = content.split(/\r?\n/).length > 1

    return (hasComma || hasSemicolon || hasTab) && hasMultipleLines
  }
}
