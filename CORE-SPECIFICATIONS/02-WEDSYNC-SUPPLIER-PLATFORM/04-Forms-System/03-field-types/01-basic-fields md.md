# 01-basic-fields.md

## Purpose

Standard HTML input types with wedding-context enhancements and validation.

## Text Fields

### Single Line Text

- **Variants**: Standard, email, phone, URL
- **Validation**: Regex patterns, min/max length
- **Features**: Placeholder, default value, mask input
- **Wedding Use**: Names, addresses, social handles

### Multi-line Text

- **Features**: Auto-resize, character counter
- **Rich Text Option**: Bold, italic, lists
- **Limits**: Max 5000 characters
- **Wedding Use**: Special requests, dietary details, vows

### Email Field

- **Validation**: RFC 5322 compliant
- **Features**: Domain verification, typo detection
- **Multiple**: Support multiple emails with primary
- **Wedding Use**: Couple emails, parent contacts

### Phone Field

- **Format**: International with country code
- **Validation**: libphonenumber-js
- **Features**: Country selector, format preview
- **Wedding Use**: Emergency contacts, vendor coordination

## Selection Fields

### Dropdown/Select

- **Features**: Search, multi-select, groups
- **Data Source**: Static, dynamic, API
- **Wedding Use**: Venue selection, meal choices

### Radio Buttons

- **Layout**: Vertical, horizontal, grid
- **Features**: Other option with text
- **Wedding Use**: Ceremony type, reception style

### Checkboxes

- **Types**: Single, multiple, matrix
- **Features**: Select all, conditional display
- **Wedding Use**: Services needed, dietary restrictions

## Date & Time

### Date Picker

- **Features**: Calendar widget, relative dates
- **Validation**: Min/max, blackout dates
- **Format**: Localized display
- **Wedding Use**: Wedding date, RSVP deadline

### Time Picker

- **Format**: 12/24 hour, timezone aware
- **Features**: Duration, time slots
- **Wedding Use**: Ceremony time, vendor arrival

### Date Range

- **Features**: Start/end validation
- **Display**: Calendar or separate fields
- **Wedding Use**: Honeymoon, accommodation

## Numeric Fields

### Number Input

- **Features**: Min/max, step, decimals
- **Display**: Spinner, slider option
- **Wedding Use**: Guest count, budget

### Currency

- **Features**: Symbol, formatting, conversion
- **Validation**: Positive only option
- **Wedding Use**: Budget, vendor payments

### Percentage

- **Display**: Slider or input
- **Features**: Visual bar
- **Wedding Use**: Deposit, service charge