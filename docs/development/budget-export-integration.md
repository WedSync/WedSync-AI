# Budget Export System - Developer Integration Guide
**WS-166 Implementation Reference**

## Overview

This guide provides comprehensive integration instructions for implementing the WS-166 Budget Export System within the WedSync platform. It covers component architecture, API integration patterns, security requirements, and testing strategies.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                         │
├─────────────────────────────────────────────────────────────┤
│  BudgetExportButton.tsx  │  ExportDialog.tsx              │
│  ExportProgress.tsx      │  ExportFilters.tsx             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                           │
├─────────────────────────────────────────────────────────────┤
│  budget-export-service.ts │  export-queue-manager.ts       │
│  file-generator.ts        │  validation-service.ts         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                              │
├─────────────────────────────────────────────────────────────┤
│  /api/budget/export/pdf   │  /api/budget/export/csv        │
│  /api/budget/export/excel │  /api/budget/export/status     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                               │
├─────────────────────────────────────────────────────────────┤
│  Supabase Database       │  File Storage (Temporary)       │
│  Budget Tables           │  Export Queue                   │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Dependencies Installation

```bash
# Core dependencies
npm install puppeteer xlsx csv-parser jspdf
npm install @types/node @types/react

# Security and validation
npm install zod joi bcrypt helmet
npm install rate-limiter-flexible

# Testing dependencies
npm install --save-dev @playwright/test jest @testing-library/react
npm install --save-dev @testing-library/jest-dom
```

### Environment Configuration

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
EXPORT_STORAGE_BUCKET=wedsync-exports
EXPORT_TEMP_DIR=/tmp/exports
RATE_LIMIT_EXPORTS_PER_MINUTE=10
WEBHOOK_SECRET=your_webhook_secret
```

## Component Implementation

### 1. BudgetExportButton Component

```typescript
// src/components/budget/BudgetExportButton.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Download, FileText, Table, BarChart } from 'lucide-react';
import { exportBudgetToPDF, exportBudgetToCSV, exportBudgetToExcel } from '@/lib/services/budget-export-service';

interface BudgetExportButtonProps {
  budgetData: Budget;
  disabled?: boolean;
  className?: string;
}

