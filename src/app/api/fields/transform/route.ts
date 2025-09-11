import { NextRequest, NextResponse } from 'next/server';
import { fieldEngine } from '@/lib/field-engine/FieldEngine';
import { FormField } from '@/types/forms';
import { z } from 'zod';

// Validation schemas
const transformFieldSchema = z.object({
  field: z.object({
    id: z.string(),
    type: z.string(),
    label: z.string(),
    defaultValue: z.any().optional(),
    validation: z.any().optional(),
  }),
  value: z.any(),
  options: z
    .object({
      normalize: z.boolean().default(true),
      sanitize: z.boolean().default(true),
      validate: z.boolean().default(false),
      applyDefaults: z.boolean().default(true),
    })
    .optional(),
});

const transformMultipleFieldsSchema = z.object({
  fields: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      label: z.string(),
      defaultValue: z.any().optional(),
      validation: z.any().optional(),
    }),
  ),
  values: z.record(z.any()),
  options: z
    .object({
      normalize: z.boolean().default(true),
      sanitize: z.boolean().default(true),
      validate: z.boolean().default(false),
      applyDefaults: z.boolean().default(true),
    })
    .optional(),
});

const evaluateConditionalLogicSchema = z.object({
  field: z.object({
    id: z.string(),
    conditionalLogic: z
      .object({
        show: z.boolean(),
        when: z.string(),
        equals: z.any(),
      })
      .optional(),
  }),
  allValues: z.record(z.any()),
});

/**
 * POST /api/fields/transform - Transform field values
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Determine operation type
    if (body.operation === 'conditional') {
      // Evaluate conditional logic
      const { field, allValues } = evaluateConditionalLogicSchema.parse(body);

      const shouldShow = fieldEngine.evaluateConditionalLogic(
        field as FormField,
        allValues,
      );

      return NextResponse.json({
        success: true,
        data: {
          fieldId: field.id,
          shouldShow,
          conditionalLogic: field.conditionalLogic,
        },
      });
    } else if (body.field && body.value !== undefined) {
      // Single field transformation
      const { field, value, options } = transformFieldSchema.parse(body);

      const transformOptions = options || {
        normalize: true,
        sanitize: true,
        validate: false,
        applyDefaults: true,
      };

      // Transform the value
      const transformedValue = fieldEngine.transformField(
        field as FormField,
        value,
        transformOptions,
      );

      let validationResult = undefined;
      if (transformOptions.validate) {
        validationResult = fieldEngine.validateField(
          field as FormField,
          transformedValue,
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          fieldId: field.id,
          originalValue: value,
          transformedValue,
          transformation: {
            normalized: transformOptions.normalize,
            sanitized: transformOptions.sanitize,
            defaultsApplied: transformOptions.applyDefaults,
          },
          validation: validationResult,
        },
      });
    } else if (body.fields && body.values) {
      // Multiple fields transformation
      const { fields, values, options } =
        transformMultipleFieldsSchema.parse(body);

      const transformOptions = options || {
        normalize: true,
        sanitize: true,
        validate: false,
        applyDefaults: true,
      };

      const transformedData: any = {};
      const transformationLog: any = {};
      let validationResults = undefined;

      // Transform each field value
      fields.forEach((field) => {
        const originalValue = values[field.id];
        const transformedValue = fieldEngine.transformField(
          field as FormField,
          originalValue,
          transformOptions,
        );

        transformedData[field.id] = transformedValue;
        transformationLog[field.id] = {
          originalValue,
          transformedValue,
          changed: originalValue !== transformedValue,
        };
      });

      // Validate all fields if requested
      if (transformOptions.validate) {
        validationResults = fieldEngine.validateFields(
          fields as FormField[],
          transformedData,
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          transformedValues: transformedData,
          transformationLog,
          summary: {
            totalFields: fields.length,
            changedFields: Object.values(transformationLog).filter(
              (log: any) => log.changed,
            ).length,
            options: transformOptions,
          },
          validation: validationResults,
        },
      });
    } else {
      return NextResponse.json(
        {
          error:
            'Invalid request format. Expected {field, value} or {fields, values} or {operation: "conditional", field, allValues}',
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error('POST /api/fields/transform error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
