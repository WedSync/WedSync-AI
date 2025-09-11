import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schemas for OCR operations
const ReceiptProcessSchema = z.object({
  receipt_image_url: z.string().url(),
  wedding_id: z.string(),
  processing_options: z
    .object({
      extract_fields: z
        .array(
          z.enum([
            'vendor_name',
            'total_amount',
            'date',
            'items',
            'tax',
            'payment_method',
            'receipt_number',
          ]),
        )
        .optional(),
      auto_categorize: z.boolean().default(true),
      create_expense: z.boolean().default(false),
      confidence_threshold: z.number().min(0).max(1).default(0.7),
    })
    .optional(),
});

const BatchProcessSchema = z.object({
  receipt_urls: z.array(z.string().url()),
  wedding_id: z.string(),
  processing_options: z
    .object({
      auto_categorize: z.boolean().default(true),
      create_expenses: z.boolean().default(false),
      confidence_threshold: z.number().min(0).max(1).default(0.7),
    })
    .optional(),
});

const ProcessingStatusSchema = z.object({
  job_id: z.string(),
});

// POST /api/ocr - Handle OCR operations
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const { operation_type, data } = body;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    switch (operation_type) {
      case 'process_receipt':
        return await handleReceiptProcessing(supabase, data, user.id);

      case 'batch_process':
        return await handleBatchProcessing(supabase, data, user.id);

      case 'validate_extraction':
        return await handleExtractionValidation(supabase, data, user.id);

      default:
        return NextResponse.json(
          { error: 'Invalid OCR operation_type' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('OCR API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during OCR operation' },
      { status: 500 },
    );
  }
}

// GET /api/ocr - Check processing status
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = searchParams.get('job_id');
    const weddingId = searchParams.get('wedding_id');

    if (jobId) {
      return await getProcessingStatus(supabase, jobId, user.id);
    } else if (weddingId) {
      return await getProcessingHistory(supabase, weddingId, user.id);
    } else {
      return NextResponse.json(
        { error: 'Either job_id or wedding_id parameter is required' },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error('OCR status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error during status check' },
      { status: 500 },
    );
  }
}