export function BudgetExportButton({ 
  budgetData, 
  disabled = false, 
  className 
}: BudgetExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    try {
      setIsExporting(true);
      setExportProgress(0);

      const exportService = {
        pdf: exportBudgetToPDF,
        csv: exportBudgetToCSV,
        excel: exportBudgetToExcel
      }[format];

      await exportService(budgetData, {
        onProgress: setExportProgress
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      // Handle error appropriately
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        disabled={disabled || budgetData.items.length === 0}
        className={className}
        data-testid="budget-export-button"
        aria-label="Export wedding budget to PDF, Excel, or CSV"
      >
        <Download className="w-4 h-4 mr-2" />
        Export Budget
      </Button>

      <Dialog 
        open={isOpen} 
        onOpenChange={setIsOpen}
        data-testid="export-dialog"
        aria-label="Budget Export Options"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Export Your Budget</h3>
          
          {isExporting ? (
            <ExportProgress 
              progress={exportProgress}
              data-testid="export-progress"
            />
          ) : (
            <div className="space-y-4">
              <ExportOption
                icon={<FileText className="w-5 h-5" />}
                title="PDF Report"
                description="Professional report with charts - perfect for sharing with family"
                onClick={() => handleExport('pdf')}
                data-testid="export-pdf"
              />
              
              <ExportOption
                icon={<Table className="w-5 h-5" />}
                title="Excel Spreadsheet"
                description="Detailed workbook with formulas - ideal for wedding planners"
                onClick={() => handleExport('excel')}
                data-testid="export-excel"
              />
              
              <ExportOption
                icon={<BarChart className="w-5 h-5" />}
                title="CSV Data"
                description="Raw data format - import into other budgeting tools"
                onClick={() => handleExport('csv')}
                data-testid="export-csv"
              />
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}

interface ExportOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

function ExportOption({ icon, title, description, onClick, ...props }: ExportOptionProps) {
  return (
    <button
      className="w-full p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors"
      onClick={onClick}
      {...props}
    >
      <div className="flex items-start space-x-3">
        <div className="text-blue-600">{icon}</div>
        <div>
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>
    </button>
  );
}

function ExportProgress({ progress }: { progress: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span>Generating your export...</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
```

### 2. Export Service Implementation

```typescript
// src/lib/services/budget-export-service.ts
import { Budget } from '@/types/budget';

interface ExportOptions {
  filters?: ExportFilters;
  onProgress?: (progress: number) => void;
}

interface ExportFilters {
  categories?: string[];
  dateRange?: { startDate: string; endDate: string };
  vendors?: string[];
  amountRange?: { min: number; max: number };
}

export async function exportBudgetToPDF(
  budget: Budget, 
  options: ExportOptions = {}
): Promise<void> {
  const { onProgress } = options;
  
  try {
    onProgress?.(10);
    
    const response = await fetch('/api/budget/export/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        budgetId: budget.id,
        filters: options.filters,
        options: {
          includeCharts: true,
          privacyLevel: 'family'
        }
      })
    });

    onProgress?.(50);

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    onProgress?.(80);

    // Handle both direct download and async processing
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      // Async processing
      const result = await response.json();
      await pollExportStatus(result.exportId, onProgress);
    } else {
      // Direct download
      const blob = await response.blob();
      downloadFile(blob, 'wedding-budget.pdf');
    }

    onProgress?.(100);
    
  } catch (error) {
    console.error('PDF export failed:', error);
    throw error;
  }
}

export async function exportBudgetToCSV(
  budget: Budget, 
  options: ExportOptions = {}
): Promise<void> {
  const { onProgress } = options;
  
  try {
    onProgress?.(10);
    
    const response = await fetch('/api/budget/export/csv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        budgetId: budget.id,
        filters: options.filters,
        options: {
          encoding: 'utf-8',
          currencyFormat: 'symbol'
        }
      })
    });

    onProgress?.(70);

    if (!response.ok) {
      throw new Error(`CSV export failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    downloadFile(blob, 'wedding-budget.csv');
    
    onProgress?.(100);
    
  } catch (error) {
    console.error('CSV export failed:', error);
    throw error;
  }
}

export async function exportBudgetToExcel(
  budget: Budget, 
  options: ExportOptions = {}
): Promise<void> {
  const { onProgress } = options;
  
  try {
    onProgress?.(10);
    
    const response = await fetch('/api/budget/export/excel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        budgetId: budget.id,
        filters: options.filters,
        options: {
          includeCharts: true,
          includeFormulas: true,
          worksheets: {
            summary: true,
            categories: true,
            vendors: true,
            timeline: true
          }
        }
      })
    });

    onProgress?.(60);

    if (!response.ok) {
      throw new Error(`Excel export failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    downloadFile(blob, 'wedding-budget.xlsx');
    
    onProgress?.(100);
    
  } catch (error) {
    console.error('Excel export failed:', error);
    throw error;
  }
}

// Utility functions
async function getAuthToken(): Promise<string> {
  // Implementation depends on your auth system
  const session = await getSession();
  return session?.accessToken || '';
}

async function pollExportStatus(
  exportId: string, 
  onProgress?: (progress: number) => void
): Promise<void> {
  const maxAttempts = 30; // 5 minutes with 10-second intervals
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(`/api/budget/export/status/${exportId}`, {
      headers: {
        'Authorization': `Bearer ${await getAuthToken()}`
      }
    });

    const status = await response.json();
    
    onProgress?.(status.progress || 80);

    if (status.status === 'completed') {
      // Download the file
      const downloadResponse = await fetch(status.downloadUrl);
      const blob = await downloadResponse.blob();
      
      const filename = status.downloadUrl.split('/').pop() || 'export.pdf';
      downloadFile(blob, filename);
      return;
    }

    if (status.status === 'failed') {
      throw new Error('Export processing failed');
    }

    // Wait 10 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 10000));
    attempts++;
  }

  throw new Error('Export timeout - please try again');
}

function downloadFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
```

## API Route Implementation

### 1. PDF Export Route

```typescript
// src/app/api/budget/export/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { withSecureValidation } from '@/lib/validation/middleware';
import { secureStringSchema } from '@/lib/validation/schemas';
import { rateLimitService } from '@/lib/rate-limiter';
import { generatePDF } from '@/lib/export/pdf-generator';
import { getBudgetWithAuth } from '@/lib/budget/budget-service';
import { auditLog } from '@/lib/audit/audit-logger';

const exportRequestSchema = z.object({
  budgetId: secureStringSchema.regex(/^budget_[a-zA-Z0-9]+$/),
  filters: z.object({
    categories: z.array(secureStringSchema).max(20).optional(),
    dateRange: z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime()
    }).optional(),
    vendors: z.array(secureStringSchema).max(50).optional(),
    amountRange: z.object({
      min: z.number().min(0),
      max: z.number().max(1000000)
    }).optional()
  }).optional(),
  options: z.object({
    includeCharts: z.boolean().default(true),
    includeTimeline: z.boolean().default(false),
    includePhotos: z.boolean().default(false),
    privacyLevel: z.enum(['full', 'family', 'vendor', 'public']).default('full'),
    paperSize: z.enum(['letter', 'a4']).default('letter'),
    orientation: z.enum(['portrait', 'landscape']).default('portrait')
  }).optional()
});

