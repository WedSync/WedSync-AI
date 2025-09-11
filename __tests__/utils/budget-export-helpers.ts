/**
 * WS-166 Budget Export System - Data Integrity Validation Utilities
 * 
 * Provides specialized validation for financial accuracy, category completeness,
 * and data integrity across all export formats.
 */

interface BudgetItem {
  id: string;
  category: string;
  name: string;
  plannedCost: number;
  actualCost: number;
  vendor?: string;
  notes?: string;
  paymentStatus?: 'paid' | 'pending' | 'planned';
  dueDate?: string;
}

interface BudgetSummary {
  totalPlanned: number;
  totalActual: number;
  totalDifference: number;
  categoryBreakdown: Record<string, number>;
  paymentStatusBreakdown: Record<string, number>;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: BudgetSummary;
}

/**
 * Validates financial accuracy between source budget and export data
 */
export function validateFinancialAccuracy(
  sourceBudget: BudgetItem[],
  exportData: string | Buffer,
  format: 'csv' | 'pdf' | 'excel'
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Calculate source totals
  const sourceSummary = calculateBudgetSummary(sourceBudget);
  
  // Parse export data based on format
  const exportSummary = parseExportData(exportData, format);
  
  // Validate totals match
  if (Math.abs(sourceSummary.totalPlanned - exportSummary.totalPlanned) > 0.01) {
    errors.push(`Total planned mismatch: source ${sourceSummary.totalPlanned}, export ${exportSummary.totalPlanned}`);
  }
  
  if (Math.abs(sourceSummary.totalActual - exportSummary.totalActual) > 0.01) {
    errors.push(`Total actual mismatch: source ${sourceSummary.totalActual}, export ${exportSummary.totalActual}`);
  }
  
  // Validate category completeness
  const missingCategories = validateCategoryCompleteness(sourceBudget, exportSummary);
  if (missingCategories.length > 0) {
    errors.push(`Missing categories in export: ${missingCategories.join(', ')}`);
  }
  
  // Validate vendor information
  const vendorIssues = validateVendorInformation(sourceBudget, exportData, format);
  errors.push(...vendorIssues);
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: sourceSummary
  };
}

/**
 * Calculates comprehensive budget summary with all financial totals
 */
export function calculateBudgetSummary(budget: BudgetItem[]): BudgetSummary {
  const totalPlanned = budget.reduce((sum, item) => sum + item.plannedCost, 0);
  const totalActual = budget.reduce((sum, item) => sum + item.actualCost, 0);
  const totalDifference = totalActual - totalPlanned;
  
  // Category breakdown
  const categoryBreakdown: Record<string, number> = {};
  budget.forEach(item => {
    categoryBreakdown[item.category] = (categoryBreakdown[item.category] || 0) + item.plannedCost;
  });
  
  // Payment status breakdown
  const paymentStatusBreakdown: Record<string, number> = {};
  budget.forEach(item => {
    const status = item.paymentStatus || 'planned';
    paymentStatusBreakdown[status] = (paymentStatusBreakdown[status] || 0) + item.plannedCost;
  });
  
  return {
    totalPlanned: Math.round(totalPlanned * 100) / 100,
    totalActual: Math.round(totalActual * 100) / 100,
    totalDifference: Math.round(totalDifference * 100) / 100,
    categoryBreakdown,
    paymentStatusBreakdown
  };
}

/**
 * Validates that all wedding budget categories are present in export
 */
function validateCategoryCompleteness(
  sourceBudget: BudgetItem[],
  exportSummary: BudgetSummary
): string[] {
  const sourceCategories = new Set(sourceBudget.map(item => item.category));
  const exportCategories = new Set(Object.keys(exportSummary.categoryBreakdown));
  
  const missingCategories: string[] = [];
  sourceCategories.forEach(category => {
    if (!exportCategories.has(category)) {
      missingCategories.push(category);
    }
  });
  
  return missingCategories;
}

