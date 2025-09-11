import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import jsPDF from 'jspdf';

const ExportSchema = z.object({
  format: z.enum(['pdf', 'csv']),
  timeRange: z.enum(['7d', '30d', '90d', 'all']).optional().default('30d'),
  includeAnalytics: z.boolean().optional().default(false),
  includeForecast: z.boolean().optional().default(false),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { weddingId: string } },
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const weddingId = params.weddingId;

    // Parse request body
    const body = await request.json();
    const validation = ExportSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid export parameters',
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const { format, timeRange, includeAnalytics, includeForecast } =
      validation.data;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user has access to this wedding
    const { data: teamMember, error: teamError } = await supabase
      .from('wedding_team_members')
      .select('role')
      .eq('wedding_id', weddingId)
      .eq('user_id', user.id)
      .single();

    if (teamError || !teamMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch wedding information
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('couple_name, wedding_date, total_budget, venue_name')
      .eq('id', weddingId)
      .single();

    if (weddingError) {
      return NextResponse.json({ error: 'Wedding not found' }, { status: 404 });
    }

    // Calculate date range
    let startDate = new Date();
    switch (timeRange) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'all':
        startDate = new Date('2020-01-01');
        break;
    }

    // Fetch budget data
    const { data: categories, error: categoriesError } = await supabase
      .from('budget_categories')
      .select(
        `
        id, name, budgeted_amount, spent_amount, color, description,
        budget_transactions (
          id, amount, transaction_date, description, vendor_name, payment_method
        )
      `,
      )
      .eq('wedding_id', weddingId)
      .eq('is_active', true)
      .gte('budget_transactions.created_at', startDate.toISOString())
      .order('name');

    if (categoriesError) {
      console.error('Categories fetch error:', categoriesError);
      return NextResponse.json(
        { error: 'Failed to fetch budget data' },
        { status: 500 },
      );
    }

    // Calculate totals
    const totalBudgeted =
      categories?.reduce(
        (sum, cat) => sum + parseFloat(cat.budgeted_amount),
        0,
      ) || 0;
    const totalSpent =
      categories?.reduce((sum, cat) => sum + parseFloat(cat.spent_amount), 0) ||
      0;
    const totalRemaining = totalBudgeted - totalSpent;

    // Generate export based on format
    if (format === 'csv') {
      return await generateCSVExport({
        wedding,
        categories,
        totals: { totalBudgeted, totalSpent, totalRemaining },
        timeRange,
        user,
        supabase,
        weddingId,
      });
    } else {
      return await generatePDFExport({
        wedding,
        categories,
        totals: { totalBudgeted, totalSpent, totalRemaining },
        timeRange,
        includeAnalytics,
        includeForecast,
        user,
        supabase,
        weddingId,
      });
    }
  } catch (error) {
    console.error('Budget export API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

async function generateCSVExport({
  wedding,
  categories,
  totals,
  timeRange,
  user,
  supabase,
  weddingId,
}: any) {
  try {
    const csvRows = [];

    // Header information
    csvRows.push(['Wedding Budget Report']);
    csvRows.push(['Couple:', wedding.couple_name]);
    csvRows.push([
      'Wedding Date:',
      new Date(wedding.wedding_date).toLocaleDateString(),
    ]);
    csvRows.push(['Report Generated:', new Date().toLocaleString()]);
    csvRows.push(['Time Range:', timeRange]);
    csvRows.push(['']);

    // Summary section
    csvRows.push(['BUDGET SUMMARY']);
    csvRows.push([
      'Total Budget:',
      `$${totals.totalBudgeted.toLocaleString()}`,
    ]);
    csvRows.push(['Total Spent:', `$${totals.totalSpent.toLocaleString()}`]);
    csvRows.push(['Remaining:', `$${totals.totalRemaining.toLocaleString()}`]);
    csvRows.push(['']);

    // Categories section
    csvRows.push(['BUDGET CATEGORIES']);
    csvRows.push([
      'Category',
      'Budgeted',
      'Spent',
      'Remaining',
      'Percentage Used',
    ]);

    categories?.forEach((category: any) => {
      const budgeted = parseFloat(category.budgeted_amount);
      const spent = parseFloat(category.spent_amount);
      const remaining = budgeted - spent;
      const percentage =
        budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0;

      csvRows.push([
        category.name,
        `$${budgeted.toLocaleString()}`,
        `$${spent.toLocaleString()}`,
        `$${remaining.toLocaleString()}`,
        `${percentage}%`,
      ]);
    });

    // Transactions section
    csvRows.push(['']);
    csvRows.push(['TRANSACTIONS']);
    csvRows.push([
      'Date',
      'Category',
      'Amount',
      'Description',
      'Vendor',
      'Payment Method',
    ]);

    categories?.forEach((category: any) => {
      category.budget_transactions?.forEach((transaction: any) => {
        csvRows.push([
          new Date(transaction.transaction_date).toLocaleDateString(),
          category.name,
          `$${Math.abs(parseFloat(transaction.amount)).toLocaleString()}`,
          transaction.description || '',
          transaction.vendor_name || '',
          transaction.payment_method || '',
        ]);
      });
    });

    // Convert to CSV string
    const csvContent = csvRows
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    // Log activity
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      wedding_id: weddingId,
      action: 'export_budget_csv',
      resource_type: 'budget_export',
      resource_id: weddingId,
      metadata: {
        format: 'csv',
        time_range: timeRange,
        categories_count: categories?.length || 0,
      },
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="budget-report-${wedding.couple_name?.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('CSV export error:', error);
    throw error;
  }
}

async function generatePDFExport({
  wedding,
  categories,
  totals,
  timeRange,
  includeAnalytics,
  includeForecast,
  user,
  supabase,
  weddingId,
}: any) {
  try {
    const pdf = new jsPDF();
    let yPosition = 20;

    // Helper function to add text and manage page breaks
    const addText = (
      text: string,
      x: number = 20,
      fontSize: number = 12,
      style: string = 'normal',
    ) => {
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', style);
      pdf.text(text, x, yPosition);
      yPosition += fontSize * 0.5 + 2;
    };

    // Header
    addText('Wedding Budget Report', 20, 24, 'bold');
    yPosition += 10;

    // Wedding info
    addText(`Couple: ${wedding.couple_name}`, 20, 14, 'bold');
    addText(
      `Wedding Date: ${new Date(wedding.wedding_date).toLocaleDateString()}`,
    );
    addText(`Venue: ${wedding.venue_name || 'Not specified'}`);
    addText(`Report Generated: ${new Date().toLocaleString()}`);
    addText(`Time Range: ${timeRange}`);
    yPosition += 10;

    // Budget summary
    addText('Budget Summary', 20, 18, 'bold');
    yPosition += 5;
    addText(`Total Budget: $${totals.totalBudgeted.toLocaleString()}`, 30);
    addText(`Total Spent: $${totals.totalSpent.toLocaleString()}`, 30);
    addText(`Remaining: $${totals.totalRemaining.toLocaleString()}`, 30);
    addText(
      `Utilization: ${totals.totalBudgeted > 0 ? Math.round((totals.totalSpent / totals.totalBudgeted) * 100) : 0}%`,
      30,
    );
    yPosition += 10;

    // Categories breakdown
    addText('Budget Categories', 20, 18, 'bold');
    yPosition += 5;

    categories?.forEach((category: any) => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      const budgeted = parseFloat(category.budgeted_amount);
      const spent = parseFloat(category.spent_amount);
      const remaining = budgeted - spent;
      const percentage =
        budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0;

      addText(`${category.name}:`, 30, 12, 'bold');
      addText(`  Budgeted: $${budgeted.toLocaleString()}`, 35, 10);
      addText(`  Spent: $${spent.toLocaleString()} (${percentage}%)`, 35, 10);
      addText(`  Remaining: $${remaining.toLocaleString()}`, 35, 10);
      yPosition += 3;
    });

    // Recent transactions
    yPosition += 10;
    addText('Recent Transactions', 20, 18, 'bold');
    yPosition += 5;

    let transactionCount = 0;
    categories?.forEach((category: any) => {
      category.budget_transactions?.slice(0, 10).forEach((transaction: any) => {
        if (transactionCount < 20 && yPosition < 250) {
          // Limit transactions and check page space
          const date = new Date(
            transaction.transaction_date,
          ).toLocaleDateString();
          const amount = Math.abs(
            parseFloat(transaction.amount),
          ).toLocaleString();
          addText(`${date} - ${category.name}: $${amount}`, 30, 10);
          if (transaction.description) {
            addText(`  ${transaction.description}`, 35, 9);
          }
          transactionCount++;
        }
      });
    });

    // Generate PDF buffer
    const pdfBuffer = pdf.output('arraybuffer');

    // Log activity
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      wedding_id: weddingId,
      action: 'export_budget_pdf',
      resource_type: 'budget_export',
      resource_id: weddingId,
      metadata: {
        format: 'pdf',
        time_range: timeRange,
        include_analytics: includeAnalytics,
        include_forecast: includeForecast,
        categories_count: categories?.length || 0,
      },
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="budget-report-${wedding.couple_name?.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF export error:', error);
    throw error;
  }
}
