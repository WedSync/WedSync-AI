import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSecureId } from '@/lib/crypto-utils';
import { z } from 'zod';

// Validation schema
const createFormSchema = z.object({
  pdfId: z.string().uuid(),
  mapping: z.record(z.string()),
  fields: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      label: z.string(),
      value: z.string(),
      confidence: z.number(),
    }),
  ),
});

// Wedding core fields configuration
const WEDDING_CORE_FIELDS = {
  bride_name: {
    label: 'Bride Name',
    type: 'text',
    required: true,
    placeholder: "Enter bride's full name",
  },
  groom_name: {
    label: 'Groom Name',
    type: 'text',
    required: true,
    placeholder: "Enter groom's full name",
  },
  wedding_date: {
    label: 'Wedding Date',
    type: 'date',
    required: true,
    placeholder: 'Select wedding date',
  },
  venue_name: {
    label: 'Venue Name',
    type: 'text',
    required: false,
    placeholder: 'Enter venue name',
  },
  venue_address: {
    label: 'Venue Address',
    type: 'textarea',
    required: false,
    placeholder: 'Enter complete venue address',
  },
  email: {
    label: 'Primary Email',
    type: 'email',
    required: true,
    placeholder: 'Enter primary email address',
  },
  phone: {
    label: 'Primary Phone',
    type: 'tel',
    required: true,
    placeholder: 'Enter primary phone number',
  },
  guest_count: {
    label: 'Guest Count',
    type: 'number',
    required: false,
    placeholder: 'Approximate number of guests',
  },
  budget: {
    label: 'Budget',
    type: 'number',
    required: false,
    placeholder: 'Enter budget amount',
  },
  ceremony_time: {
    label: 'Ceremony Time',
    type: 'time',
    required: false,
    placeholder: 'Select ceremony time',
  },
  reception_time: {
    label: 'Reception Time',
    type: 'time',
    required: false,
    placeholder: 'Select reception time',
  },
  coordinator_name: {
    label: 'Wedding Coordinator',
    type: 'text',
    required: false,
    placeholder: 'Enter coordinator name',
  },
  coordinator_phone: {
    label: 'Coordinator Phone',
    type: 'tel',
    required: false,
    placeholder: 'Enter coordinator phone',
  },
  emergency_contact: {
    label: 'Emergency Contact',
    type: 'text',
    required: false,
    placeholder: 'Enter emergency contact info',
  },
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const { pdfId, mapping, fields } = createFormSchema.parse(body);

    // Verify PDF belongs to user's organization
    const { data: pdfImport, error: pdfError } = await supabase
      .from('pdf_imports')
      .select('*')
      .eq('id', pdfId)
      .single();

    if (pdfError || !pdfImport) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }

    // Create form structure
    const formId = generateSecureId(16);
    const formFields: any[] = [];
    let fieldOrder = 1;

    // Add mapped core fields
    Object.entries(mapping).forEach(([coreFieldId, detectedFieldId]) => {
      const coreFieldConfig =
        WEDDING_CORE_FIELDS[coreFieldId as keyof typeof WEDDING_CORE_FIELDS];
      const detectedField = fields.find((f) => f.id === detectedFieldId);

      if (coreFieldConfig && detectedField) {
        formFields.push({
          id: generateSecureId(12),
          type: coreFieldConfig.type,
          label: coreFieldConfig.label,
          placeholder: coreFieldConfig.placeholder,
          helperText: `Extracted from PDF with ${Math.round(detectedField.confidence * 100)}% confidence`,
          defaultValue: detectedField.value,
          validation: {
            required: coreFieldConfig.required,
          },
          width: 'full',
          order: fieldOrder++,
        });
      }
    });

    // Add unmapped high-confidence fields as additional fields
    const unmappedFields = fields.filter(
      (field) =>
        !Object.values(mapping).includes(field.id) && field.confidence >= 0.8,
    );

    unmappedFields.forEach((field) => {
      formFields.push({
        id: generateSecureId(12),
        type: field.type,
        label: field.label,
        placeholder: `Additional field from PDF`,
        helperText: `Extracted with ${Math.round(field.confidence * 100)}% confidence`,
        defaultValue: field.value,
        validation: {
          required: false,
        },
        width: 'full',
        order: fieldOrder++,
      });
    });

    // Create the form in database
    const { data: formData, error: formError } = await supabase
      .from('forms')
      .insert({
        id: formId,
        title: `Form from ${pdfImport.original_filename}`,
        description: `Auto-generated form from PDF import with ${formFields.length} fields`,
        fields: formFields,
        settings: {
          allowAnonymous: false,
          requireAuth: true,
          submitOnce: false,
          showProgress: true,
          confirmationMessage: 'Thank you for your submission!',
          pdfSource: {
            pdfId: pdfImport.id,
            filename: pdfImport.original_filename,
            confidence: pdfImport.ocr_confidence,
            fieldsExtracted: fields.length,
            fieldsMapped: Object.keys(mapping).length,
            createdAt: new Date().toISOString(),
          },
        },
        status: 'draft',
        organization_id: pdfImport.organization_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (formError) {
      throw new Error(`Failed to create form: ${formError.message}`);
    }

    // Update PDF import with generated form ID
    await supabase
      .from('pdf_imports')
      .update({
        generated_form_id: formId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pdfId);

    return NextResponse.json({
      success: true,
      formId: formId,
      fieldsCreated: formFields.length,
      mappedFields: Object.keys(mapping).length,
      additionalFields: unmappedFields.length,
      form: formData,
    });
  } catch (error) {
    console.error('Form creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create form',
        success: false,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const pdfId = searchParams.get('pdfId');

    if (!pdfId) {
      return NextResponse.json(
        { error: 'PDF ID is required' },
        { status: 400 },
      );
    }

    // Get user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if form already exists for this PDF
    const { data: pdfImport, error: pdfError } = await supabase
      .from('pdf_imports')
      .select('*, forms(*)')
      .eq('id', pdfId)
      .single();

    if (pdfError || !pdfImport) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }

    return NextResponse.json({
      hasExistingForm: !!pdfImport.generated_form_id,
      formId: pdfImport.generated_form_id,
      formData: pdfImport.forms || null,
      canCreateForm:
        pdfImport.status === 'completed' &&
        pdfImport.detected_fields?.length > 0,
    });
  } catch (error) {
    console.error('Form check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
