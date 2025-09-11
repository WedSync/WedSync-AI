// WS-119: Portfolio Management API
// Team B Batch 9 Round 2

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { portfolioService } from '@/lib/services/portfolioService';
import { z } from 'zod';

// Request validation schemas
const createProjectSchema = z.object({
  vendor_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  event_type: z.string().optional(),
  event_date: z.string().optional(),
  location: z.string().optional(),
  client_name: z.string().optional(),
  featured: z.boolean().default(false),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({}),
});

const updateProjectSchema = createProjectSchema.partial().omit(['vendor_id']);

const projectFiltersSchema = z.object({
  vendor_id: z.string().uuid(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  featured_only: z.boolean().optional(),
  event_type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  date_range: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const filters = projectFiltersSchema.parse({
      vendor_id: searchParams.get('vendor_id'),
      status: searchParams.get('status') || undefined,
      featured_only: searchParams.get('featured_only') === 'true',
      event_type: searchParams.get('event_type') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      date_range:
        searchParams.get('start') && searchParams.get('end')
          ? {
              start: searchParams.get('start')!,
              end: searchParams.get('end')!,
            }
          : undefined,
    });

    const projects = await portfolioService.getProjects(
      filters.vendor_id,
      filters,
    );

    return NextResponse.json({ projects });
  } catch (error: any) {
    console.error('Portfolio GET error:', error);

    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch portfolio projects' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const projectData = createProjectSchema.parse(body);

    // Get user's organization ID
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', session.user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 },
      );
    }

    // Verify vendor belongs to user's organization
    const { data: vendor } = await supabase
      .from('vendors')
      .select('organization_id')
      .eq('id', projectData.vendor_id)
      .single();

    if (!vendor || vendor.organization_id !== userProfile.organization_id) {
      return NextResponse.json(
        { error: 'Vendor not found or access denied' },
        { status: 403 },
      );
    }

    // Add organization_id to project data
    const project = await portfolioService.createProject({
      ...projectData,
      organization_id: userProfile.organization_id,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error: any) {
    console.error('Portfolio POST error:', error);

    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to create portfolio project' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const updates = updateProjectSchema.parse(body);

    // Verify project belongs to user's organization
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', session.user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 },
      );
    }

    const { data: existingProject } = await supabase
      .from('portfolio_projects')
      .select('organization_id')
      .eq('id', projectId)
      .single();

    if (
      !existingProject ||
      existingProject.organization_id !== userProfile.organization_id
    ) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 403 },
      );
    }

    const project = await portfolioService.updateProject(projectId, updates);

    return NextResponse.json({ project });
  } catch (error: any) {
    console.error('Portfolio PATCH error:', error);

    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to update portfolio project' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 },
      );
    }

    // Verify project belongs to user's organization
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', session.user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 },
      );
    }

    const { data: existingProject } = await supabase
      .from('portfolio_projects')
      .select('organization_id')
      .eq('id', projectId)
      .single();

    if (
      !existingProject ||
      existingProject.organization_id !== userProfile.organization_id
    ) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 403 },
      );
    }

    await portfolioService.deleteProject(projectId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Portfolio DELETE error:', error);

    return NextResponse.json(
      { error: 'Failed to delete portfolio project' },
      { status: 500 },
    );
  }
}