/**
 * Validates vendor information preservation in exports
 */
function validateVendorInformation(
  sourceBudget: BudgetItem[],
  exportData: string | Buffer,
  format: 'csv' | 'pdf' | 'excel'
): string[] {
  const errors: string[] = [];
  const exportText = exportData.toString();
  
  // Check that all vendor names appear in export
  const sourceVendors = sourceBudget
    .filter(item => item.vendor)
    .map(item => item.vendor!)
    .filter((vendor, index, arr) => arr.indexOf(vendor) === index);
  
  sourceVendors.forEach(vendor => {
    if (!exportText.includes(vendor)) {
      errors.push(`Missing vendor in export: ${vendor}`);
    }
  });
  
  return errors;
}

/**
 * Parses export data to extract financial summaries for validation
 */
function parseExportData(exportData: string | Buffer, format: 'csv' | 'pdf' | 'excel'): BudgetSummary {
  const dataString = exportData.toString();
  
  switch (format) {
    case 'csv':
      return parseCSVData(dataString);
    case 'pdf':
      return parsePDFData(dataString);
    case 'excel':
      return parseExcelData(exportData);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

function parseCSVData(csvContent: string): BudgetSummary {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  const plannedIndex = headers.findIndex(h => h.includes('planned'));
  const actualIndex = headers.findIndex(h => h.includes('actual'));
  const categoryIndex = headers.findIndex(h => h.includes('category'));
  
  let totalPlanned = 0;
  let totalActual = 0;
  const categoryBreakdown: Record<string, number> = {};
  
  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split(',');
    
    if (plannedIndex >= 0) {
      const planned = parseFloat(columns[plannedIndex]?.replace(/[\$,]/g, '') || '0');
      totalPlanned += planned;
    }
    
    if (actualIndex >= 0) {
      const actual = parseFloat(columns[actualIndex]?.replace(/[\$,]/g, '') || '0');
      totalActual += actual;
    }
    
    if (categoryIndex >= 0) {
      const category = columns[categoryIndex]?.trim().replace(/"/g, '') || '';
      const planned = parseFloat(columns[plannedIndex]?.replace(/[\$,]/g, '') || '0');
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + planned;
    }
  }
  
  return {
    totalPlanned: Math.round(totalPlanned * 100) / 100,
    totalActual: Math.round(totalActual * 100) / 100,
    totalDifference: Math.round((totalActual - totalPlanned) * 100) / 100,
    categoryBreakdown,
    paymentStatusBreakdown: {}
  };
}

function parsePDFData(pdfContent: string): BudgetSummary {
  // Basic PDF parsing - would need proper PDF parser for production
  const numbers = pdfContent.match(/\$[\d,]+\.?\d*/g) || [];
  const amounts = numbers.map(n => parseFloat(n.replace(/[\$,]/g, '')));
  
  // Simple heuristic - assume first two large amounts are totals
  const totalPlanned = amounts.length > 0 ? amounts[0] : 0;
  const totalActual = amounts.length > 1 ? amounts[1] : 0;
  
  return {
    totalPlanned,
    totalActual,
    totalDifference: totalActual - totalPlanned,
    categoryBreakdown: {},
    paymentStatusBreakdown: {}
  };
}

function parseExcelData(excelData: string | Buffer): BudgetSummary {
  // Would need actual Excel parsing library for production
  // For testing, return basic structure
  return {
    totalPlanned: 0,
    totalActual: 0,
    totalDifference: 0,
    categoryBreakdown: {},
    paymentStatusBreakdown: {}
  };
}

/**
 * Validates currency formatting consistency across export formats
 */
export function validateCurrencyFormatting(
  exportData: string,
  expectedCurrency = 'USD'
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for consistent currency symbols
  const dollarSigns = (exportData.match(/\$/g) || []).length;
  const commaFormatting = exportData.match(/\$[\d,]+\.\d{2}/g) || [];
  
  // Validate that all currency amounts have proper formatting
  const unformattedAmounts = exportData.match(/\d+\.\d{3,}/g) || [];
  if (unformattedAmounts.length > 0) {
    errors.push(`Found improperly formatted currency amounts: ${unformattedAmounts.join(', ')}`);
  }
  
  // Check for consistent decimal places
  const amounts = exportData.match(/\$[\d,]+\.\d+/g) || [];
  const inconsistentDecimals = amounts.filter(amount => !amount.match(/\.\d{2}$/));
  if (inconsistentDecimals.length > 0) {
    warnings.push(`Inconsistent decimal places in: ${inconsistentDecimals.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalPlanned: 0,
      totalActual: 0,
      totalDifference: 0,
      categoryBreakdown: {},
      paymentStatusBreakdown: {}
    }
  };
}

/**
 * Validates date formatting and consistency for wedding-specific dates
 */
export function validateDateFormatting(
  exportData: string,
  weddingDate: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Find all dates in the export
  const datePatterns = [
    /\d{1,2}\/\d{1,2}\/\d{4}/g,
    /\d{4}-\d{2}-\d{2}/g,
    /\d{1,2}-\d{1,2}-\d{4}/g
  ];
  
  let foundDates: string[] = [];
  datePatterns.forEach(pattern => {
    const matches = exportData.match(pattern) || [];
    foundDates = foundDates.concat(matches);
  });
  
  // Validate wedding date appears in export
  const weddingDateFormatted = new Date(weddingDate).toLocaleDateString();
  const hasWeddingDate = foundDates.some(date => {
    const normalizedDate = new Date(date).toLocaleDateString();
    return normalizedDate === weddingDateFormatted;
  });
  
  if (!hasWeddingDate && weddingDate) {
    warnings.push(`Wedding date ${weddingDate} not found in export`);
  }
  
  // Check for consistent date formatting
  const dateFormats = foundDates.map(date => {
    if (date.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) return 'MM/DD/YYYY';
    if (date.match(/\d{4}-\d{2}-\d{2}/)) return 'YYYY-MM-DD';
    if (date.match(/\d{1,2}-\d{1,2}-\d{4}/)) return 'MM-DD-YYYY';
    return 'unknown';
  });
  
  const uniqueFormats = Array.from(new Set(dateFormats));
  if (uniqueFormats.length > 1) {
    warnings.push(`Inconsistent date formats found: ${uniqueFormats.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalPlanned: 0,
      totalActual: 0,
      totalDifference: 0,
      categoryBreakdown: {},
      paymentStatusBreakdown: {}
    }
  };
}

/**
 * Creates comprehensive test budget data for validation testing
 */
export function createValidationTestBudget(): BudgetItem[] {
  return [
    {
      id: '1',
      category: 'Venue & Reception',
      name: 'Wedding Venue Rental',
      plannedCost: 12000.00,
      actualCost: 11800.00,
      vendor: 'Premier Venues Co.',
      paymentStatus: 'paid',
      dueDate: '2024-12-01'
    },
    {
      id: '2',
      category: 'Catering & Bar',
      name: 'Wedding Dinner Service',
      plannedCost: 8500.50,
      actualCost: 8750.25,
      vendor: 'Elegant Catering Services',
      paymentStatus: 'pending',
      dueDate: '2024-11-15'
    },
    {
      id: '3',
      category: 'Photography & Videography',
      name: 'Wedding Photography Package',
      plannedCost: 3200.00,
      actualCost: 0,
      vendor: 'Luxury Wedding Studios',
      paymentStatus: 'planned',
      dueDate: '2024-10-01'
    },
    {
      id: '4',
      category: 'Flowers & Decorations',
      name: 'Bridal Bouquet & Centerpieces',
      plannedCost: 1750.75,
      actualCost: 1825.00,
      vendor: 'Classic Floral Design',
      paymentStatus: 'paid',
      dueDate: '2024-11-20'
    }
  ];
}