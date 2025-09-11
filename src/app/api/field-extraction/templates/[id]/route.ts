/**
 * Field Extraction Template Management API Route
 * WS-122: Automated Field Extraction from Documents
 * GET/PUT/DELETE /api/field-extraction/templates/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldExtractionService } from '@/lib/services/field-extraction-service';
import { ExtractionTemplate } from '@/types/field-extraction';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    const extractionService = new FieldExtractionService();
    const template = await extractionService.getTemplate(id);

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Template retrieved successfully',
    });
  } catch (error: any) {
    console.error('Get template error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message || 'Failed to get template',
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const updates: Partial<ExtractionTemplate> = await request.json();

    const extractionService = new FieldExtractionService();

    // Check if template exists
    const existingTemplate = await extractionService.getTemplate(id);
    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 },
      );
    }

    // Validate fields if provided
    if (updates.fields) {
      for (const field of updates.fields) {
        if (!field.name || !field.type) {
          return NextResponse.json(
            { error: 'Field name and type are required for all fields' },
            { status: 400 },
          );
        }
      }
    }

    const updatedTemplate = await extractionService.updateTemplate(id, updates);

    console.log('Template updated:', {
      id: updatedTemplate.id,
      name: updatedTemplate.name,
      fieldCount: updatedTemplate.fields.length,
    });

    return NextResponse.json({
      success: true,
      data: updatedTemplate,
      message: 'Template updated successfully',
    });
  } catch (error: any) {
    console.error('Update template error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message || 'Failed to update template',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    const extractionService = new FieldExtractionService();

    // Check if template exists
    const existingTemplate = await extractionService.getTemplate(id);
    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 },
      );
    }

    // Check if template is being used
    const isInUse = await extractionService.isTemplateInUse(id);
    if (isInUse) {
      return NextResponse.json(
        { error: 'Cannot delete template that is currently in use' },
        { status: 409 },
      );
    }

    await extractionService.deleteTemplate(id);

    console.log('Template deleted:', {
      id,
      name: existingTemplate.name,
    });

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete template error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message || 'Failed to delete template',
      },
      { status: 500 },
    );
  }
}
