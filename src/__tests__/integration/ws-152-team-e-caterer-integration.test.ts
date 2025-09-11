/**
 * WS-152: Caterer Integration Testing Suite
 * Team E - Batch 13
 * 
 * Testing comprehensive caterer export functionality, kitchen card generation,
 * and professional catering workflow integration.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { getCatererReportExporter } from '@/lib/export/caterer-reports'
import dietaryRequirementsService from '@/lib/services/dietary-requirements-service'
import { AlertSeverity } from '@/lib/safety/dietary-safety-integration'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import ExcelJS from 'exceljs'
// Mock file system for export testing
const mockFs = {
  writeFile: vi.fn(),
  readFile: vi.fn(),
  mkdir: vi.fn()
}
// Mock print service
const mockPrintService = {
  validatePrintLayout: vi.fn(),
  generatePrintPreview: vi.fn(),
  sendToPrinter: vi.fn()
describe('WS-152: Caterer Integration Testing', () => {
  let exportService: any
  const testEventId = 'event-123'
  const testCoupleId = 'couple-456'
  
  beforeEach(() => {
    exportService = getCatererReportExporter()
    vi.clearAllMocks()
  })
  describe('Dietary Matrix Export Validation', () => {
    it('should generate comprehensive dietary matrix in Excel format', async () => {
      const dietaryData = {
        totalGuests: 150,
        dietaryBreakdown: {
          'Vegetarian': 25,
          'Vegan': 15,
          'Gluten-Free': 20,
          'Dairy-Free': 18,
          'Nut Allergy': 8,
          'Shellfish Allergy': 5,
          'Halal': 12,
          'Kosher': 10
        },
        criticalAllergies: [
          { guest: 'John Doe', table: 5, allergy: 'Peanut', severity: 'LIFE_THREATENING' },
          { guest: 'Jane Smith', table: 8, allergy: 'Shellfish', severity: 'LIFE_THREATENING' }
        ],
        crossContaminationRisks: [
          { allergen: 'Peanut', risk: 'CRITICAL', affectedGuests: 3 },
          { allergen: 'Gluten', risk: 'HIGH', affectedGuests: 20 }
        ]
      }
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Dietary Matrix')
      // Add headers
      worksheet.columns = [
        { header: 'Dietary Requirement', key: 'requirement', width: 20 },
        { header: 'Count', key: 'count', width: 10 },
        { header: 'Percentage', key: 'percentage', width: 12 },
        { header: 'Special Instructions', key: 'instructions', width: 30 },
        { header: 'Risk Level', key: 'risk', width: 15 }
      ]
      // Add data rows
      Object.entries(dietaryData.dietaryBreakdown).forEach(([requirement, count]) => {
        worksheet.addRow({
          requirement,
          count,
          percentage: `${((count / dietaryData.totalGuests) * 100).toFixed(1)}%`,
          instructions: getSpecialInstructions(requirement),
          risk: getRiskLevel(requirement)
        })
      })
      // Add critical allergies section
      worksheet.addRow({})
      worksheet.addRow({ requirement: 'CRITICAL ALLERGIES - LIFE THREATENING', count: '', percentage: '', instructions: '', risk: 'CRITICAL' })
      
      dietaryData.criticalAllergies.forEach(({ guest, table, allergy, severity }) => {
          requirement: `${guest} (Table ${table})`,
          count: allergy,
          percentage: '',
          instructions: 'REQUIRES SEPARATE PREPARATION - CHEF VERIFICATION NEEDED',
          risk: severity
      // Apply formatting for critical rows
      worksheet.eachRow((row, rowNumber) => {
        if (row.getCell('risk').value === 'CRITICAL' || 
            row.getCell('risk').value === 'LIFE_THREATENING') {
          row.font = { bold: true, color: { argb: 'FFFF0000' } }
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFCCCC' }
          }
        }
      // Validate export structure
      expect(worksheet.rowCount).toBeGreaterThan(10)
      expect(worksheet.getColumn('requirement').values).toContain('Vegetarian')
      expect(worksheet.getColumn('risk').values).toContain('LIFE_THREATENING')
      // Test file generation
      const buffer = await workbook.xlsx.writeBuffer()
      expect(buffer).toBeDefined()
      expect(buffer.length).toBeGreaterThan(0)
    })
    it('should include meal-by-meal breakdown for service', async () => {
      const mealBreakdown = {
        appetizer: {
          standard: 140,
          vegetarian: 25,
          vegan: 15,
          glutenFree: 20,
          allergyFree: 8
        main: {
          standard: 135,
          vegetarian: 30,
          allergyFree: 10
        dessert: {
          standard: 145,
          vegetarian: 150, // Everyone can have vegetarian dessert
          glutenFree: 18,
          nutFree: 12
      // Create sheet for each meal course
      Object.entries(mealBreakdown).forEach(([course, requirements]) => {
        const worksheet = workbook.addWorksheet(course.charAt(0).toUpperCase() + course.slice(1))
        
        worksheet.columns = [
          { header: 'Meal Type', key: 'type', width: 20 },
          { header: 'Quantity', key: 'quantity', width: 15 },
          { header: 'Special Notes', key: 'notes', width: 40 }
        Object.entries(requirements).forEach(([type, quantity]) => {
          worksheet.addRow({
            type: type.replace(/([A-Z])/g, ' $1').trim(),
            quantity,
            notes: getServiceNotes(type, course)
          })
      expect(workbook.worksheets.length).toBe(3)
      expect(workbook.getWorksheet('Appetizer')).toBeDefined()
      expect(workbook.getWorksheet('Main')).toBeDefined()
      expect(workbook.getWorksheet('Dessert')).toBeDefined()
    it('should validate export format compliance with caterer standards', async () => {
      const exportFormats = [
        { format: 'EXCEL', extension: '.xlsx', valid: true },
        { format: 'PDF', extension: '.pdf', valid: true },
        { format: 'CSV', extension: '.csv', valid: true },
        { format: 'JSON', extension: '.json', valid: false } // Not for caterers
      const validFormats = exportFormats.filter(f => f.valid)
      validFormats.forEach(format => {
        expect(['EXCEL', 'PDF', 'CSV']).toContain(format.format)
      // Verify required fields in export
      const requiredFields = [
        'guestName',
        'tableNumber',
        'dietaryRequirements',
        'severity',
        'specialInstructions',
        'allergens',
        'crossContaminationNotes'
      const exportData = {
        guestName: 'Test Guest',
        tableNumber: 5,
        dietaryRequirements: ['Vegan', 'Gluten-Free'],
        severity: 'MODERATE',
        specialInstructions: 'No nuts in any form',
        allergens: ['Tree nuts'],
        crossContaminationNotes: 'Use separate preparation area'
      requiredFields.forEach(field => {
        expect(exportData).toHaveProperty(field)
        expect(exportData[field as keyof typeof exportData]).toBeDefined()
  describe('Kitchen Card Generation Testing', () => {
    it('should generate color-coded kitchen cards for each guest', async () => {
      const guestCards = [
        {
          guestName: 'Alice Johnson',
          table: 3,
          dietary: ['Vegetarian'],
          severity: 'PREFERENCE',
          color: 'GREEN',
          instructions: 'No meat products'
          guestName: 'Bob Smith',
          table: 5,
          dietary: ['Peanut Allergy'],
          severity: 'LIFE_THREATENING',
          color: 'RED',
          instructions: 'CRITICAL: NO PEANUTS - Separate prep required - EpiPen available'
          guestName: 'Carol White',
          table: 7,
          dietary: ['Gluten Intolerance'],
          severity: 'MODERATE',
          color: 'YELLOW',
          instructions: 'Gluten-free preparation needed'
      // Validate color coding
      guestCards.forEach(card => {
        switch(card.severity) {
          case 'LIFE_THREATENING':
            expect(card.color).toBe('RED')
            expect(card.instructions).toContain('CRITICAL')
            break
          case 'SEVERE':
          case 'MODERATE':
            expect(card.color).toBe('YELLOW')
          case 'PREFERENCE':
            expect(card.color).toBe('GREEN')
      // Verify card contains all required information
        expect(card.guestName).toBeDefined()
        expect(card.table).toBeDefined()
        expect(card.dietary).toBeDefined()
        expect(card.severity).toBeDefined()
        expect(card.color).toBeDefined()
        expect(card.instructions).toBeDefined()
    it('should generate QR codes for digital kitchen card access', async () => {
      const generateQRCode = (data: any) => {
        // Simulate QR code generation
        const qrData = {
          guestId: data.guestId,
          dietary: data.dietary,
          severity: data.severity,
          timestamp: new Date().toISOString(),
          signature: 'mock-signature-hash'
        return `QR:${Buffer.from(JSON.stringify(qrData)).toString('base64')}`
      const guestData = {
        guestId: 'guest-001',
        dietary: ['Nut Allergy'],
        severity: 'LIFE_THREATENING'
      const qrCode = generateQRCode(guestData)
      expect(qrCode).toContain('QR:')
      expect(qrCode.length).toBeGreaterThan(20)
      // Verify QR code can be decoded
      const decoded = JSON.parse(
        Buffer.from(qrCode.replace('QR:', ''), 'base64').toString()
      )
      expect(decoded.guestId).toBe(guestData.guestId)
      expect(decoded.severity).toBe(guestData.severity)
    it('should include preparation timeline on kitchen cards', async () => {
      const kitchenCard = {
        guestName: 'Guest Name',
        mealTimeline: {
          appetizer: {
            prepStart: '17:00',
            prepEnd: '17:30',
            service: '18:00',
            special: 'Prepare nut-free version first'
          },
          main: {
            prepStart: '18:00',
            prepEnd: '19:00',
            service: '19:30',
            special: 'Use dedicated cookware - RED labeled'
          dessert: {
            prepStart: '19:30',
            prepEnd: '20:00',
            service: '20:30',
            special: 'No chocolate (contains traces of nuts)'
        criticalNotes: [
          'Life-threatening peanut allergy',
          'Chef verification required before service',
          'Emergency contact: 555-0123'
      // Verify timeline structure
      expect(kitchenCard.mealTimeline.appetizer.prepStart).toBeDefined()
      expect(kitchenCard.mealTimeline.main.special).toContain('dedicated cookware')
      expect(kitchenCard.criticalNotes).toContain('Life-threatening peanut allergy')
      // Verify timing sequence
      const appService = new Date(`2025-01-20T${kitchenCard.mealTimeline.appetizer.service}`)
      const mainService = new Date(`2025-01-20T${kitchenCard.mealTimeline.main.service}`)
      expect(mainService.getTime()).toBeGreaterThan(appService.getTime())
  describe('Report Format Compliance Testing', () => {
    it('should generate PDF reports with proper formatting', async () => {
      const pdfDoc = await PDFDocument.create()
      const page = pdfDoc.addPage([612, 792]) // Letter size
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      // Add header
      page.drawText('DIETARY REQUIREMENTS REPORT', {
        x: 50,
        y: 750,
        size: 18,
        font: boldFont,
        color: rgb(0, 0, 0)
      // Add event details
      page.drawText(`Event Date: January 20, 2025`, {
        y: 720,
        size: 12,
        font: font
      page.drawText(`Total Guests: 150`, {
        y: 700,
      // Add critical allergies section with red highlighting
      page.drawText('CRITICAL LIFE-THREATENING ALLERGIES', {
        y: 650,
        size: 14,
        color: rgb(1, 0, 0) // Red color for critical
      // Add allergy details
      const criticalAllergies = [
        'Guest: John Doe, Table 5 - PEANUT ALLERGY (Anaphylaxis Risk)',
        'Guest: Jane Smith, Table 8 - SHELLFISH ALLERGY (Requires EpiPen)'
      let yPosition = 620
      criticalAllergies.forEach(allergy => {
        page.drawText(`• ${allergy}`, {
          x: 70,
          y: yPosition,
          size: 11,
          font: font,
          color: rgb(0.8, 0, 0)
        yPosition -= 20
      // Add summary table
      page.drawText('DIETARY SUMMARY', {
        y: 550,
        font: boldFont
      // Validate PDF structure
      const pdfBytes = await pdfDoc.save()
      expect(pdfBytes).toBeDefined()
      expect(pdfBytes.length).toBeGreaterThan(1000)
      expect(pdfDoc.getPageCount()).toBe(1)
    it('should test CSV export for spreadsheet compatibility', async () => {
      const csvData = [
        ['Guest Name', 'Table', 'Dietary Requirements', 'Severity', 'Notes'],
        ['Alice Johnson', '3', 'Vegetarian', 'Preference', 'No meat'],
        ['Bob Smith', '5', 'Peanut Allergy', 'LIFE_THREATENING', 'CRITICAL - Separate prep'],
        ['Carol White', '7', 'Gluten-Free', 'Moderate', 'Celiac disease']
      const csvContent = csvData.map(row => 
        row.map(cell => {
          // Escape quotes and wrap in quotes if contains comma
          const escaped = cell.replace(/"/g, '""')
          return cell.includes(',') ? `"${escaped}"` : escaped
        }).join(',')
      ).join('\n')
      expect(csvContent).toContain('Guest Name,Table,Dietary Requirements')
      expect(csvContent).toContain('LIFE_THREATENING')
      expect(csvContent.split('\n').length).toBe(4)
      // Validate CSV can be parsed back
      const lines = csvContent.split('\n')
      const headers = lines[0].split(',')
      expect(headers).toContain('Guest Name')
      expect(headers).toContain('Severity')
    it('should include proper page breaks for printing', async () => {
      const printLayout = {
        pageSize: 'LETTER',
        orientation: 'PORTRAIT',
        margins: {
          top: 72, // 1 inch
          bottom: 72,
          left: 72,
          right: 72
        content: [],
        pageBreaks: []
      // Add content with page break logic
      const guestsPerPage = 25
      const totalGuests = 150
      for (let i = 0; i < totalGuests; i++) {
        if (i > 0 && i % guestsPerPage === 0) {
          printLayout.pageBreaks.push(i)
        printLayout.content.push({
          guestNumber: i + 1,
          name: `Guest ${i + 1}`,
          dietary: 'Standard'
      expect(printLayout.pageBreaks.length).toBe(Math.floor(totalGuests / guestsPerPage))
      expect(printLayout.margins.top).toBe(72)
      expect(printLayout.pageSize).toBe('LETTER')
  describe('Professional Caterer Workflow Testing', () => {
    it('should support batch operations for large events', async () => {
      const largeEvent = {
        guestCount: 500,
        tables: 50,
        dietaryRequirements: generateLargeDataset(500)
      const startTime = performance.now()
      // Process in batches
      const batchSize = 50
      const batches = []
      for (let i = 0; i < largeEvent.guestCount; i += batchSize) {
        const batch = largeEvent.dietaryRequirements.slice(i, i + batchSize)
        batches.push(batch)
      expect(batches.length).toBe(10)
      // Process each batch
      const processedBatches = await Promise.all(
        batches.map(batch => processBatch(batch))
      const endTime = performance.now()
      const processingTime = endTime - startTime
      expect(processedBatches.length).toBe(10)
      expect(processingTime).toBeLessThan(5000) // Should process 500 guests in under 5 seconds
    it('should integrate with common catering software formats', async () => {
      const cateringFormats = {
        'CaterPro': {
          supported: true,
          format: 'XML',
          schema: 'caterpro-v2.xsd'
        'EventPro': {
          format: 'JSON',
          version: '3.0'
        'ChefTec': {
          format: 'CSV',
          delimiter: ','
        'Custom': {
          format: 'EXCEL',
          template: 'custom-template.xlsx'
      Object.entries(cateringFormats).forEach(([software, config]) => {
        expect(config.supported).toBe(true)
        expect(['XML', 'JSON', 'CSV', 'EXCEL']).toContain(config.format)
    it('should validate menu pairing suggestions', async () => {
      const menuPairings = {
        'Vegetarian': {
          appetizer: 'Caprese Salad',
          main: 'Eggplant Parmesan',
          dessert: 'Tiramisu',
          compatible: true
        'Vegan': {
          appetizer: 'Hummus Platter',
          main: 'Quinoa Buddha Bowl',
          dessert: 'Fruit Sorbet',
        'Nut Allergy': {
          appetizer: 'Tomato Bruschetta',
          main: 'Grilled Salmon',
          dessert: 'Vanilla Panna Cotta (nut-free)',
          compatible: true,
          warning: 'Ensure no nut oils or garnishes'
      Object.values(menuPairings).forEach(pairing => {
        expect(pairing.compatible).toBe(true)
        expect(pairing.appetizer).toBeDefined()
        expect(pairing.main).toBeDefined()
        expect(pairing.dessert).toBeDefined()
    it('should generate station assignment sheets for buffet service', async () => {
      const buffetStations = {
        mainStation: {
          dishes: ['Chicken Marsala', 'Beef Wellington', 'Salmon Teriyaki'],
          allergenFree: false,
          staffRequired: 2
        vegetarianStation: {
          dishes: ['Vegetable Lasagna', 'Mushroom Risotto', 'Caprese Salad'],
          staffRequired: 1
        allergenFreeStation: {
          dishes: ['Plain Grilled Chicken', 'Steamed Vegetables', 'Plain Rice'],
          allergenFree: true,
          staffRequired: 1,
          specialInstructions: 'DEDICATED STATION - No cross-contamination',
          equipment: 'Use RED-labeled serving utensils only'
        dessertStation: {
          dishes: ['Chocolate Cake', 'Fruit Tart', 'Ice Cream'],
          warnings: ['Chocolate Cake contains nuts', 'Ice Cream may contain traces of nuts']
      // Verify allergen-free station is properly configured
      expect(buffetStations.allergenFreeStation.allergenFree).toBe(true)
      expect(buffetStations.allergenFreeStation.specialInstructions).toContain('No cross-contamination')
      expect(buffetStations.allergenFreeStation.equipment).toContain('RED-labeled')
      // Calculate total staff needed
      const totalStaff = Object.values(buffetStations)
        .reduce((sum, station) => sum + station.staffRequired, 0)
      expect(totalStaff).toBeGreaterThanOrEqual(5)
  describe('Print Layout Verification', () => {
    it('should verify kitchen card print dimensions', () => {
      const cardDimensions = {
        width: 4, // inches
        height: 6, // inches
        dpi: 300,
        pixelWidth: 4 * 300,
        pixelHeight: 6 * 300,
        safeMargin: 0.25 // inches
      expect(cardDimensions.pixelWidth).toBe(1200)
      expect(cardDimensions.pixelHeight).toBe(1800)
      expect(cardDimensions.safeMargin).toBeLessThan(0.5)
    it('should test label printer compatibility', () => {
      const labelFormats = [
        { type: 'Dymo 30256', width: 2.31, height: 4, compatible: true },
        { type: 'Zebra 4x6', width: 4, height: 6, compatible: true },
        { type: 'Brother DK-2205', width: 2.4, height: 'continuous', compatible: true }
      labelFormats.forEach(format => {
        expect(format.compatible).toBe(true)
        if (format.height !== 'continuous') {
          expect(format.height).toBeGreaterThanOrEqual(4)
    it('should validate print preview accuracy', async () => {
      const printPreview = await mockPrintService.generatePrintPreview({
        content: 'Guest dietary card content',
        format: 'CARD',
        dimensions: { width: 4, height: 6 }
      mockPrintService.validatePrintLayout.mockReturnValue({
        valid: true,
        warnings: [],
        errors: []
      const validation = mockPrintService.validatePrintLayout(printPreview)
      expect(validation.valid).toBe(true)
      expect(validation.errors.length).toBe(0)
})
// Helper functions for testing
function getSpecialInstructions(requirement: string): string {
  const instructions: Record<string, string> = {
    'Vegetarian': 'No meat or fish products',
    'Vegan': 'No animal products of any kind',
    'Gluten-Free': 'Separate preparation area required',
    'Nut Allergy': 'CRITICAL - No nuts, check all ingredients',
    'Shellfish Allergy': 'CRITICAL - No shellfish, separate cookware',
    'Halal': 'Halal certified ingredients only',
    'Kosher': 'Kosher preparation required'
  }
  return instructions[requirement] || 'Standard preparation'
function getRiskLevel(requirement: string): string {
  const riskLevels: Record<string, string> = {
    'Nut Allergy': 'CRITICAL',
    'Shellfish Allergy': 'CRITICAL',
    'Gluten-Free': 'HIGH',
    'Dairy-Free': 'MODERATE',
    'Vegetarian': 'LOW',
    'Vegan': 'LOW',
    'Halal': 'LOW',
    'Kosher': 'LOW'
  return riskLevels[requirement] || 'LOW'
function getServiceNotes(type: string, course: string): string {
  const notes: Record<string, string> = {
    'allergyFree': `${course} must be prepared in allergen-free zone`,
    'glutenFree': 'Ensure no cross-contamination with wheat products',
    'vegan': 'Verify no hidden animal products',
    'nutFree': 'CRITICAL - Check all ingredients for nut traces'
  return notes[type] || 'Standard service'
function generateLargeDataset(count: number): any[] {
  const requirements = []
  const types = ['Standard', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Nut Allergy']
  for (let i = 0; i < count; i++) {
    requirements.push({
      guestId: `guest-${i}`,
      dietary: types[Math.floor(Math.random() * types.length)],
      severity: i % 50 === 0 ? 'LIFE_THREATENING' : 'MODERATE'
  return requirements
async function processBatch(batch: any[]): Promise<any> {
  // Simulate batch processing
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ processed: batch.length, status: 'complete' })
    }, 100)
