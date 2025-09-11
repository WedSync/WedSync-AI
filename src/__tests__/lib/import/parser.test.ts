/**
 * Tests for Wedding Data Parser
 * WS-033: Comprehensive testing of parsing logic for various data formats
 */

import { describe, test, expect } from 'vitest'
import { WeddingDataParser } from '@/lib/import/parser'
const parser = new WeddingDataParser()
describe('WeddingDataParser', () => {
  describe('parseCoupleNames', () => {
    test('should parse "John & Jane Smith" format', () => {
      const result = parser.parseCoupleNames('John & Jane Smith')
      expect(result.bride).toBe('Jane Smith')
      expect(result.groom).toBe('John Smith')
      expect(result.combined).toBe('John & Jane Smith')
      expect(result.confidence).toBeGreaterThan(90)
    })
    test('should parse "John and Jane Smith" format', () => {
      const result = parser.parseCoupleNames('John and Jane Smith')
    test('should parse "Smith, John and Jane" format', () => {
      const result = parser.parseCoupleNames('Smith, John and Jane')
      expect(result.confidence).toBeGreaterThan(85)
    test('should parse "John Smith & Jane Doe" format', () => {
      const result = parser.parseCoupleNames('John Smith & Jane Doe')
      expect(result.bride).toBe('Jane Doe')
      expect(result.confidence).toBe(100)
    test('should handle single name as fallback', () => {
      const result = parser.parseCoupleNames('John Smith')
      expect(result.combined).toBe('John Smith')
      expect(result.confidence).toBe(50)
      expect(result.bride).toBeUndefined()
      expect(result.groom).toBeUndefined()
    test('should handle complex names with spaces', () => {
      const result = parser.parseCoupleNames('Mary Jane Watson & Peter Benjamin Parker')
      expect(result.bride).toBe('Peter Benjamin Parker')
      expect(result.groom).toBe('Mary Jane Watson')
  })
  describe('parseDate', () => {
    test('should parse MM/DD/YYYY format', () => {
      const result = parser.parseDate('06/15/2024')
      expect(result).toBeInstanceOf(Date)
      expect(result?.getMonth()).toBe(5) // June (0-indexed)
      expect(result?.getDate()).toBe(15)
      expect(result?.getFullYear()).toBe(2024)
    test('should parse M/D/YYYY format', () => {
      const result = parser.parseDate('6/15/2024')
      expect(result?.getMonth()).toBe(5)
    test('should parse "June 15, 2024" format', () => {
      const result = parser.parseDate('June 15, 2024')
    test('should parse DD/MM/YYYY format', () => {
      const result = parser.parseDate('15/06/2024')
      // Note: This might be ambiguous, test implementation behavior
    test('should parse YYYY-MM-DD format', () => {
      const result = parser.parseDate('2024-06-15')
    test('should return null for invalid dates', () => {
      expect(parser.parseDate('invalid date')).toBeNull()
      expect(parser.parseDate('13/45/2024')).toBeNull()
      expect(parser.parseDate('')).toBeNull()
    test('should handle various date separators', () => {
      expect(parser.parseDate('06-15-2024')).toBeInstanceOf(Date)
      expect(parser.parseDate('06/15/2024')).toBeInstanceOf(Date)
  describe('normalizeEmail', () => {
    test('should normalize email to lowercase', () => {
      expect(parser.normalizeEmail('JOHN@EXAMPLE.COM')).toBe('john@example.com')
    test('should trim whitespace', () => {
      expect(parser.normalizeEmail('  john@example.com  ')).toBe('john@example.com')
    test('should remove internal spaces', () => {
      expect(parser.normalizeEmail('john @ example.com')).toBe('john@example.com')
  describe('isValidEmail', () => {
    test('should validate correct email formats', () => {
      expect(parser.isValidEmail('john@example.com')).toBe(true)
      expect(parser.isValidEmail('john.doe@example.co.uk')).toBe(true)
      expect(parser.isValidEmail('john+test@example.com')).toBe(true)
    test('should reject invalid email formats', () => {
      expect(parser.isValidEmail('invalid')).toBe(false)
      expect(parser.isValidEmail('@example.com')).toBe(false)
      expect(parser.isValidEmail('john@')).toBe(false)
      expect(parser.isValidEmail('john@.com')).toBe(false)
  describe('normalizePhone', () => {
    test('should format 10-digit US phone numbers', () => {
      expect(parser.normalizePhone('1234567890')).toBe('(123) 456-7890')
      expect(parser.normalizePhone('123-456-7890')).toBe('(123) 456-7890')
      expect(parser.normalizePhone('(123) 456-7890')).toBe('(123) 456-7890')
    test('should preserve international numbers', () => {
      expect(parser.normalizePhone('+1234567890123')).toBe('+1234567890123')
      expect(parser.normalizePhone('+44 20 7946 0958')).toBe('+442079460958')
    test('should return null for invalid lengths', () => {
      expect(parser.normalizePhone('123')).toBeNull()
      expect(parser.normalizePhone('12345678901234567890')).toBeNull()
    test('should handle various formats', () => {
      expect(parser.normalizePhone('123.456.7890')).toBe('(123) 456-7890')
      expect(parser.normalizePhone('123 456 7890')).toBe('(123) 456-7890')
  describe('parseNumber', () => {
    test('should parse numeric values', () => {
      expect(parser.parseNumber(150)).toBe(150)
      expect(parser.parseNumber('150')).toBe(150)
      expect(parser.parseNumber('150.5')).toBe(150.5)
    test('should handle comma-separated numbers', () => {
      expect(parser.parseNumber('1,500')).toBe(1500)
      expect(parser.parseNumber('10,000.50')).toBe(10000.5)
    test('should return null for invalid numbers', () => {
      expect(parser.parseNumber('abc')).toBeNull()
      expect(parser.parseNumber('')).toBeNull()
      expect(parser.parseNumber(null)).toBeNull()
  describe('parseCurrency', () => {
    test('should parse currency values', () => {
      expect(parser.parseCurrency('$1500')).toBe(1500)
      expect(parser.parseCurrency('£2,500.50')).toBe(2500.5)
      expect(parser.parseCurrency('€1.000,50')).toBe(1000.5)
    test('should handle various currency symbols', () => {
      expect(parser.parseCurrency('¥1500')).toBe(1500)
      expect(parser.parseCurrency('₹2,500')).toBe(2500)
    test('should parse numbers without currency symbols', () => {
      expect(parser.parseCurrency('1500.50')).toBe(1500.5)
      expect(parser.parseCurrency(1500)).toBe(1500)
  describe('normalizePriority', () => {
    test('should normalize priority levels', () => {
      expect(parser.normalizePriority('urgent')).toBe('urgent')
      expect(parser.normalizePriority('URGENT')).toBe('urgent')
      expect(parser.normalizePriority('high')).toBe('high')
      expect(parser.normalizePriority('medium')).toBe('medium')
      expect(parser.normalizePriority('low')).toBe('low')
    test('should handle numeric priorities', () => {
      expect(parser.normalizePriority('1')).toBe('urgent')
      expect(parser.normalizePriority('2')).toBe('high')
      expect(parser.normalizePriority('3')).toBe('medium')
      expect(parser.normalizePriority('4')).toBe('low')
    test('should handle partial matches', () => {
      expect(parser.normalizePriority('urgent task')).toBe('urgent')
      expect(parser.normalizePriority('high priority')).toBe('high')
    test('should return null for unrecognized values', () => {
      expect(parser.normalizePriority('invalid')).toBeNull()
      expect(parser.normalizePriority('')).toBeNull()
  describe('normalizeStatus', () => {
    test('should normalize common status values', () => {
      expect(parser.normalizeStatus('booked')).toBe('booked')
      expect(parser.normalizeStatus('confirmed')).toBe('booked')
      expect(parser.normalizeStatus('lead')).toBe('lead')
      expect(parser.normalizeStatus('prospect')).toBe('lead')
      expect(parser.normalizeStatus('inquiry')).toBe('inquiry')
      expect(parser.normalizeStatus('cancelled')).toBe('cancelled')
      expect(parser.normalizeStatus('completed')).toBe('completed')
    test('should handle case variations', () => {
      expect(parser.normalizeStatus('BOOKED')).toBe('booked')
      expect(parser.normalizeStatus('Lead')).toBe('lead')
    test('should preserve unknown statuses', () => {
      expect(parser.normalizeStatus('custom status')).toBe('custom status')
  describe('parseRow', () => {
    test('should parse a complete row of wedding data', () => {
      const row = {
        couple_names: 'John & Jane Smith',
        email: 'john.smith@example.com',
        phone: '123-456-7890',
        wedding_date: '06/15/2024',
        venue: 'Grand Hotel',
        guests: '150',
        package_price: '$5000',
        status: 'booked',
        priority: 'high'
      }
      const mappings = {
        couple_names: 'couple_names',
        email: 'email',
        phone: 'phone',
        wedding_date: 'wedding_date',
        venue: 'venue_name',
        guests: 'guest_count',
        package_price: 'package_price',
        status: 'status',
        priority: 'priority_level'
      const result = parser.parseRow(row, mappings)
      expect(result.first_name).toBe('Jane')
      expect(result.last_name).toBe('Smith')
      expect(result.partner_first_name).toBe('John')
      expect(result.partner_last_name).toBe('Smith')
      expect(result.email).toBe('john.smith@example.com')
      expect(result.phone).toBe('(123) 456-7890')
      expect(result.wedding_date).toBeInstanceOf(Date)
      expect(result.venue_name).toBe('Grand Hotel')
      expect(result.guest_count).toBe(150)
      expect(result.package_price).toBe(5000)
      expect(result.status).toBe('booked')
      expect(result.priority_level).toBe('high')
      expect(result.parse_confidence).toBeGreaterThan(80)
      expect(result.warnings).toHaveLength(0)
    test('should generate warnings for problematic data', () => {
        couple_names: 'Unknown Format Name',
        email: 'invalid-email',
        phone: '123',
        wedding_date: 'invalid-date'
        wedding_date: 'wedding_date'
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.parse_confidence).toBeLessThan(100)
  describe('parseRows', () => {
    test('should parse multiple rows and provide summary', () => {
      const rows = [
        {
          couple: 'John & Jane Smith',
          email: 'john@example.com',
          date: '06/15/2024'
        },
          couple: 'Bob & Alice Johnson',
          email: 'bob@example.com',
          date: '07/20/2024'
        }
      ]
        couple: 'couple_names',
        date: 'wedding_date'
      const result = parser.parseRows(rows, mappings)
      expect(result.data).toHaveLength(2)
      expect(result.summary.total).toBe(2)
      expect(result.summary.successful).toBeGreaterThan(0)
      expect(result.summary.averageConfidence).toBeGreaterThan(0)
    test('should handle empty input', () => {
      const result = parser.parseRows([], {})
      
      expect(result.data).toHaveLength(0)
      expect(result.summary.total).toBe(0)
      expect(result.summary.successful).toBe(0)
})
