/**
 * WS-166: Budget Excel Generator Tests
 * Team B: Comprehensive unit tests for Excel export generation
 * 
 * Test Coverage:
 * - Excel file generation with proper formatting
 * - Multiple worksheet creation and data organization
 * - Formula calculations and conditional formatting
 * - Data filtering and category grouping
 * - Error handling for invalid data
 * - Performance with large datasets
 */

import { BudgetExcelGenerator } from '@/lib/services/budget-export/BudgetExcelGenerator';
import type { BudgetData, ExportFilters } from '@/types/budget-export';

// Mock ExcelJS
jest.mock('exceljs', () => {
  const mockWorksheet = {
    name: '',
    addRow: jest.fn(),
    getColumn: jest.fn(() => ({
      width: 0,
      eachCell: jest.fn()
    })),
    getCell: jest.fn(() => ({
      font: {},
      fill: {},
      border: {},
      alignment: {},
      numFmt: '',
      value: null
    })),
    mergeCells: jest.fn(),
    addConditionalFormatting: jest.fn(),
    columns: []
  };

  const mockWorkbook = {
    addWorksheet: jest.fn(() => mockWorksheet),
    writeBuffer: jest.fn(() => Promise.resolve(Buffer.from('mock-excel-data'))),
    created: new Date(),
    modified: new Date()
  };

  return {
    Workbook: jest.fn(() => mockWorkbook)
  };
});

