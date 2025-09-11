import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAuth } from '@/lib/auth-middleware';
import {
  detectCoreFieldFromLabel,
  validateCoreFieldValue,
  CORE_FIELDS,
} from '@/types/core-fields';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Input schema - matches what Session B sends
const extractRequestSchema = z.object({
  processId: z.string().optional(),
  uploadId: z.string().optional(),
  extractedData: z.object({
    fields: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
        confidence: z.number().min(0).max(1),
        pageNumber: z.number().optional(),
        boundingBox: z
          .object({
            x: z.number(),
            y: z.number(),
            width: z.number(),
            height: z.number(),
          })
          .optional(),
      }),
    ),
    text: z.string().optional(),
    pageCount: z.number(),
    extractionTime: z.number(),
  }),
});

// Output format for Session A's UI
interface CoreFieldExtraction {
  fieldKey: string;
  value: any;
  confidence: number;
  source: 'ocr' | 'pattern' | 'manual';
  originalLabel: string;
  pageNumber?: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authentication
    const authResult = await validateAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const { processId, uploadId, extractedData } =
      extractRequestSchema.parse(body);

    // Process extracted fields and map to core fields
    const mappedFields: CoreFieldExtraction[] = [];
    const unmappedFields: typeof extractedData.fields = [];

    for (const field of extractedData.fields) {
      // Detect which core field this maps to
      const detection = detectCoreFieldFromLabel(field.label);

      if (detection.field_key && detection.confidence > 0.5) {
        // Validate the value against core field rules
        const validation = validateCoreFieldValue(
          detection.field_key,
          field.value,
        );

        if (validation.valid) {
          // Combine OCR confidence with detection confidence
          const combinedConfidence =
            field.confidence * 0.7 + detection.confidence * 0.3;

          mappedFields.push({
            fieldKey: detection.field_key,
            value: formatFieldValue(detection.field_key, field.value),
            confidence: combinedConfidence,
            source: field.confidence > 0.8 ? 'ocr' : 'pattern',
            originalLabel: field.label,
            pageNumber: field.pageNumber,
          });
        } else {
          console.warn(
            `Validation failed for ${detection.field_key}: ${validation.error}`,
          );
          unmappedFields.push(field);
        }
      } else {
        unmappedFields.push(field);
      }
    }

    // Apply business rules and heuristics to improve accuracy
    const enhancedFields = applyBusinessRules(mappedFields, extractedData.text);

    // Calculate overall accuracy
    const overallConfidence =
      enhancedFields.length > 0
        ? enhancedFields.reduce((acc, f) => acc + f.confidence, 0) /
          enhancedFields.length
        : 0;

    // Store extraction results in database
    if (processId || uploadId) {
      await storeExtractionResults(
        authResult.user.id,
        processId || uploadId || '',
        enhancedFields,
        unmappedFields,
      );
    }

    // Format response for UI consumption
    const response = {
      success: true,
      fields: Object.fromEntries(
        enhancedFields.map((f) => [f.fieldKey, f.value]),
      ),
      confidence: Object.fromEntries(
        enhancedFields.map((f) => [f.fieldKey, f.confidence]),
      ),
      metadata: {
        fieldsExtracted: enhancedFields.length,
        fieldsUnmapped: unmappedFields.length,
        overallConfidence,
        processingTimeMs: Date.now() - startTime,
        pageCount: extractedData.pageCount,
      },
      unmappedFields: unmappedFields.map((f) => ({
        label: f.label,
        value: f.value,
        suggestion: getSuggestion(f.label),
      })),
    };

    // Ensure sub-500ms response time
    if (response.metadata.processingTimeMs > 500) {
      console.warn(`Slow extraction: ${response.metadata.processingTimeMs}ms`);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Core fields extraction error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to extract core fields' },
      { status: 500 },
    );
  }
}

// Format field value based on type
function formatFieldValue(fieldKey: string, value: string): any {
  const fieldDef = CORE_FIELDS[fieldKey];
  if (!fieldDef) return value;

  switch (fieldDef.field_type) {
    case 'number':
      return parseInt(value.replace(/\D/g, ''), 10);

    case 'date':
      // Try multiple date formats
      const dateFormats = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
        /(\d{4})-(\d{2})-(\d{2})/,
        /(\w+)\s+(\d{1,2}),?\s+(\d{4})/,
      ];
      for (const format of dateFormats) {
        const match = value.match(format);
        if (match) {
          return new Date(value).toISOString().split('T')[0];
        }
      }
      return value;

    case 'time':
      // Convert to HH:MM format
      const timeMatch = value.match(/(\d{1,2}):?(\d{2})\s*(am|pm)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const period = timeMatch[3]?.toLowerCase();

        if (period === 'pm' && hours !== 12) hours += 12;
        if (period === 'am' && hours === 12) hours = 0;

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
      return value;

    case 'email':
      return value.toLowerCase().trim();

    case 'tel':
      // Format phone number
      const digits = value.replace(/\D/g, '');
      if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      }
      return value;

    default:
      return value.trim();
  }
}