export const POST = withSecureValidation(
  exportRequestSchema,
  async (request: NextRequest, validatedData: z.infer<typeof exportRequestSchema>) => {
    try {
      // Check authentication
      const session = await getServerSession();
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'unauthorized', message: 'Authentication required' },
          { status: 401 }
        );
      }

      // Rate limiting
      const rateLimitResult = await rateLimitService.checkRateLimit(
        request, 
        `export_${session.user.id}`,
        { max: 10, windowMs: 60000 } // 10 exports per minute
      );
      
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { 
            error: 'rate_limited', 
            message: 'Export rate limit exceeded',
            retryAfter: rateLimitResult.retryAfter 
          },
          { status: 429 }
        );
      }

      // Get budget with authorization check
      const budget = await getBudgetWithAuth(validatedData.budgetId, session.user.id);
      if (!budget) {
        return NextResponse.json(
          { error: 'not_found', message: 'Budget not found' },
          { status: 404 }
        );
      }

      // Apply filters if provided
      const filteredBudget = applyFilters(budget, validatedData.filters);

      // Generate PDF
      const startTime = Date.now();
      const pdfBuffer = await generatePDF(filteredBudget, validatedData.options);
      const generationTime = Date.now() - startTime;

      // Audit logging
      await auditLog({
        action: 'budget_export_pdf',
        userId: session.user.id,
        budgetId: validatedData.budgetId,
        metadata: {
          fileSize: pdfBuffer.length,
          generationTime,
          filters: validatedData.filters,
          options: validatedData.options
        }
      });

      // Return PDF
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="wedding-budget-${new Date().toISOString().split('T')[0]}.pdf"`,
          'Content-Length': pdfBuffer.length.toString(),
          'X-Export-Time': generationTime.toString(),
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY'
        }
      });

    } catch (error) {
      console.error('PDF export failed:', error);
      
      // Audit error
      await auditLog({
        action: 'budget_export_pdf_failed',
        userId: session?.user?.id,
        budgetId: validatedData.budgetId,
        error: error.message
      });

      return NextResponse.json(
        { 
          error: 'export_failed', 
          message: 'PDF generation failed' 
        },
        { status: 500 }
      );
    }
  }
);

function applyFilters(budget: Budget, filters?: any): Budget {
  if (!filters) return budget;

  let filteredItems = [...budget.items];

  // Date range filter
  if (filters.dateRange) {
    const startDate = new Date(filters.dateRange.startDate);
    const endDate = new Date(filters.dateRange.endDate);
    
    filteredItems = filteredItems.filter(item => {
      const itemDate = new Date(item.createdAt);
      return itemDate >= startDate && itemDate <= endDate;
    });
  }

  // Category filter
  if (filters.categories?.length) {
    filteredItems = filteredItems.filter(item => 
      filters.categories.includes(item.category)
    );
  }

  // Vendor filter
  if (filters.vendors?.length) {
    filteredItems = filteredItems.filter(item => 
      item.vendor && filters.vendors.includes(item.vendor.id)
    );
  }

  // Amount range filter
  if (filters.amountRange) {
    filteredItems = filteredItems.filter(item => {
      const amount = item.actualCost || item.plannedCost;
      return amount >= filters.amountRange.min && 
             amount <= filters.amountRange.max;
    });
  }

  return {
    ...budget,
    items: filteredItems
  };
}
```

