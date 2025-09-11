import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';

const ScanReceiptSchema = z.object({
  weddingId: z.string().uuid(),
});

// Mock OCR service - In production, this would integrate with services like:
// - Google Cloud Vision API
// - AWS Textract
// - Azure Computer Vision
// - Tesseract.js for client-side processing
async function processReceiptOCR(imageBuffer: Buffer, mimeType: string) {
  // This is a mock implementation
  // In a real implementation, you would send the image to an OCR service

  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Mock extracted data - in production this would come from the OCR service
  const mockData = {
    vendor_name: 'Sample Wedding Vendor',
    amount: Math.floor(Math.random() * 2000) + 100, // Random amount between 100-2100
    date: new Date().toISOString().split('T')[0],
    items: [
      {
        description: 'Wedding service fee',
        price: Math.floor(Math.random() * 800) + 200,
      },
      {
        description: 'Additional charges',
        price: Math.floor(Math.random() * 300) + 50,
      },
    ],
    suggested_category: {
      name: 'Venue & Reception',
      confidence: Math.floor(Math.random() * 30) + 70, // 70-100% confidence
      id: 'venue-reception',
    },
    tax_amount: Math.floor(Math.random() * 150) + 20,
    payment_method: 'credit_card',
    receipt_number: `RCP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
  };

  return mockData;
}

// Smart categorization based on vendor name and description
function suggestCategory(vendorName: string, description?: string) {
  const vendorLower = vendorName.toLowerCase();
  const descLower = (description || '').toLowerCase();

  const categoryMappings = [
    {
      keywords: ['venue', 'hall', 'reception', 'ballroom', 'manor', 'estate'],
      category: {
        name: 'Venue & Reception',
        confidence: 95,
        id: 'venue-reception',
      },
    },
    {
      keywords: ['photo', 'camera', 'shoot', 'album', 'photographer'],
      category: { name: 'Photography', confidence: 90, id: 'photography' },
    },
    {
      keywords: ['flower', 'floral', 'bouquet', 'centerpiece', 'decoration'],
      category: {
        name: 'Flowers & Decorations',
        confidence: 88,
        id: 'flowers-decorations',
      },
    },
    {
      keywords: ['catering', 'food', 'menu', 'dining', 'chef', 'cuisine'],
      category: { name: 'Catering', confidence: 92, id: 'catering' },
    },
    {
      keywords: ['music', 'dj', 'band', 'sound', 'entertainment', 'audio'],
      category: {
        name: 'Music & Entertainment',
        confidence: 85,
        id: 'music-entertainment',
      },
    },
    {
      keywords: ['dress', 'gown', 'tuxedo', 'suit', 'attire', 'fashion'],
      category: { name: 'Attire', confidence: 90, id: 'attire' },
    },
    {
      keywords: ['transport', 'car', 'limo', 'uber', 'taxi', 'travel'],
      category: {
        name: 'Transportation',
        confidence: 80,
        id: 'transportation',
      },
    },
    {
      keywords: ['invitation', 'card', 'print', 'stationery', 'paper'],
      category: {
        name: 'Invitations & Stationery',
        confidence: 85,
        id: 'invitations-stationery',
      },
    },
  ];

  for (const mapping of categoryMappings) {
    if (
      mapping.keywords.some(
        (keyword) =>
          vendorLower.includes(keyword) || descLower.includes(keyword),
      )
    ) {
      return mapping.category;
    }
  }

  // Default category
  return { name: 'Miscellaneous', confidence: 60, id: 'miscellaneous' };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const weddingId = formData.get('weddingId') as string;

    if (!imageFile || !weddingId) {
      return NextResponse.json(
        { error: 'Missing image file or wedding ID' },
        { status: 400 },
      );
    }

    // Validate wedding ID
    const validation = ScanReceiptSchema.safeParse({ weddingId });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid wedding ID' },
        { status: 400 },
      );
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

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageFile.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum 10MB allowed.' },
        { status: 400 },
      );
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    // Process with OCR
    let ocrResults;
    try {
      ocrResults = await processReceiptOCR(imageBuffer, imageFile.type);
    } catch (ocrError) {
      console.error('OCR processing error:', ocrError);
      return NextResponse.json(
        {
          error:
            'Failed to process receipt image. Please try with a clearer image.',
        },
        { status: 422 },
      );
    }

    // Enhance with smart categorization
    const enhancedCategory = suggestCategory(
      ocrResults.vendor_name,
      ocrResults.items?.[0]?.description,
    );

    // Prepare response data
    const scannedData = {
      vendor_name: ocrResults.vendor_name,
      amount: parseFloat(ocrResults.amount.toString()),
      date: ocrResults.date,
      items: ocrResults.items.map((item) => ({
        description: item.description,
        price: parseFloat(item.price.toString()),
      })),
      suggested_category: enhancedCategory,
      tax_amount: ocrResults.tax_amount
        ? parseFloat(ocrResults.tax_amount.toString())
        : undefined,
      payment_method: ocrResults.payment_method,
      receipt_number: ocrResults.receipt_number,
      processing_metadata: {
        confidence_score: enhancedCategory.confidence,
        processing_time: new Date().toISOString(),
        image_size: imageFile.size,
        image_type: imageFile.type,
        stored_file_path: undefined as string | undefined,
      },
    };

    // Optional: Store the image in Supabase Storage for future reference
    try {
      const fileName = `receipts/${weddingId}/${Date.now()}-${imageFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('wedding-documents')
        .upload(fileName, imageBuffer, {
          contentType: imageFile.type,
          metadata: {
            wedding_id: weddingId,
            user_id: user.id,
            document_type: 'receipt',
            ocr_processed: 'true',
          },
        });

      if (!uploadError && uploadData) {
        scannedData.processing_metadata = {
          ...scannedData.processing_metadata,
          stored_file_path: uploadData.path,
        };
      }
    } catch (storageError) {
      // Log but don't fail the request if storage fails
      console.warn('Receipt image storage failed:', storageError);
    }

    // Log activity
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      wedding_id: weddingId,
      action: 'scan_receipt',
      resource_type: 'receipt',
      metadata: {
        vendor_name: ocrResults.vendor_name,
        amount: scannedData.amount,
        suggested_category: enhancedCategory.name,
        confidence: enhancedCategory.confidence,
        file_size: imageFile.size,
      },
    });

    return NextResponse.json({
      success: true,
      data: scannedData,
      meta: {
        processing_time: '2.1s', // Mock processing time
        confidence: enhancedCategory.confidence,
        suggestions: [
          'Review vendor name for accuracy',
          'Verify amount matches receipt total',
          'Check suggested category is appropriate',
        ],
      },
    });
  } catch (error) {
    console.error('Receipt scan API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Additional endpoint for bulk receipt processing
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { weddingId, receipts } = await request.json();

    // Validate input
    if (!weddingId || !Array.isArray(receipts)) {
      return NextResponse.json(
        { error: 'Invalid bulk receipt data' },
        { status: 400 },
      );
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

    // Process each receipt (limit to 10 for performance)
    const results = [];
    const maxBatchSize = 10;
    const receiptsToProcess = receipts.slice(0, maxBatchSize);

    for (const receipt of receiptsToProcess) {
      try {
        // Add receipt to budget transactions
        const { data: transaction, error: transactionError } = await supabase
          .from('budget_transactions')
          .insert({
            wedding_id: weddingId,
            category_id: receipt.category_id,
            amount: -Math.abs(receipt.amount), // Negative for expenses
            description: receipt.description,
            vendor_name: receipt.vendor_name,
            transaction_date: receipt.date,
            payment_method: receipt.payment_method,
            receipt_number: receipt.receipt_number,
            user_id: user.id,
            metadata: {
              source: 'ocr_scan',
              confidence: receipt.confidence,
              items: receipt.items,
            },
          })
          .select()
          .single();

        if (transactionError) {
          results.push({
            receipt_id: receipt.id,
            success: false,
            error: transactionError.message,
          });
        } else {
          results.push({
            receipt_id: receipt.id,
            success: true,
            transaction_id: transaction.id,
          });
        }
      } catch (error) {
        results.push({
          receipt_id: receipt.id,
          success: false,
          error: 'Processing failed',
        });
      }
    }

    // Log bulk activity
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      wedding_id: weddingId,
      action: 'bulk_process_receipts',
      resource_type: 'receipts',
      metadata: {
        total_receipts: receiptsToProcess.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        processed: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      },
    });
  } catch (error) {
    console.error('Bulk receipt processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