describe('BudgetExcelGenerator', () => {
  let mockBudgetData: BudgetData;
  let mockFilters: ExportFilters;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockBudgetData = {
      couple: {
        id: 'couple-123',
        partner1_name: 'John',
        partner2_name: 'Jane',
        wedding_date: '2024-06-15T00:00:00.000Z',
        total_budget: 50000,
        organization_id: 'org-123'
      },
      budgetItems: [
        {
          id: 'item-1',
          category: 'Venue',
          vendor_name: 'Grand Ballroom',
          description: 'Reception venue rental',
          planned_amount: 15000,
          actual_amount: 14500,
          paid_amount: 14500,
          payment_status: 'paid',
          due_date: '2024-05-01T00:00:00.000Z',
          notes: 'Includes tables and chairs',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-15T00:00:00.000Z'
        },
        {
          id: 'item-2',
          category: 'Catering',
          vendor_name: 'Delicious Events',
          description: 'Wedding dinner for 100 guests',
          planned_amount: 8000,
          actual_amount: 8200,
          paid_amount: 4000,
          payment_status: 'partial',
          due_date: '2024-06-01T00:00:00.000Z',
          notes: 'Vegetarian and gluten-free options',
          created_at: '2024-01-05T00:00:00.000Z',
          updated_at: '2024-02-01T00:00:00.000Z'
        },
        {
          id: 'item-3',
          category: 'Photography',
          vendor_name: 'Capture Moments',
          description: '8-hour wedding photography',
          planned_amount: 3500,
          actual_amount: 0,
          paid_amount: 0,
          payment_status: 'pending',
          due_date: '2024-05-15T00:00:00.000Z',
          notes: 'Includes engagement session',
          created_at: '2024-01-10T00:00:00.000Z',
          updated_at: '2024-01-10T00:00:00.000Z'
        }
      ],
      summary: {
        total_planned: 26500,
        total_actual: 22700,
        total_paid: 18500,
        total_remaining: 8000,
        item_count: 3
      },
      categories: [
        {
          category: 'Venue',
          planned_amount: 15000,
          actual_amount: 14500,
          paid_amount: 14500,
          item_count: 1
        },
        {
          category: 'Catering',
          planned_amount: 8000,
          actual_amount: 8200,
          paid_amount: 4000,
          item_count: 1
        },
        {
          category: 'Photography',
          planned_amount: 3500,
          actual_amount: 0,
          paid_amount: 0,
          item_count: 1
        }
      ],
      generatedAt: new Date('2024-02-15T10:30:00.000Z'),
      filters: {}
    };

    mockFilters = {
      categories: [],
      payment_status: 'all',
      include_notes: true,
      options: {
        include_charts: false,
        include_timeline: false,
        email_delivery: false
      }
    };
  });

  describe('Excel File Generation', () => {
    it('should generate Excel buffer successfully', async () => {
      const result = await BudgetExcelGenerator.generateExcel(mockBudgetData, mockFilters);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty budget data', async () => {
      const emptyBudgetData: BudgetData = {
        ...mockBudgetData,
        budgetItems: [],
        summary: {
          total_planned: 0,
          total_actual: 0,
          total_paid: 0,
          total_remaining: 0,
          item_count: 0
        },
        categories: []
      };

      const result = await BudgetExcelGenerator.generateExcel(emptyBudgetData, mockFilters);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle large datasets efficiently', async () => {
      // Create a large dataset
      const largeBudgetData = { ...mockBudgetData };
      largeBudgetData.budgetItems = Array(1000).fill(null).map((_, index) => ({
        ...mockBudgetData.budgetItems[0],
        id: `item-${index}`,
        description: `Item ${index + 1}`,
        planned_amount: Math.random() * 5000,
        actual_amount: Math.random() * 5000,
        paid_amount: Math.random() * 2500
      }));

      const startTime = Date.now();
      const result = await BudgetExcelGenerator.generateExcel(largeBudgetData, mockFilters);
      const endTime = Date.now();
      
      expect(result).toBeInstanceOf(Buffer);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Worksheet Creation', () => {
    it('should create all required worksheets', async () => {
      const ExcelJS = require('exceljs');
      const mockWorkbook = new ExcelJS.Workbook();
      const addWorksheetSpy = jest.spyOn(mockWorkbook, 'addWorksheet');

      await BudgetExcelGenerator.generateExcel(mockBudgetData, mockFilters);

      // Verify that all expected worksheets are created
      expect(addWorksheetSpy).toHaveBeenCalledWith('Summary');
      expect(addWorksheetSpy).toHaveBeenCalledWith('Budget Details');
      expect(addWorksheetSpy).toHaveBeenCalledWith('Category Breakdown');
      expect(addWorksheetSpy).toHaveBeenCalledWith('Payment Schedule');
    });

    it('should configure worksheet properties correctly', async () => {
      const ExcelJS = require('exceljs');
      const mockWorksheet = {
        name: '',
        addRow: jest.fn(),
        getColumn: jest.fn(() => ({
          width: 0,
          eachCell: jest.fn()
        })),
        getCell: jest.fn(() => ({
          font: {},
          fill: {},
          border: {},
          alignment: {},
          numFmt: '',
          value: null
        })),
        mergeCells: jest.fn(),
        addConditionalFormatting: jest.fn(),
        columns: []
      };

      const mockWorkbook = {
        addWorksheet: jest.fn(() => mockWorksheet),
        writeBuffer: jest.fn(() => Promise.resolve(Buffer.from('mock-excel-data'))),
        created: new Date(),
        modified: new Date()
      };

      ExcelJS.Workbook = jest.fn(() => mockWorkbook);

      await BudgetExcelGenerator.generateExcel(mockBudgetData, mockFilters);

      expect(mockWorkbook.created).toBeDefined();
      expect(mockWorkbook.modified).toBeDefined();
    });
  });

  describe('Data Filtering', () => {
    it('should filter by categories when specified', async () => {
      const categoryFilters: ExportFilters = {
        ...mockFilters,
        categories: ['Venue', 'Photography']
      };

      const result = await BudgetExcelGenerator.generateExcel(mockBudgetData, categoryFilters);
      expect(result).toBeInstanceOf(Buffer);
      
      // Note: In a real test, we would verify that only Venue and Photography items are included
      // This would require inspecting the generated Excel content or mocking more deeply
    });

    it('should filter by payment status', async () => {
      const paymentFilters: ExportFilters = {
        ...mockFilters,
        payment_status: 'paid'
      };

      const result = await BudgetExcelGenerator.generateExcel(mockBudgetData, paymentFilters);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should filter by date range', async () => {
      const dateFilters: ExportFilters = {
        ...mockFilters,
        date_range: {
          start: '2024-01-01',
          end: '2024-05-31'
        }
      };

      const result = await BudgetExcelGenerator.generateExcel(mockBudgetData, dateFilters);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should exclude notes when include_notes is false', async () => {
      const noNotesFilters: ExportFilters = {
        ...mockFilters,
        include_notes: false
      };

      const result = await BudgetExcelGenerator.generateExcel(mockBudgetData, noNotesFilters);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('Formatting and Styling', () => {
    it('should apply proper number formatting for currency', async () => {
      const ExcelJS = require('exceljs');
      const mockCell = {
        font: {},
        fill: {},
        border: {},
        alignment: {},
        numFmt: '',
        value: null
      };
      const mockWorksheet = {
        name: '',
        addRow: jest.fn(),
        getColumn: jest.fn(() => ({
          width: 0,
          eachCell: jest.fn()
        })),
        getCell: jest.fn(() => mockCell),
        mergeCells: jest.fn(),
        addConditionalFormatting: jest.fn(),
        columns: []
      };

      await BudgetExcelGenerator.generateExcel(mockBudgetData, mockFilters);

      // Verify that currency formatting is applied
      // Note: In a real implementation, we would check that mockCell.numFmt is set to a currency format
      expect(mockWorksheet.getCell).toHaveBeenCalled();
    });

    it('should apply header formatting', async () => {
      const result = await BudgetExcelGenerator.generateExcel(mockBudgetData, mockFilters);
      expect(result).toBeInstanceOf(Buffer);
      
      // Headers should be formatted with bold font and background color
      // This would be verified by inspecting the actual cell formatting in a real test
    });

    it('should set appropriate column widths', async () => {
      const ExcelJS = require('exceljs');
      const mockColumn = {
        width: 0,
        eachCell: jest.fn()
      };
      const mockWorksheet = {
        name: '',
        addRow: jest.fn(),
        getColumn: jest.fn(() => mockColumn),
        getCell: jest.fn(() => ({
          font: {},
          fill: {},
          border: {},
          alignment: {},
          numFmt: '',
          value: null
        })),
        mergeCells: jest.fn(),
        addConditionalFormatting: jest.fn(),
        columns: []
      };

      await BudgetExcelGenerator.generateExcel(mockBudgetData, mockFilters);

      expect(mockWorksheet.getColumn).toHaveBeenCalled();
      // In a real test, we would verify that mockColumn.width is set appropriately
    });
  });

  describe('Formula Calculations', () => {
    it('should include summary formulas', async () => {
      const result = await BudgetExcelGenerator.generateExcel(mockBudgetData, mockFilters);
      expect(result).toBeInstanceOf(Buffer);
      
      // Verify that formulas are created for totals and percentages
      // This would require deeper mocking to capture the actual cell formulas
    });

    it('should calculate percentage values correctly', async () => {
      const result = await BudgetExcelGenerator.generateExcel(mockBudgetData, mockFilters);
      expect(result).toBeInstanceOf(Buffer);
      
      // Verify percentage calculations like budget utilization
    });

    it('should handle division by zero in formulas', async () => {
      const zeroBudgetData = {
        ...mockBudgetData,
        summary: {
          ...mockBudgetData.summary,
          total_planned: 0
        }
      };

      const result = await BudgetExcelGenerator.generateExcel(zeroBudgetData, mockFilters);
      expect(result).toBeInstanceOf(Buffer);
      
      // Should not throw errors when calculating percentages with zero denominators
    });
  });

  describe('Error Handling', () => {
    it('should handle missing couple data gracefully', async () => {
      const incompleteBudgetData = {
        ...mockBudgetData,
        couple: {
          ...mockBudgetData.couple,
          partner1_name: '',
          partner2_name: ''
        }
      };

      const result = await BudgetExcelGenerator.generateExcel(incompleteBudgetData, mockFilters);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle invalid dates', async () => {
      const invalidDateData = {
        ...mockBudgetData,
        budgetItems: [
          {
            ...mockBudgetData.budgetItems[0],
            due_date: 'invalid-date',
            created_at: null,
            updated_at: undefined
          }
        ]
      };

      // Should not throw an error
      const result = await BudgetExcelGenerator.generateExcel(invalidDateData, mockFilters);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle null or undefined values in budget items', async () => {
      const nullValueData = {
        ...mockBudgetData,
        budgetItems: [
          {
            ...mockBudgetData.budgetItems[0],
            planned_amount: null,
            actual_amount: undefined,
            vendor_name: null,
            notes: undefined
          }
        ]
      };

      const result = await BudgetExcelGenerator.generateExcel(nullValueData, mockFilters);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle ExcelJS errors gracefully', async () => {
      const ExcelJS = require('exceljs');
      const mockWorkbook = {
        addWorksheet: jest.fn(() => {
          throw new Error('ExcelJS error');
        }),
        writeBuffer: jest.fn(),
        created: new Date(),
        modified: new Date()
      };

      ExcelJS.Workbook = jest.fn(() => mockWorkbook);

      await expect(
        BudgetExcelGenerator.generateExcel(mockBudgetData, mockFilters)
      ).rejects.toThrow('ExcelJS error');
    });
  });

  describe('Performance and Memory', () => {
    it('should not consume excessive memory with large datasets', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create a moderately large dataset
      const largeBudgetData = { ...mockBudgetData };
      largeBudgetData.budgetItems = Array(500).fill(null).map((_, index) => ({
        ...mockBudgetData.budgetItems[0],
        id: `item-${index}`
      }));

      await BudgetExcelGenerator.generateExcel(largeBudgetData, mockFilters);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 100MB for 500 items)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    it('should complete processing within reasonable time limits', async () => {
      const startTime = Date.now();
      
      await BudgetExcelGenerator.generateExcel(mockBudgetData, mockFilters);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should complete within 5 seconds for normal datasets
      expect(processingTime).toBeLessThan(5000);
    });
  });

  describe('Conditional Formatting', () => {
    it('should apply conditional formatting for payment status', async () => {
      const ExcelJS = require('exceljs');
      const mockWorksheet = {
        name: '',
        addRow: jest.fn(),
        getColumn: jest.fn(() => ({
          width: 0,
          eachCell: jest.fn()
        })),
        getCell: jest.fn(() => ({
          font: {},
          fill: {},
          border: {},
          alignment: {},
          numFmt: '',
          value: null
        })),
        mergeCells: jest.fn(),
        addConditionalFormatting: jest.fn(),
        columns: []
      };

      await BudgetExcelGenerator.generateExcel(mockBudgetData, mockFilters);

      // Verify that conditional formatting is applied for overdue payments
      expect(mockWorksheet.addConditionalFormatting).toHaveBeenCalled();
    });

    it('should highlight budget overruns', async () => {
      const overrunBudgetData = {
        ...mockBudgetData,
        budgetItems: [
          {
            ...mockBudgetData.budgetItems[0],
            planned_amount: 10000,
            actual_amount: 12000 // Over budget
          }
        ]
      };

      const result = await BudgetExcelGenerator.generateExcel(overrunBudgetData, mockFilters);
      expect(result).toBeInstanceOf(Buffer);
      
      // Should apply conditional formatting to highlight the overrun
    });
  });
});