### 2. CSV Export Route

```typescript
// src/app/api/budget/export/csv/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withSecureValidation } from '@/lib/validation/middleware';
import { generateCSV } from '@/lib/export/csv-generator';

const csvExportSchema = z.object({
  budgetId: secureStringSchema.regex(/^budget_[a-zA-Z0-9]+$/),
  filters: filtersSchema.optional(),
  options: z.object({
    encoding: z.enum(['utf-8', 'iso-8859-1']).default('utf-8'),
    delimiter: z.enum([',', ';', '\t']).default(','),
    includeHeaders: z.boolean().default(true),
    dateFormat: z.enum(['iso', 'us', 'eu']).default('iso'),
    currencyFormat: z.enum(['symbol', 'code', 'none']).default('symbol')
  }).optional()
});

export const POST = withSecureValidation(
  csvExportSchema,
  async (request: NextRequest, validatedData: z.infer<typeof csvExportSchema>) => {
    try {
      // Similar auth and rate limiting as PDF export
      const session = await getServerSession();
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'unauthorized', message: 'Authentication required' },
          { status: 401 }
        );
      }

      // Get budget and apply filters
      const budget = await getBudgetWithAuth(validatedData.budgetId, session.user.id);
      if (!budget) {
        return NextResponse.json(
          { error: 'not_found', message: 'Budget not found' },
          { status: 404 }
        );
      }

      const filteredBudget = applyFilters(budget, validatedData.filters);

      // Generate CSV
      const csvContent = await generateCSV(filteredBudget, validatedData.options);
      const csvBuffer = Buffer.from(csvContent, validatedData.options?.encoding || 'utf-8');

      // Audit logging
      await auditLog({
        action: 'budget_export_csv',
        userId: session.user.id,
        budgetId: validatedData.budgetId,
        metadata: {
          fileSize: csvBuffer.length,
          encoding: validatedData.options?.encoding,
          itemCount: filteredBudget.items.length
        }
      });

      return new NextResponse(csvBuffer, {
        status: 200,
        headers: {
          'Content-Type': `text/csv; charset=${validatedData.options?.encoding || 'utf-8'}`,
          'Content-Disposition': `attachment; filename="wedding-budget-${new Date().toISOString().split('T')[0]}.csv"`,
          'Content-Length': csvBuffer.length.toString(),
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY'
        }
      });

    } catch (error) {
      console.error('CSV export failed:', error);
      return NextResponse.json(
        { error: 'export_failed', message: 'CSV generation failed' },
        { status: 500 }
      );
    }
  }
);
```

## File Generator Implementation

### PDF Generator

