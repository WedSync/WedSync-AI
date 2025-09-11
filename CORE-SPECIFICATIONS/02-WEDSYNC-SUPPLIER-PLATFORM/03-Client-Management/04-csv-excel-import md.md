# 04-csv-excel-import.md

## Purpose

Provide bulletproof spreadsheet import functionality as this is the most common client data format.

## Supported Formats

- CSV (all delimiters: comma, tab, pipe, semicolon)
- Excel (.xlsx, .xls)
- Google Sheets (via CSV export)
- Numbers (via CSV export)

## Smart Detection

### Automatic Detection

- **Delimiter**: Use Papa Parse's auto-detection
- **Encoding**: UTF-8, Latin-1, Windows-1252
- **Headers**: First row detection with confidence scoring
- **Date Formats**: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
- **Phone Formats**: International number parsing

### Column Intelligence

- Detect 'couple names' variations (names, clients, couple)
- Identify email columns by @ symbol presence
- Find wedding dates by date patterns
- Recognize venue names by common terms
- Map package/service columns

## Data Transformation

### Name Parsing

- 'John & Jane Smith' → separate first names
- 'Smith, John and Jane' → reorder correctly
- Handle cultural naming (Asian, Hispanic)
- Extract titles (Dr., Rev., etc.)

### Date Handling

- Parse relative dates ('next June')
- Handle partial dates ('Summer 2025')
- Convert all to ISO format
- Flag ambiguous dates for review

### Contact Cleanup

- Validate email format
- Format phone numbers with country code
- Remove special characters
- Handle multiple emails/phones

## Error Handling

- Color-code issues (red=error, yellow=warning)
- Provide fix suggestions
- Allow row-by-row editing
- Option to download error report
- Skip invalid rows with logging

## Performance

- Stream large files (don't load all in memory)
- Show preview quickly (first 100 rows)
- Process in web worker to prevent UI blocking
- Chunk uploads for better progress tracking