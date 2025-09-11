import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { rateLimitService } from '@/lib/rate-limiter';

interface ImportClientData {
  first_name?: string;
  last_name?: string;
  partner_first_name?: string;
  partner_last_name?: string;
  email?: string;
  phone?: string;
  wedding_date?: string;
  venue_name?: string;
  venue_address?: string;
  guest_count?: number;
  budget_range?: string;
  status?: string;
  notes?: string;
  package_name?: string;
  package_price?: number;
  priority_level?: 'low' | 'medium' | 'high' | 'urgent';
}

interface ImportValidationError {
  row: number;
  field: string;
  message: string;
}

interface ImportProgress {
  id: string;
  total: number;
  processed: number;
  successful: number;
  failed: number;
  errors: ImportValidationError[];
  status: 'processing' | 'completed' | 'failed';
}

const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePhone = (phone: string): boolean => {
  const re = /^[\+]?[1-9][\d]{0,15}$/;
  return re.test(phone.replace(/[\s\-\(\)]/g, ''));
};

const validateDate = (date: string): boolean => {
  const parsed = new Date(date);
  return !isNaN(parsed.getTime()) && parsed > new Date('1900-01-01');
};

const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

const validateClientData = (
  client: ImportClientData,
  row: number,
): ImportValidationError[] => {
  const errors: ImportValidationError[] = [];

  // Email validation
  if (client.email && !validateEmail(client.email)) {
    errors.push({
      row,
      field: 'email',
      message: 'Invalid email format',
    });
  }

  // Phone validation
  if (client.phone && !validatePhone(client.phone)) {
    errors.push({
      row,
      field: 'phone',
      message: 'Invalid phone format',
    });
  }

  // Wedding date validation
  if (client.wedding_date && !validateDate(client.wedding_date)) {
    errors.push({
      row,
      field: 'wedding_date',
      message: 'Invalid date format',
    });
  }

  // Required field validation
  if (!client.first_name && !client.email) {
    errors.push({
      row,
      field: 'first_name_or_email',
      message: 'Either first name or email is required',
    });
  }

  // Status validation
  if (
    client.status &&
    !['lead', 'booked', 'completed', 'archived'].includes(client.status)
  ) {
    errors.push({
      row,
      field: 'status',
      message: 'Invalid status. Must be: lead, booked, completed, or archived',
    });
  }

  // Guest count validation
  if (
    client.guest_count !== undefined &&
    (client.guest_count < 0 || client.guest_count > 10000)
  ) {
    errors.push({
      row,
      field: 'guest_count',
      message: 'Guest count must be between 0 and 10000',
    });
  }

  return errors;
};

// Helper function to process client field data - REDUCES NESTING LEVELS
const processClientField = (row: any, key: string, client: ImportClientData): void => {
  const value = row[key];
  if (!value || typeof value !== 'string') return;

  const sanitized = sanitizeInput(value);
  if (!sanitized) return;

  assignSanitizedValue(key, sanitized, client);
};

// Helper function to assign sanitized values - EXTRACTED FROM NESTED SWITCH
const assignSanitizedValue = (key: string, sanitized: string, client: ImportClientData): void => {
  const numericFields = ['guest_count', 'package_price'];
  
  if (numericFields.includes(key)) {
    const num = parseInt(sanitized);
    if (!isNaN(num)) {
      (client as any)[key] = num;
    }
  } else {
    (client as any)[key] = sanitized;
  }
};

// Helper function to process Excel field mapping - REDUCES EXCEL NESTING LEVELS
const processExcelField = (header: string, sanitized: string, client: ImportClientData): void => {
  if (header.includes('first') && header.includes('name')) {
    client.first_name = sanitized;
  } else if (header.includes('last') && header.includes('name')) {
    client.last_name = sanitized;
  } else if (header.includes('partner') && header.includes('first')) {
    client.partner_first_name = sanitized;
  } else if (header.includes('partner') && header.includes('last')) {
    client.partner_last_name = sanitized;
  } else if (header.includes('email')) {
    client.email = sanitized;
  } else if (header.includes('phone')) {
    client.phone = sanitized;
  } else if (
    (header.includes('wedding') && header.includes('date')) ||
    (header.includes('event') && header.includes('date'))
  ) {
    client.wedding_date = sanitized;
  } else if (header.includes('venue') && !header.includes('address')) {
    client.venue_name = sanitized;
  } else if (
    (header.includes('venue') && header.includes('address')) ||
    header === 'address'
  ) {
    client.venue_address = sanitized;
  } else if (header.includes('guest')) {
    assignNumericField('guest_count', sanitized, client);
  } else if (header.includes('budget')) {
    client.budget_range = sanitized;
  } else if (header.includes('status')) {
    client.status = sanitized.toLowerCase() as any;
  } else if (header.includes('note') || header.includes('comment')) {
    client.notes = sanitized;
  } else if (header.includes('package') && !header.includes('price')) {
    client.package_name = sanitized;
  } else if (
    (header.includes('package') && header.includes('price')) ||
    header.includes('price')
  ) {
    assignNumericField('package_price', sanitized, client);
  } else if (header.includes('priority')) {
    client.priority_level = sanitized.toLowerCase() as any;
  }
};