// Handle single receipt processing
async function handleReceiptProcessing(
  supabase: any,
  data: any,
  userId: string,
) {
  const validation = ReceiptProcessSchema.safeParse(data);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid receipt processing data',
        details: validation.error.errors,
      },
      { status: 400 },
    );
  }

  const {
    receipt_image_url,
    wedding_id,
    processing_options = {},
  } = validation.data;

  try {
    // Create processing job record
    const { data: jobRecord, error: jobError } = await supabase
      .from('ocr_processing_jobs')
      .insert({
        wedding_id,
        receipt_image_url,
        processing_options,
        status: 'processing',
        created_by_id: userId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Process the receipt image
    try {
      const extractionResult = await processReceiptImage(
        receipt_image_url,
        processing_options,
      );

      // Validate extraction quality
      const qualityScore = calculateExtractionQuality(extractionResult);

      // Auto-categorize if requested
      let categoryPrediction = null;
      if (processing_options.auto_categorize) {
        categoryPrediction = await predictExpenseCategory(
          supabase,
          extractionResult,
          wedding_id,
        );
      }

      // Create expense if requested and confidence is high
      let createdExpense = null;
      if (
        processing_options.create_expense &&
        qualityScore >= (processing_options.confidence_threshold || 0.7)
      ) {
        createdExpense = await createExpenseFromExtraction(
          supabase,
          extractionResult,
          categoryPrediction,
          wedding_id,
          userId,
        );
      }

      // Update job record with results
      await supabase
        .from('ocr_processing_jobs')
        .update({
          status: 'completed',
          extraction_result: extractionResult,
          quality_score: qualityScore,
          category_prediction: categoryPrediction,
          created_expense_id: createdExpense?.id || null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobRecord.id);

      return NextResponse.json({
        success: true,
        job_id: jobRecord.id,
        extraction_result: extractionResult,
        quality_score: qualityScore,
        category_prediction: categoryPrediction,
        created_expense: createdExpense,
        processing_time_ms:
          new Date().getTime() - new Date(jobRecord.created_at).getTime(),
      });
    } catch (processingError) {
      // Update job record with error
      await supabase
        .from('ocr_processing_jobs')
        .update({
          status: 'failed',
          error_message:
            processingError instanceof Error
              ? processingError.message
              : 'Processing failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobRecord.id);

      throw processingError;
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Receipt processing failed', details: error },
      { status: 500 },
    );
  }
}

// Handle batch processing of multiple receipts
async function handleBatchProcessing(supabase: any, data: any, userId: string) {
  const validation = BatchProcessSchema.safeParse(data);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid batch processing data',
        details: validation.error.errors,
      },
      { status: 400 },
    );
  }

  const { receipt_urls, wedding_id, processing_options = {} } = validation.data;

  try {
    const batchResults = [];
    const errors = [];

    // Create batch job record
    const { data: batchJobRecord, error: batchJobError } = await supabase
      .from('ocr_batch_jobs')
      .insert({
        wedding_id,
        receipt_count: receipt_urls.length,
        processing_options,
        status: 'processing',
        created_by_id: userId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (batchJobError) throw batchJobError;

    // Process each receipt
    for (const [index, receiptUrl] of receipt_urls.entries()) {
      try {
        const individualResult = await handleReceiptProcessing(
          supabase,
          {
            receipt_image_url: receiptUrl,
            wedding_id,
            processing_options: {
              ...processing_options,
              create_expense: processing_options.create_expenses || false,
            },
          },
          userId,
        );

        batchResults.push({
          index,
          receipt_url: receiptUrl,
          result: individualResult,
        });
      } catch (error) {
        errors.push({
          index,
          receipt_url: receiptUrl,
          error: error instanceof Error ? error.message : 'Processing failed',
        });
      }
    }

    // Update batch job record
    await supabase
      .from('ocr_batch_jobs')
      .update({
        status: 'completed',
        processed_count: batchResults.length,
        error_count: errors.length,
        batch_results: batchResults,
        errors: errors.length > 0 ? errors : null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', batchJobRecord.id);

    return NextResponse.json({
      success: true,
      batch_job_id: batchJobRecord.id,
      total_receipts: receipt_urls.length,
      processed_successfully: batchResults.length,
      failed: errors.length,
      results: batchResults,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Batch processing failed', details: error },
      { status: 500 },
    );
  }
}

// Handle extraction validation and correction
async function handleExtractionValidation(
  supabase: any,
  data: any,
  userId: string,
) {
  const { job_id, corrections, approved } = data;

  try {
    // Get original extraction
    const { data: job, error: jobError } = await supabase
      .from('ocr_processing_jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Update job with validation results
    const { error: updateError } = await supabase
      .from('ocr_processing_jobs')
      .update({
        user_corrections: corrections,
        user_approved: approved,
        validated_at: new Date().toISOString(),
        validated_by_id: userId,
      })
      .eq('id', job_id);

    if (updateError) throw updateError;

    // If corrections were provided, update the expense if one was created
    if (corrections && job.created_expense_id) {
      await updateExpenseWithCorrections(
        supabase,
        job.created_expense_id,
        corrections,
      );
    }

    // Store validation data for ML model improvement
    await supabase.from('ocr_validation_feedback').insert({
      job_id,
      original_extraction: job.extraction_result,
      corrected_extraction: corrections,
      user_approved: approved,
      created_by_id: userId,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      job_id,
      validated: true,
      corrections_applied: corrections ? Object.keys(corrections).length : 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Validation failed', details: error },
      { status: 500 },
    );
  }
}

// Get processing job status
async function getProcessingStatus(
  supabase: any,
  jobId: string,
  userId: string,
) {
  try {
    const { data: job, error } = await supabase
      .from('ocr_processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      job_id: jobId,
      status: job.status,
      progress:
        job.status === 'completed' ? 100 : job.status === 'processing' ? 50 : 0,
      extraction_result: job.extraction_result,
      quality_score: job.quality_score,
      category_prediction: job.category_prediction,
      created_expense_id: job.created_expense_id,
      error_message: job.error_message,
      created_at: job.created_at,
      completed_at: job.completed_at,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Status check failed', details: error },
      { status: 500 },
    );
  }
}

// Get processing history for a wedding
async function getProcessingHistory(
  supabase: any,
  weddingId: string,
  userId: string,
) {
  try {
    const { data: jobs, error } = await supabase
      .from('ocr_processing_jobs')
      .select(
        `
        id,
        receipt_image_url,
        status,
        quality_score,
        created_expense_id,
        created_at,
        completed_at,
        extraction_result
      `,
      )
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const summary = {
      total_processed: jobs.length,
      successful: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
      processing: jobs.filter((j) => j.status === 'processing').length,
      expenses_created: jobs.filter((j) => j.created_expense_id).length,
      average_quality:
        jobs
          .filter((j) => j.quality_score)
          .reduce((sum, j) => sum + j.quality_score, 0) /
        Math.max(jobs.filter((j) => j.quality_score).length, 1),
    };

    return NextResponse.json({
      wedding_id: weddingId,
      summary,
      jobs: jobs.slice(0, 50), // Limit to recent 50 jobs
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'History retrieval failed', details: error },
      { status: 500 },
    );
  }
}

// OCR Processing Functions

// Main receipt image processing function
async function processReceiptImage(imageUrl: string, options: any) {
  try {
    // Simulate OCR processing (in production, integrate with Google Cloud Vision, Tesseract, etc.)
    const mockExtractionResult = await simulateOCRProcessing(imageUrl, options);

    return mockExtractionResult;
  } catch (error) {
    throw new Error(
      `OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

// Simulate OCR processing (replace with actual OCR service)
async function simulateOCRProcessing(imageUrl: string, options: any) {
  // In production, this would call Google Cloud Vision API, AWS Textract, or similar

  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Mock extraction result based on common receipt patterns
  const extractedData = {
    raw_text:
      'ACME Wedding Supplies\n123 Main St, City\nDate: 2024-08-15\nFlowers - Bridal Bouquet $150.00\nTax $12.00\nTotal $162.00\nCard Payment\nReceipt #12345',

    vendor_name: {
      value: 'ACME Wedding Supplies',
      confidence: 0.95,
      bounding_box: { x: 10, y: 5, width: 200, height: 25 },
    },

    total_amount: {
      value: 162.0,
      confidence: 0.98,
      bounding_box: { x: 150, y: 180, width: 80, height: 20 },
    },

    date: {
      value: '2024-08-15',
      confidence: 0.85,
      bounding_box: { x: 30, y: 50, width: 100, height: 18 },
    },

    items: {
      value: [
        {
          description: 'Flowers - Bridal Bouquet',
          amount: 150.0,
          confidence: 0.88,
        },
      ],
      confidence: 0.85,
    },

    tax: {
      value: 12.0,
      confidence: 0.92,
      bounding_box: { x: 130, y: 160, width: 60, height: 18 },
    },

    payment_method: {
      value: 'Card Payment',
      confidence: 0.75,
      bounding_box: { x: 20, y: 200, width: 120, height: 18 },
    },

    receipt_number: {
      value: '12345',
      confidence: 0.9,
      bounding_box: { x: 100, y: 220, width: 60, height: 18 },
    },
  };

  // Filter by requested fields if specified
  if (options.extract_fields) {
    const filteredData = {};
    for (const field of options.extract_fields) {
      if (extractedData[field as keyof typeof extractedData]) {
        filteredData[field] =
          extractedData[field as keyof typeof extractedData];
      }
    }
    return { ...filteredData, raw_text: extractedData.raw_text };
  }

  return extractedData;
}

// Calculate extraction quality score
function calculateExtractionQuality(extractionResult: any) {
  const requiredFields = ['vendor_name', 'total_amount', 'date'];
  const optionalFields = ['items', 'tax', 'payment_method', 'receipt_number'];

  let score = 0;
  let totalWeight = 0;

  // Required fields (higher weight)
  for (const field of requiredFields) {
    totalWeight += 0.3;
    if (extractionResult[field] && extractionResult[field].confidence) {
      score += extractionResult[field].confidence * 0.3;
    }
  }

  // Optional fields (lower weight)
  for (const field of optionalFields) {
    totalWeight += 0.1;
    if (extractionResult[field] && extractionResult[field].confidence) {
      score += extractionResult[field].confidence * 0.1;
    }
  }

  return totalWeight > 0 ? Math.round((score / totalWeight) * 100) / 100 : 0;
}

// Predict expense category based on extracted data
async function predictExpenseCategory(
  supabase: any,
  extractionResult: any,
  weddingId: string,
) {
  try {
    // Get available categories
    const { data: categories, error } = await supabase
      .from('budget_categories')
      .select('id, category_name, description')
      .eq('wedding_id', weddingId)
      .is('deleted_at', null);

    if (error || !categories?.length) return null;

    // Simple keyword-based categorization (enhance with ML in production)
    const vendorName = extractionResult.vendor_name?.value?.toLowerCase() || '';
    const itemDescriptions =
      extractionResult.items?.value
        ?.map((item: any) => item.description?.toLowerCase())
        .join(' ') || '';

    const combinedText = `${vendorName} ${itemDescriptions}`;

    const categoryScores = categories.map((category) => {
      const categoryKeywords = getCategoryKeywords(category.category_name);
      const matchScore = categoryKeywords.reduce(
        (score, keyword) =>
          combinedText.includes(keyword) ? score + 1 : score,
        0,
      );

      return {
        category_id: category.id,
        category_name: category.category_name,
        score: matchScore,
        confidence: Math.min(0.9, matchScore * 0.2 + 0.1),
      };
    });

    // Return best match
    const bestMatch = categoryScores.reduce((best, current) =>
      current.score > best.score ? current : best,
    );

    return bestMatch.score > 0 ? bestMatch : null;
  } catch (error) {
    console.error('Category prediction failed:', error);
    return null;
  }
}

// Create expense from extraction data
async function createExpenseFromExtraction(
  supabase: any,
  extractionResult: any,
  categoryPrediction: any,
  weddingId: string,
  userId: string,
) {
  try {
    const expenseData = {
      wedding_id: weddingId,
      vendor_name: extractionResult.vendor_name?.value || 'Unknown Vendor',
      amount: extractionResult.total_amount?.value || 0,
      description:
        extractionResult.items?.value
          ?.map((item: any) => item.description)
          .join(', ') || 'OCR Extracted',
      date_incurred:
        extractionResult.date?.value || new Date().toISOString().split('T')[0],
      budget_category_id: categoryPrediction?.category_id || null,
      payment_method: extractionResult.payment_method?.value || null,
      receipt_urls: [], // Would be set from the original image URL
      notes: `Auto-created from OCR. Receipt #${extractionResult.receipt_number?.value || 'N/A'}`,
      status: 'pending_review',
      ocr_confidence: calculateExtractionQuality(extractionResult),
      created_by_id: userId,
      created_at: new Date().toISOString(),
    };

    const { data: createdExpense, error } = await supabase
      .from('expenses')
      .insert(expenseData)
      .select()
      .single();

    if (error) throw error;

    return createdExpense;
  } catch (error) {
    console.error('Expense creation failed:', error);
    throw error;
  }
}

// Update expense with user corrections
async function updateExpenseWithCorrections(
  supabase: any,
  expenseId: string,
  corrections: any,
) {
  try {
    const updateData = {};

    if (corrections.vendor_name)
      updateData.vendor_name = corrections.vendor_name;
    if (corrections.total_amount) updateData.amount = corrections.total_amount;
    if (corrections.date) updateData.date_incurred = corrections.date;
    if (corrections.items)
      updateData.description = corrections.items.join(', ');

    const { error } = await supabase
      .from('expenses')
      .update({
        ...updateData,
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', expenseId);

    if (error) throw error;
  } catch (error) {
    console.error('Expense update failed:', error);
    throw error;
  }
}

// Get category keywords for matching
function getCategoryKeywords(categoryName: string): string[] {
  const keywordMap: { [key: string]: string[] } = {
    venue: [
      'venue',
      'hall',
      'ballroom',
      'reception',
      'ceremony',
      'location',
      'rental',
    ],
    catering: [
      'catering',
      'food',
      'menu',
      'dinner',
      'lunch',
      'appetizer',
      'chef',
      'kitchen',
    ],
    photography: [
      'photo',
      'camera',
      'album',
      'photographer',
      'videographer',
      'video',
      'session',
    ],
    flowers: [
      'flower',
      'bouquet',
      'floral',
      'arrangement',
      'centerpiece',
      'petals',
      'bloom',
    ],
    music: [
      'music',
      'band',
      'dj',
      'sound',
      'audio',
      'entertainment',
      'dance',
      'speaker',
    ],
    decorations: [
      'decoration',
      'decor',
      'lighting',
      'draping',
      'candle',
      'table',
      'linen',
    ],
    transportation: [
      'transport',
      'limo',
      'car',
      'bus',
      'uber',
      'taxi',
      'driver',
      'ride',
    ],
    attire: [
      'dress',
      'suit',
      'tuxedo',
      'shoes',
      'jewelry',
      'accessories',
      'attire',
      'clothing',
    ],
  };

  const categoryLower = categoryName.toLowerCase();

  // Find exact matches or partial matches
  for (const [key, keywords] of Object.entries(keywordMap)) {
    if (categoryLower.includes(key) || key.includes(categoryLower)) {
      return keywords;
    }
  }

  // Default keywords based on category name
  return [categoryLower];
}