// Apply wedding industry business rules
function applyBusinessRules(
  fields: CoreFieldExtraction[],
  fullText?: string,
): CoreFieldExtraction[] {
  const enhanced = [...fields];

  // If we have a wedding date, boost confidence for all fields
  const weddingDateField = enhanced.find((f) => f.fieldKey === 'wedding_date');
  if (weddingDateField && weddingDateField.confidence > 0.8) {
    enhanced.forEach((field) => {
      if (field !== weddingDateField) {
        field.confidence = Math.min(1, field.confidence * 1.1);
      }
    });
  }

  // Check for venue consistency
  const ceremonyVenue = enhanced.find(
    (f) => f.fieldKey === 'ceremony_venue_name',
  );
  const receptionVenue = enhanced.find(
    (f) => f.fieldKey === 'reception_venue_name',
  );

  if (
    ceremonyVenue &&
    receptionVenue &&
    ceremonyVenue.value === receptionVenue.value
  ) {
    // Same venue for ceremony and reception is common, boost confidence
    ceremonyVenue.confidence = Math.min(1, ceremonyVenue.confidence * 1.15);
    receptionVenue.confidence = Math.min(1, receptionVenue.confidence * 1.15);
  }

  // Validate guest counts
  const totalGuests = enhanced.find((f) => f.fieldKey === 'guest_count');
  const adultGuests = enhanced.find((f) => f.fieldKey === 'adult_guests');
  const childGuests = enhanced.find((f) => f.fieldKey === 'child_guests');

  if (totalGuests && adultGuests && childGuests) {
    const calculatedTotal =
      (adultGuests.value as number) + (childGuests.value as number);
    if (Math.abs(calculatedTotal - (totalGuests.value as number)) <= 5) {
      // Guest counts add up correctly, boost confidence
      totalGuests.confidence = Math.min(1, totalGuests.confidence * 1.2);
    }
  }

  // Check timeline consistency
  const timeFields = enhanced.filter((f) => f.fieldKey.includes('_time'));
  if (timeFields.length > 2) {
    // Sort times and check if they're in logical order
    const sortedTimes = timeFields
      .map((f) => ({ ...f, timeValue: parseTime(f.value as string) }))
      .sort((a, b) => a.timeValue - b.timeValue);

    let isLogical = true;
    for (let i = 1; i < sortedTimes.length; i++) {
      if (sortedTimes[i].timeValue - sortedTimes[i - 1].timeValue < 30) {
        // Less than 30 minutes between events is suspicious
        isLogical = false;
        break;
      }
    }

    if (isLogical) {
      timeFields.forEach((field) => {
        field.confidence = Math.min(1, field.confidence * 1.1);
      });
    }
  }

  return enhanced;
}

// Parse time string to minutes since midnight
function parseTime(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }
  return 0;
}

// Get suggestion for unmapped field
function getSuggestion(label: string): string | null {
  const normalized = label.toLowerCase();

  // Common wedding terms that might not be core fields
  if (normalized.includes('planner') || normalized.includes('coordinator')) {
    return 'Consider adding as a vendor contact';
  }
  if (normalized.includes('budget') || normalized.includes('cost')) {
    return 'Financial information - handle separately';
  }
  if (normalized.includes('menu') || normalized.includes('food')) {
    return 'Catering details - vendor specific';
  }
  if (
    normalized.includes('music') ||
    normalized.includes('dj') ||
    normalized.includes('band')
  ) {
    return 'Entertainment details - vendor specific';
  }

  return null;
}

// Store extraction results in database
async function storeExtractionResults(
  userId: string,
  referenceId: string,
  mappedFields: CoreFieldExtraction[],
  unmappedFields: any[],
) {
  try {
    const { error } = await supabase.from('core_field_extractions').insert({
      user_id: userId,
      reference_id: referenceId,
      mapped_fields: mappedFields,
      unmapped_fields: unmappedFields,
      extraction_timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to store extraction results:', error);
    }
  } catch (error) {
    console.error('Error storing extraction results:', error);
  }
}

// GET endpoint to check extraction status
export async function GET(request: NextRequest) {
  try {
    const authResult = await validateAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const referenceId = searchParams.get('referenceId');

    if (!referenceId) {
      return NextResponse.json(
        { error: 'Reference ID required' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('core_field_extractions')
      .select('*')
      .eq('reference_id', referenceId)
      .eq('user_id', authResult.user.id)
      .order('extraction_timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Extraction not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      extraction: data,
    });
  } catch (error) {
    console.error('Get extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to get extraction' },
      { status: 500 },
    );
  }
}