// Helper function for numeric field assignment - EXTRACTED FROM NESTED IF
const assignNumericField = (fieldName: string, sanitized: string, client: ImportClientData): void => {
  const num = parseInt(sanitized);
  if (!isNaN(num)) {
    (client as any)[fieldName] = num;
  }
};

const parseCSV = (fileBuffer: Buffer): Promise<ImportClientData[]> => {
  return new Promise((resolve, reject) => {
    const fileContent = fileBuffer.toString('utf8');

    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // Normalize headers for mapping
        const normalized = header
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]/g, '_');

        // Map common variations to our schema
        const headerMap: Record<string, string> = {
          first_name: 'first_name',
          firstname: 'first_name',
          client_first_name: 'first_name',
          last_name: 'last_name',
          lastname: 'last_name',
          client_last_name: 'last_name',
          partner_first_name: 'partner_first_name',
          partner_firstname: 'partner_first_name',
          partner_last_name: 'partner_last_name',
          partner_lastname: 'partner_last_name',
          email: 'email',
          email_address: 'email',
          contact_email: 'email',
          phone: 'phone',
          phone_number: 'phone',
          contact_phone: 'phone',
          wedding_date: 'wedding_date',
          event_date: 'wedding_date',
          ceremony_date: 'wedding_date',
          venue_name: 'venue_name',
          venue: 'venue_name',
          location: 'venue_name',
          venue_address: 'venue_address',
          address: 'venue_address',
          guest_count: 'guest_count',
          guests: 'guest_count',
          number_of_guests: 'guest_count',
          budget_range: 'budget_range',
          budget: 'budget_range',
          status: 'status',
          client_status: 'status',
          notes: 'notes',
          comments: 'notes',
          package_name: 'package_name',
          package: 'package_name',
          package_price: 'package_price',
          price: 'package_price',
          priority_level: 'priority_level',
          priority: 'priority_level',
        };

        return headerMap[normalized] || normalized;
      },
      complete: (results) => {
        const clients = (results.data as any[]).map((row: any) => {
          const client: ImportClientData = {};

          // Map and sanitize the data - REDUCED NESTING FROM 6 TO 4 LEVELS
          Object.keys(row).forEach((key) => {
            processClientField(row, key, client);
          });

          // Set defaults
          client.status = client.status || 'lead';

          return client;
        });

        resolve(clients);
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      },
    });
  });
};

