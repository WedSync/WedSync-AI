import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  Brand,
  CreateBrandRequest,
  UpdateBrandRequest,
} from '@/types/branding';

// Create Supabase client
async function createSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
      (() => {
        throw new Error(
          'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
        );
      })(),
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      (() => {
        throw new Error(
          'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
        );
      })(),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );
}

// Get current user from session
async function getCurrentUser(supabase: any) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// GET - List brands for organization
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient();
    const user = await getCurrentUser(supabase);

    // Get user's organization
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    // Get brands for organization
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select(
        `
        id,
        organization_id,
        name,
        logo_url,
        logo_file_id,
        primary_color,
        secondary_color,
        accent_color,
        font_family,
        custom_css,
        brand_guidelines,
        is_active,
        created_at,
        updated_at
      `,
      )
      .eq('organization_id', userProfile.organization_id)
      .order('created_at', { ascending: false });

    if (brandsError) {
      console.error('Error fetching brands:', brandsError);
      return NextResponse.json(
        { error: 'Failed to fetch brands' },
        { status: 500 },
      );
    }

    // Transform to match Brand interface
    const transformedBrands: Brand[] =
      brands?.map((brand) => ({
        id: brand.id,
        organizationId: brand.organization_id,
        name: brand.name,
        logoUrl: brand.logo_url,
        logoFileId: brand.logo_file_id,
        primaryColor: brand.primary_color,
        secondaryColor: brand.secondary_color,
        accentColor: brand.accent_color,
        fontFamily: brand.font_family,
        customCss: brand.custom_css,
        brandGuidelines: brand.brand_guidelines,
        isActive: brand.is_active,
        createdAt: brand.created_at,
        updatedAt: brand.updated_at,
      })) || [];

    return NextResponse.json({ brands: transformedBrands });
  } catch (error) {
    console.error('Error in GET /api/branding:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST - Create new brand
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient();
    const user = await getCurrentUser(supabase);

    // Parse request body
    const body = await request.json();
    const brandData: CreateBrandRequest = body;

    // Validate required fields
    if (!brandData.name?.trim()) {
      return NextResponse.json(
        { error: 'Brand name is required' },
        { status: 400 },
      );
    }

    // Validate hex colors
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (
      !hexColorRegex.test(brandData.primaryColor) ||
      !hexColorRegex.test(brandData.secondaryColor) ||
      !hexColorRegex.test(brandData.accentColor)
    ) {
      return NextResponse.json(
        {
          error: 'Invalid color format. Please use hex colors (e.g., #3B82F6)',
        },
        { status: 400 },
      );
    }

    // Get user's organization
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    // Create brand
    const { data: newBrand, error: createError } = await supabase
      .from('brands')
      .insert({
        organization_id: userProfile.organization_id,
        name: brandData.name.trim(),
        primary_color: brandData.primaryColor,
        secondary_color: brandData.secondaryColor,
        accent_color: brandData.accentColor,
        font_family: brandData.fontFamily,
        custom_css: brandData.customCss || null,
        brand_guidelines: brandData.brandGuidelines || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(
        `
        id,
        organization_id,
        name,
        logo_url,
        logo_file_id,
        primary_color,
        secondary_color,
        accent_color,
        font_family,
        custom_css,
        brand_guidelines,
        is_active,
        created_at,
        updated_at
      `,
      )
      .single();

    if (createError) {
      console.error('Error creating brand:', createError);
      return NextResponse.json(
        { error: 'Failed to create brand' },
        { status: 500 },
      );
    }

    // Transform response
    const brand: Brand = {
      id: newBrand.id,
      organizationId: newBrand.organization_id,
      name: newBrand.name,
      logoUrl: newBrand.logo_url,
      logoFileId: newBrand.logo_file_id,
      primaryColor: newBrand.primary_color,
      secondaryColor: newBrand.secondary_color,
      accentColor: newBrand.accent_color,
      fontFamily: newBrand.font_family,
      customCss: newBrand.custom_css,
      brandGuidelines: newBrand.brand_guidelines,
      isActive: newBrand.is_active,
      createdAt: newBrand.created_at,
      updatedAt: newBrand.updated_at,
    };

    return NextResponse.json({ brand }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/branding:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PUT - Update brand
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient();
    const user = await getCurrentUser(supabase);

    // Parse request body
    const body = await request.json();
    const { brandId, ...updateData }: { brandId: string } & UpdateBrandRequest =
      body;

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 },
      );
    }

    // Validate hex colors if provided
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (
      updateData.primaryColor &&
      !hexColorRegex.test(updateData.primaryColor)
    ) {
      return NextResponse.json(
        { error: 'Invalid primary color format' },
        { status: 400 },
      );
    }
    if (
      updateData.secondaryColor &&
      !hexColorRegex.test(updateData.secondaryColor)
    ) {
      return NextResponse.json(
        { error: 'Invalid secondary color format' },
        { status: 400 },
      );
    }
    if (updateData.accentColor && !hexColorRegex.test(updateData.accentColor)) {
      return NextResponse.json(
        { error: 'Invalid accent color format' },
        { status: 400 },
      );
    }

    // Get user's organization
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    // Check if brand belongs to user's organization
    const { data: existingBrand, error: checkError } = await supabase
      .from('brands')
      .select('id, organization_id')
      .eq('id', brandId)
      .eq('organization_id', userProfile.organization_id)
      .single();

    if (checkError || !existingBrand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Prepare update object
    const updateObject: any = {
      updated_at: new Date().toISOString(),
    };

    if (updateData.name !== undefined)
      updateObject.name = updateData.name.trim();
    if (updateData.primaryColor !== undefined)
      updateObject.primary_color = updateData.primaryColor;
    if (updateData.secondaryColor !== undefined)
      updateObject.secondary_color = updateData.secondaryColor;
    if (updateData.accentColor !== undefined)
      updateObject.accent_color = updateData.accentColor;
    if (updateData.fontFamily !== undefined)
      updateObject.font_family = updateData.fontFamily;
    if (updateData.customCss !== undefined)
      updateObject.custom_css = updateData.customCss;
    if (updateData.brandGuidelines !== undefined)
      updateObject.brand_guidelines = updateData.brandGuidelines;
    if (updateData.isActive !== undefined)
      updateObject.is_active = updateData.isActive;

    // Update brand
    const { data: updatedBrand, error: updateError } = await supabase
      .from('brands')
      .update(updateObject)
      .eq('id', brandId)
      .select(
        `
        id,
        organization_id,
        name,
        logo_url,
        logo_file_id,
        primary_color,
        secondary_color,
        accent_color,
        font_family,
        custom_css,
        brand_guidelines,
        is_active,
        created_at,
        updated_at
      `,
      )
      .single();

    if (updateError) {
      console.error('Error updating brand:', updateError);
      return NextResponse.json(
        { error: 'Failed to update brand' },
        { status: 500 },
      );
    }

    // Transform response
    const brand: Brand = {
      id: updatedBrand.id,
      organizationId: updatedBrand.organization_id,
      name: updatedBrand.name,
      logoUrl: updatedBrand.logo_url,
      logoFileId: updatedBrand.logo_file_id,
      primaryColor: updatedBrand.primary_color,
      secondaryColor: updatedBrand.secondary_color,
      accentColor: updatedBrand.accent_color,
      fontFamily: updatedBrand.font_family,
      customCss: updatedBrand.custom_css,
      brandGuidelines: updatedBrand.brand_guidelines,
      isActive: updatedBrand.is_active,
      createdAt: updatedBrand.created_at,
      updatedAt: updatedBrand.updated_at,
    };

    return NextResponse.json({ brand });
  } catch (error) {
    console.error('Error in PUT /api/branding:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE - Delete brand
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient();
    const user = await getCurrentUser(supabase);

    // Get brand ID from URL
    const url = new URL(request.url);
    const brandId = url.searchParams.get('id');

    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 },
      );
    }

    // Get user's organization
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    // Check if brand belongs to user's organization
    const { data: existingBrand, error: checkError } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .eq('organization_id', userProfile.organization_id)
      .single();

    if (checkError || !existingBrand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Soft delete - mark as inactive instead of hard delete
    const { error: deleteError } = await supabase
      .from('brands')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', brandId);

    if (deleteError) {
      console.error('Error deleting brand:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete brand' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/branding:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
