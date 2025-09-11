/**
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import {
  seatingArrangementSchema,
  guestAssignmentSchema,
  tableCreateSchema,
  tableUpdateSchema,
  sanitizeGuestName,
  sanitizeTableName,
} from '@/lib/validations/seating-security';
describe('Seating Security Validations', () => {
  describe('guestAssignmentSchema', () => {
    it('validates correct guest assignment data', () => {
      const validData = {
        guestId: 'guest-123',
        tableId: 'table-456',
        coupleId: 'couple-789',
      };
      const result = guestAssignmentSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });
    it('rejects missing required fields', () => {
      const invalidData = {
        // Missing tableId and coupleId
      const result = guestAssignmentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(2); // Missing tableId and coupleId
    it('rejects empty string fields', () => {
        guestId: '',
    it('rejects excessively long IDs', () => {
        guestId: 'a'.repeat(101), // Over 100 characters
    it('allows valid ID formats', () => {
        guestId: 'guest-123_abc-def',
        tableId: 'table_456-xyz',
        coupleId: 'couple-789-abc_123',
  });
  describe('tableCreateSchema', () => {
    it('validates correct table creation data', () => {
        name: 'Head Table',
        capacity: 8,
        shape: 'round',
        position: { x: 100, y: 200 },
      const result = tableCreateSchema.safeParse(validData);
    it('validates with optional notes', () => {
        name: 'VIP Table',
        capacity: 6,
        shape: 'square',
        position: { x: 150, y: 250 },
        notes: 'Special dietary requirements table',
    it('rejects invalid table shapes', () => {
        name: 'Test Table',
        shape: 'triangle', // Invalid shape
      const result = tableCreateSchema.safeParse(invalidData);
    it('validates capacity constraints', () => {
      // Valid capacity
      let data = {
      expect(tableCreateSchema.safeParse(data).success).toBe(true);
      // Minimum capacity
      data.capacity = 1;
      // Maximum capacity
      data.capacity = 20;
      // Below minimum
      data.capacity = 0;
      expect(tableCreateSchema.safeParse(data).success).toBe(false);
      // Above maximum
      data.capacity = 21;
    it('validates position coordinates', () => {
        position: { x: 0, y: 0 }, // Minimum valid coordinates
      expect(tableCreateSchema.safeParse(validData).success).toBe(true);
      // Maximum coordinates
      validData.position = { x: 2000, y: 2000 };
      // Negative coordinates
      validData.position = { x: -1, y: 100 };
      expect(tableCreateSchema.safeParse(validData).success).toBe(false);
      // Excessive coordinates
      validData.position = { x: 100, y: 3000 };
    it('validates table name length and content', () => {
      const data = {
      // Valid name
      expect(tableCreateSchema.safeParse({ ...data, name: 'Head Table' }).success).toBe(true);
      // Empty name
      expect(tableCreateSchema.safeParse({ ...data, name: '' }).success).toBe(false);
      // Very long name
      expect(tableCreateSchema.safeParse({ 
        ...data, 
        name: 'a'.repeat(101) 
      }).success).toBe(false);
      // Name with special characters
        name: 'Table #1 - VIP' 
      }).success).toBe(true);
    it('validates notes field', () => {
      // Valid notes
        notes: 'This table has special requirements' 
      // Empty notes (should be valid)
        notes: '' 
      // Very long notes
        notes: 'a'.repeat(1001) 
  describe('tableUpdateSchema', () => {
    it('validates partial table updates', () => {
        id: 'table-123',
        name: 'Updated Table Name',
      const result = tableUpdateSchema.safeParse(validData);
    it('allows updating only specific fields', () => {
      // Only capacity update
        capacity: 10,
      expect(tableUpdateSchema.safeParse(data).success).toBe(true);
      // Only position update
      data = {
        position: { x: 300, y: 400 },
      // Multiple fields
        name: 'New Name',
        capacity: 12,
        notes: 'Updated notes',
    it('requires id and coupleId', () => {
      // Missing id
      let invalidData = {
        name: 'Test',
      expect(tableUpdateSchema.safeParse(invalidData).success).toBe(false);
      // Missing coupleId
      invalidData = {
    it('validates updated fields with same constraints as create', () => {
      const baseData = {
      // Invalid capacity
      expect(tableUpdateSchema.safeParse({ 
        ...baseData, 
        capacity: 0 
      // Invalid position
        position: { x: -1, y: 100 } 
      // Invalid notes length
  describe('seatingArrangementSchema', () => {
    it('validates complete seating arrangement data', () => {
        name: 'Final Seating Plan',
        tables: [
          {
            id: 'table-1',
            name: 'Head Table',
            capacity: 8,
            shape: 'round',
            position: { x: 100, y: 200 },
          },
        ],
        assignments: [
            guestId: 'guest-1',
            tableId: 'table-1',
      const result = seatingArrangementSchema.safeParse(validData);
    it('validates with empty tables and assignments', () => {
        name: 'Empty Arrangement',
        tables: [],
        assignments: [],
    it('validates arrangement name constraints', () => {
      expect(seatingArrangementSchema.safeParse({ 
        name: 'Wedding Day Seating' 
        name: '' 
      // Long name
        name: 'a'.repeat(201) 
    it('validates nested table and assignment data', () => {
        name: 'Test Arrangement',
            name: 'Table 1',
      expect(seatingArrangementSchema.safeParse(validData).success).toBe(true);
      // Invalid nested table
      validData.tables[0].capacity = 0; // Invalid
      expect(seatingArrangementSchema.safeParse(validData).success).toBe(false);
  describe('sanitizeGuestName', () => {
    it('removes HTML tags', () => {
      const maliciousInput = '<script>alert("xss")</script>John Doe';
      const sanitized = sanitizeGuestName(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('John Doe');
    it('removes dangerous attributes', () => {
      const maliciousInput = '<img src=x onerror=alert(1)>Jane Smith';
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).toContain('Jane Smith');
    it('preserves valid text content', () => {
      const validInput = 'José María González-Smith Jr.';
      const sanitized = sanitizeGuestName(validInput);
      expect(sanitized).toBe(validInput);
    it('handles empty and whitespace input', () => {
      expect(sanitizeGuestName('')).toBe('');
      expect(sanitizeGuestName('   ')).toBe('');
      expect(sanitizeGuestName('\n\t  \n')).toBe('');
    it('trims excessive whitespace', () => {
      const input = '  John   Doe  ';
      const sanitized = sanitizeGuestName(input);
      expect(sanitized).toBe('John Doe');
    it('handles special characters appropriately', () => {
      const input = 'Name with émojis 🎉 and àccénts';
      // Should preserve unicode characters
      expect(sanitized).toContain('émojis');
      expect(sanitized).toContain('àccénts');
      expect(sanitized).toContain('🎉');
    it('limits length to prevent abuse', () => {
      const longInput = 'A'.repeat(500) + ' Valid Name';
      const sanitized = sanitizeGuestName(longInput);
      expect(sanitized.length).toBeLessThanOrEqual(200);
    it('handles various XSS payloads', () => {
      const xssPayloads = [
        '<script>document.cookie</script>',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<svg onload=alert(1)>',
        '<img src=# onerror=alert(1)>',
        'data:text/html,<script>alert(1)</script>',
      ];
      xssPayloads.forEach(payload => {
        const result = sanitizeGuestName(payload + 'John Doe');
        expect(result).not.toContain('script');
        expect(result).not.toContain('javascript:');
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('onload');
        expect(result).toContain('John Doe');
      });
  describe('sanitizeTableName', () => {
    it('removes HTML tags from table names', () => {
      const maliciousInput = '<b>Head</b> Table <script>alert(1)</script>';
      const sanitized = sanitizeTableName(maliciousInput);
      expect(sanitized).not.toContain('<b>');
      expect(sanitized).toContain('Head');
      expect(sanitized).toContain('Table');
    it('preserves table numbering and special characters', () => {
      const input = 'Table #1 - VIP (Round)';
      const sanitized = sanitizeTableName(input);
      expect(sanitized).toBe(input);
    it('handles unicode table names', () => {
      const input = 'Mesa Principal 🎉';
      expect(sanitized).toContain('Mesa Principal');
    it('limits table name length', () => {
      const longInput = 'Very Long Table Name '.repeat(10);
      const sanitized = sanitizeTableName(longInput);
      expect(sanitized.length).toBeLessThanOrEqual(100);
    it('handles empty input gracefully', () => {
      expect(sanitizeTableName('')).toBe('');
      expect(sanitizeTableName('   ')).toBe('');
    it('removes dangerous CSS and style attributes', () => {
      const maliciousInput = '<div style="background:url(javascript:alert(1))">Table 1</div>';
      expect(sanitized).not.toContain('style');
      expect(sanitized).not.toContain('javascript');
      expect(sanitized).toContain('Table 1');
  describe('Edge Cases and Error Handling', () => {
    it('handles null and undefined inputs', () => {
      // These should not crash the validators
      expect(() => guestAssignmentSchema.safeParse(null)).not.toThrow();
      expect(() => guestAssignmentSchema.safeParse(undefined)).not.toThrow();
      expect(guestAssignmentSchema.safeParse(null).success).toBe(false);
      expect(guestAssignmentSchema.safeParse(undefined).success).toBe(false);
    it('handles non-object inputs', () => {
      expect(guestAssignmentSchema.safeParse('string').success).toBe(false);
      expect(guestAssignmentSchema.safeParse(123).success).toBe(false);
      expect(guestAssignmentSchema.safeParse(true).success).toBe(false);
      expect(guestAssignmentSchema.safeParse([]).success).toBe(false);
    it('sanitizers handle non-string inputs gracefully', () => {
      // Should handle these without crashing
      expect(() => sanitizeGuestName(null as unknown)).not.toThrow();
      expect(() => sanitizeGuestName(undefined as unknown)).not.toThrow();
      expect(() => sanitizeGuestName(123 as unknown)).not.toThrow();
      expect(sanitizeGuestName(null as unknown)).toBe('');
      expect(sanitizeGuestName(undefined as unknown)).toBe('');
    it('handles deeply nested malicious content', () => {
      const deeplyNested = '<div><span><script>alert(1)</script></span></div>John Doe';
      const sanitized = sanitizeGuestName(deeplyNested);
      expect(sanitized).not.toContain('<div>');
      expect(sanitized).not.toContain('<span>');
    it('validates position coordinates as numbers', () => {
      // String coordinates should fail
        position: { x: '100', y: '200' } 
      // NaN coordinates should fail
        position: { x: NaN, y: 100 } 
      // Infinity coordinates should fail
        position: { x: Infinity, y: 100 } 
});