const parseExcel = async (fileBuffer: Buffer): Promise<ImportClientData[]> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No worksheet found in Excel file');
  }

  const jsonData: any[][] = [];
  worksheet.eachRow((row, rowNumber) => {
    const rowData: any[] = [];
    row.eachCell((cell, colNumber) => {
      rowData[colNumber - 1] = cell.value;
    });
    jsonData.push(rowData);
  });

  if (jsonData.length < 2) {
    throw new Error(
      'Excel file must contain at least a header row and one data row',
    );
  }

  const headers = jsonData[0].map(
    (h: any) => h?.toString().toLowerCase().trim() || '',
  );
  const rows = jsonData.slice(1);

  return rows
    .map((row: any[]) => {
      const client: ImportClientData = {};

      headers.forEach((header: string, index: number) => {
        const value = row[index]?.toString().trim();
        if (!value) return;

        const sanitized = sanitizeInput(value);
        processExcelField(header, sanitized, client);
      });

      client.status = client.status || 'lead';
      return client;
    })
    .filter((client) => client.first_name || client.email);
};

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check using the comprehensive multi-tier service
    const rateLimitResult = await rateLimitService.checkRateLimit(request);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          tier: rateLimitResult.appliedTier,
          resetTime: rateLimitResult.resetTime,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'X-RateLimit-Tier': rateLimitResult.appliedTier,
          },
        },
      );
    }

    // Authentication check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Get user organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 },
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // File size check (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 },
      );
    }

    // File type validation
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only CSV and Excel files are supported.' },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let clients: ImportClientData[];

    // Parse file based on type
    if (file.type === 'text/csv') {
      clients = await parseCSV(buffer);
    } else {
      clients = await parseExcel(buffer);
    }

    if (clients.length === 0) {
      return NextResponse.json(
        { error: 'No valid client data found in file' },
        { status: 400 },
      );
    }

    // Limit number of clients per import
    if (clients.length > 50000) {
      return NextResponse.json(
        { error: 'Maximum 50,000 clients per import' },
        { status: 400 },
      );
    }

    // Validate all client data
    const allErrors: ImportValidationError[] = [];
    clients.forEach((client, index) => {
      const errors = validateClientData(client, index + 2); // +2 for header row and 1-based indexing
      allErrors.push(...errors);
    });

    // If there are validation errors, return them
    if (allErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation errors found',
          validation_errors: allErrors,
          total_clients: clients.length,
          error_count: allErrors.length,
        },
        { status: 400 },
      );
    }

    // Bulk insert with proper error handling
    const importProgress: ImportProgress = {
      id: crypto.randomUUID(),
      total: clients.length,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      status: 'processing',
    };

    const batchSize = 1000; // Process in batches of 1000
    const batches = [];

    for (let i = 0; i < clients.length; i += batchSize) {
      batches.push(clients.slice(i, i + batchSize));
    }

    const importErrors: ImportValidationError[] = [];
    let successCount = 0;

    // Process batches
    for (const batch of batches) {
      const clientsToInsert = batch.map((client) => ({
        ...client,
        organization_id: profile.organization_id,
        import_source: file.type === 'text/csv' ? 'csv' : 'excel',
        created_by: user.id,
        status: client.status || 'lead',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      try {
        const { data, error } = await supabase
          .from('clients')
          .insert(clientsToInsert)
          .select('id');

        if (error) {
          // Handle duplicate email errors and other constraints
          batch.forEach((_, index) => {
            importErrors.push({
              row: importProgress.processed + index + 2,
              field: 'general',
              message: error.message.includes('unique')
                ? 'Duplicate client (email or phone already exists)'
                : error.message,
            });
          });
        } else {
          successCount += batch.length;
        }
      } catch (error) {
        batch.forEach((_, index) => {
          importErrors.push({
            row: importProgress.processed + index + 2,
            field: 'general',
            message: 'Failed to import client',
          });
        });
      }

      importProgress.processed += batch.length;
    }

    importProgress.successful = successCount;
    importProgress.failed = clients.length - successCount;
    importProgress.errors = importErrors;
    importProgress.status = 'completed';

    // Send notification about import completion (Team E integration)
    if (successCount > 0) {
      try {
        await fetch(`${process.env.NEXTAUTH_URL}/api/notifications/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.id}`,
          },
          body: JSON.stringify({
            recipient_id: user.id,
            template_id: 'import_completed',
            channel: 'in_app',
            data: {
              success_count: successCount,
              total_count: clients.length,
              failed_count: importProgress.failed,
            },
          }),
        });
      } catch (notificationError) {
        // Log error but don't fail the import
        console.error('Failed to send import notification:', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      import_id: importProgress.id,
      total_clients: clients.length,
      successful_imports: successCount,
      failed_imports: importProgress.failed,
      errors: importErrors.slice(0, 100), // Limit error response size
      performance_metrics: {
        file_size_mb: (file.size / (1024 * 1024)).toFixed(2),
        processing_time_ms: Date.now() - Date.now(), // Would need actual timing
        batch_size: batchSize,
        batches_processed: batches.length,
      },
    });
  } catch (error) {
    console.error('Import error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'client-import',
    supported_formats: ['CSV', 'Excel'],
    max_file_size: '50MB',
    max_records: 50000,
    features: [
      'bulk_import',
      'data_validation',
      'progress_tracking',
      'error_reporting',
      'team_integration',
    ],
  });
}