```typescript
// src/lib/export/pdf-generator.ts
import puppeteer from 'puppeteer';
import { Budget } from '@/types/budget';

interface PDFOptions {
  includeCharts?: boolean;
  includeTimeline?: boolean;
  includePhotos?: boolean;
  privacyLevel?: 'full' | 'family' | 'vendor' | 'public';
  paperSize?: 'letter' | 'a4';
  orientation?: 'portrait' | 'landscape';
}

export async function generatePDF(
  budget: Budget, 
  options: PDFOptions = {}
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Generate HTML content for the PDF
    const htmlContent = generatePDFHTML(budget, options);
    
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    const pdfBuffer = await page.pdf({
      format: options.paperSize === 'a4' ? 'A4' : 'Letter',
      landscape: options.orientation === 'landscape',
      printBackground: true,
      margin: {
        top: '1in',
        right: '0.75in',
        bottom: '1in',
        left: '0.75in'
      }
    });

    return pdfBuffer;

  } finally {
    await browser.close();
  }
}

function generatePDFHTML(budget: Budget, options: PDFOptions): string {
  const {
    includeCharts = true,
    includeTimeline = false,
    privacyLevel = 'full'
  } = options;

  // Calculate totals
  const totalPlanned = budget.items.reduce((sum, item) => sum + item.plannedCost, 0);
  const totalActual = budget.items.reduce((sum, item) => sum + item.actualCost, 0);
  const difference = totalActual - totalPlanned;

  // Group by category
  const categoryTotals = budget.items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.plannedCost;
    return acc;
  }, {} as Record<string, number>);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Wedding Budget Report</title>
      <style>
        body {
          font-family: 'Helvetica', 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          border-bottom: 3px solid #e1006a;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .summary {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        
        .summary-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 18px;
        }
        
        .summary-item.total {
          font-weight: bold;
          font-size: 22px;
          border-top: 2px solid #dee2e6;
          padding-top: 10px;
        }
        
        .category-section {
          margin-bottom: 40px;
        }
        
        .category-header {
          background: #e1006a;
          color: white;
          padding: 10px 20px;
          border-radius: 5px;
          margin-bottom: 15px;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        .items-table th,
        .items-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
        }
        
        .items-table th {
          background-color: #f8f9fa;
          font-weight: bold;
        }
        
        .amount {
          text-align: right;
          font-weight: 500;
        }
        
        .difference.positive {
          color: #dc3545;
        }
        
        .difference.negative {
          color: #28a745;
        }
        
        ${includeCharts ? `
        .chart-container {
          margin: 30px 0;
          text-align: center;
        }
        
        .chart-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        ` : ''}
        
        @media print {
          body {
            font-size: 12px;
          }
          
          .page-break {
            page-break-before: always;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Wedding Budget Report</h1>
        <p><strong>Wedding Date:</strong> ${new Date(budget.weddingDate).toLocaleDateString()}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
      </div>

      <div class="summary">
        <h2>Budget Summary</h2>
        <div class="summary-item">
          <span>Total Planned:</span>
          <span>$${totalPlanned.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="summary-item">
          <span>Total Actual:</span>
          <span>$${totalActual.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="summary-item total difference ${difference >= 0 ? 'positive' : 'negative'}">
          <span>Difference:</span>
          <span>${difference >= 0 ? '+' : ''}$${difference.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      ${includeCharts ? generateChartSection(categoryTotals) : ''}

      ${generateCategoryDetails(budget, privacyLevel)}

      <div class="footer" style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
        <p>Generated by WedSync - Wedding Planning Made Simple</p>
      </div>
    </body>
    </html>
  `;
}

function generateChartSection(categoryTotals: Record<string, number>): string {
  // In a real implementation, you would generate actual charts
  // For now, we'll create a text-based representation
  return `
    <div class="chart-container">
      <div class="chart-title">Budget Allocation by Category</div>
      <div style="text-align: left; max-width: 400px; margin: 0 auto;">
        ${Object.entries(categoryTotals)
          .sort(([,a], [,b]) => b - a)
          .map(([category, amount]) => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>${category}:</span>
              <span>$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          `).join('')}
      </div>
    </div>
  `;
}

function generateCategoryDetails(budget: Budget, privacyLevel: string): string {
  // Group items by category
  const itemsByCategory = budget.items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof budget.items>);

  return Object.entries(itemsByCategory)
    .map(([category, items]) => {
      const categoryTotal = items.reduce((sum, item) => sum + item.plannedCost, 0);
      
      return `
        <div class="category-section">
          <div class="category-header">
            <h3>${category} - $${categoryTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Planned Cost</th>
                <th>Actual Cost</th>
                <th>Difference</th>
                ${privacyLevel === 'full' ? '<th>Vendor</th>' : ''}
                ${privacyLevel === 'full' ? '<th>Status</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${items.map(item => {
                const diff = item.actualCost - item.plannedCost;
                return `
                  <tr>
                    <td>${item.name}</td>
                    <td class="amount">$${item.plannedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td class="amount">$${item.actualCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td class="amount difference ${diff >= 0 ? 'positive' : 'negative'}">
                      ${diff >= 0 ? '+' : ''}$${diff.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    ${privacyLevel === 'full' ? `<td>${item.vendor?.name || 'TBD'}</td>` : ''}
                    ${privacyLevel === 'full' ? `<td>${item.paymentStatus || 'planned'}</td>` : ''}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }).join('');
}
```

### CSV Generator

```typescript
// src/lib/export/csv-generator.ts
import { Budget } from '@/types/budget';

interface CSVOptions {
  encoding?: 'utf-8' | 'iso-8859-1';
  delimiter?: ',' | ';' | '\t';
  includeHeaders?: boolean;
  dateFormat?: 'iso' | 'us' | 'eu';
  currencyFormat?: 'symbol' | 'code' | 'none';
}

export async function generateCSV(
  budget: Budget, 
  options: CSVOptions = {}
): Promise<string> {
  const {
    delimiter = ',',
    includeHeaders = true,
    dateFormat = 'iso',
    currencyFormat = 'symbol'
  } = options;

  const headers = [
    'Category',
    'Item Name',
    'Description',
    'Planned Cost',
    'Actual Cost',
    'Difference',
    'Vendor Name',
    'Vendor Email',
    'Payment Status',
    'Due Date',
    'Contract Date',
    'Notes',
    'Created Date',
    'Updated Date'
  ];

  const rows = budget.items.map(item => {
    const difference = item.actualCost - item.plannedCost;
    
    return [
      escapeCSVField(item.category, delimiter),
      escapeCSVField(item.name, delimiter),
      escapeCSVField(item.description || '', delimiter),
      formatCurrency(item.plannedCost, currencyFormat),
      formatCurrency(item.actualCost, currencyFormat),
      formatCurrency(difference, currencyFormat),
      escapeCSVField(item.vendor?.name || '', delimiter),
      escapeCSVField(item.vendor?.contactEmail || '', delimiter),
      escapeCSVField(item.paymentStatus || 'planned', delimiter),
      formatDate(item.paymentDueDate, dateFormat),
      formatDate(item.contractDate, dateFormat),
      escapeCSVField(item.notes || '', delimiter),
      formatDate(item.createdAt, dateFormat),
      formatDate(item.updatedAt, dateFormat)
    ].join(delimiter);
  });

  const csvContent = [
    ...(includeHeaders ? [headers.join(delimiter)] : []),
    ...rows
  ].join('\n');

  return csvContent;
}

function escapeCSVField(field: string, delimiter: string): string {
  // Escape quotes and wrap in quotes if contains delimiter, quotes, or newlines
  if (field.includes('"') || field.includes(delimiter) || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function formatCurrency(amount: number, format: 'symbol' | 'code' | 'none'): string {
  switch (format) {
    case 'symbol':
      return `$${amount.toFixed(2)}`;
    case 'code':
      return `${amount.toFixed(2)} USD`;
    case 'none':
      return amount.toFixed(2);
    default:
      return `$${amount.toFixed(2)}`;
  }
}

function formatDate(dateString: string | undefined, format: 'iso' | 'us' | 'eu'): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  switch (format) {
    case 'iso':
      return date.toISOString().split('T')[0];
    case 'us':
      return date.toLocaleDateString('en-US');
    case 'eu':
      return date.toLocaleDateString('en-GB');
    default:
      return date.toISOString().split('T')[0];
  }
}
```

## Integration Checklist

### Frontend Integration
- [ ] Install required dependencies
- [ ] Create BudgetExportButton component
- [ ] Implement export service layer
- [ ] Add to budget dashboard navigation
- [ ] Test all export formats
- [ ] Verify mobile responsiveness

### Backend Integration
- [ ] Set up API routes with security middleware
- [ ] Implement file generators (PDF, CSV, Excel)
- [ ] Add rate limiting and audit logging
- [ ] Configure temporary file storage
- [ ] Set up webhook notifications
- [ ] Implement async processing for large exports

### Security Implementation
- [ ] Input validation with Zod schemas
- [ ] Authentication checks on all endpoints
- [ ] Rate limiting configuration
- [ ] File security headers
- [ ] Audit logging for all operations
- [ ] Data sanitization in exports

### Testing Integration
- [ ] Unit tests for all components
- [ ] API integration tests
- [ ] E2E tests with Playwright
- [ ] Performance benchmarking
- [ ] Security validation tests
- [ ] Cross-browser compatibility testing

### Navigation Integration (MANDATORY)
- [ ] Add export button to budget dashboard toolbar
- [ ] Update mobile navigation for budget exports
- [ ] Add breadcrumb navigation for export flows
- [ ] Ensure export dialog integrates with existing UI patterns

### Documentation
- [ ] API endpoint documentation
- [ ] Component usage documentation
- [ ] Security implementation guide
- [ ] User guide for export features
- [ ] Troubleshooting guide

## Performance Optimization

### Caching Strategy
```typescript
// Implement Redis caching for export results
import { redis } from '@/lib/redis';

const cacheKey = `budget_export_${budgetId}_${hashFilters(filters)}`;
const cachedResult = await redis.get(cacheKey);

if (cachedResult) {
  return cachedResult;
}

// Generate export and cache for 1 hour
const exportResult = await generateExport(budget, options);
await redis.setex(cacheKey, 3600, exportResult);
```

### Background Processing
```typescript
// For large exports, use background processing
import { Queue } from 'bullmq';

const exportQueue = new Queue('budget-exports');

if (budget.items.length > 100) {
  // Process in background
  const job = await exportQueue.add('generate-export', {
    budgetId,
    format,
    options,
    userId
  });
  
  return { exportId: job.id, status: 'processing' };
}
```

## Monitoring & Analytics

### Export Metrics
```typescript
// Track export metrics for analysis
import { analytics } from '@/lib/analytics';

await analytics.track('budget_export', {
  format,
  budgetSize: budget.items.length,
  processingTime: Date.now() - startTime,
  fileSize: result.length,
  userId,
  success: true
});
```

### Error Tracking
```typescript
// Comprehensive error logging
import { errorTracker } from '@/lib/error-tracking';

try {
  // Export logic
} catch (error) {
  await errorTracker.captureException(error, {
    context: {
      budgetId,
      format,
      userId,
      budgetSize: budget.items.length
    }
  });
  throw error;
}
```

---

**Integration Status**: Ready for Implementation  
**Version**: 1.0.0  
**Last Updated**: January 2025  
**Contact**: development@wedsync.com