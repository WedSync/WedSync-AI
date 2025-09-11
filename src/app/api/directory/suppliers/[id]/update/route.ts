import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema for profile updates
const updateProfileSchema = z
  .object({
    // Status
    profile_status: z
      .enum(['draft', 'pending_review', 'published', 'suspended'])
      .optional(),
    completion_step: z.number().min(1).max(10).optional(),

    // Basic information
    legal_business_name: z.string().min(1).max(255).optional(),
    trading_name: z.string().max(255).optional(),
    company_registration_number: z.string().max(100).optional(),
    vat_number: z.string().max(100).optional(),
    established_year: z
      .number()
      .min(1900)
      .max(new Date().getFullYear())
      .optional(),
    business_structure: z
      .enum(['sole_trader', 'partnership', 'limited_company', 'other'])
      .optional(),

    // Service details
    service_offerings: z
      .array(
        z.object({
          name: z.string(),
          description: z.string(),
          category: z.string(),
        }),
      )
      .optional(),
    specializations: z.array(z.string()).optional(),
    languages_spoken: z.array(z.string()).optional(),
    service_areas: z.array(z.string()).optional(),
    travel_policy: z.string().optional(),

    // Capacity & Availability
    max_events_per_day: z.number().min(1).max(10).optional(),
    max_events_per_week: z.number().min(1).max(50).optional(),
    advance_booking_days: z.number().min(0).max(365).optional(),
    peak_season_months: z.array(z.number().min(1).max(12)).optional(),
    availability_calendar: z.record(z.any()).optional(),

    // Pricing
    pricing_structure: z.enum(['hourly', 'package', 'custom']).optional(),
    hourly_rate: z.number().positive().optional(),
    minimum_spend: z.number().positive().optional(),
    packages: z
      .array(
        z.object({
          name: z.string(),
          description: z.string(),
          price: z.number(),
          duration: z.string().optional(),
          includes: z.array(z.string()),
        }),
      )
      .optional(),
    deposit_percentage: z.number().min(0).max(100).optional(),
    payment_terms: z.string().optional(),
    cancellation_policy: z.string().optional(),

    // Contact
    key_contact_name: z.string().max(255).optional(),
    key_contact_role: z.string().max(100).optional(),
    key_contact_email: z.string().email().optional(),
    key_contact_phone: z.string().max(50).optional(),

    // Team
    team_members: z
      .array(
        z.object({
          name: z.string(),
          role: z.string(),
          bio: z.string().optional(),
          photo: z.string().url().optional(),
        }),
      )
      .optional(),

    // Response settings
    auto_response_enabled: z.boolean().optional(),
    auto_response_message: z.string().optional(),
    response_time_commitment: z
      .enum(['within_hour', 'within_day', 'within_2days'])
      .optional(),
    preferred_contact_method: z
      .enum(['email', 'phone', 'whatsapp', 'platform'])
      .optional(),

    // Marketing
    unique_selling_points: z.array(z.string()).optional(),
    style_tags: z.array(z.string()).optional(),
    ideal_client_description: z.string().optional(),
    featured_weddings: z
      .array(
        z.object({
          title: z.string(),
          description: z.string(),
          images: z.array(z.string().url()),
          date: z.string(),
        }),
      )
      .optional(),
    press_mentions: z
      .array(
        z.object({
          publication: z.string(),
          title: z.string(),
          url: z.string().url().optional(),
          date: z.string(),
        }),
      )
      .optional(),

    // Media
    logo_url: z.string().url().optional(),
    cover_image_url: z.string().url().optional(),
    gallery_images: z
      .array(
        z.object({
          url: z.string().url(),
          caption: z.string().optional(),
          category: z.string().optional(),
          order: z.number().optional(),
        }),
      )
      .optional(),
    videos: z
      .array(
        z.object({
          url: z.string().url(),
          title: z.string(),
          description: z.string().optional(),
          thumbnail: z.string().url().optional(),
        }),
      )
      .optional(),
    virtual_tour_url: z.string().url().optional(),

    // Awards & Credentials
    awards: z
      .array(
        z.object({
          name: z.string(),
          issuer: z.string(),
          year: z.number(),
          description: z.string().optional(),
        }),
      )
      .optional(),
    professional_associations: z.array(z.string()).optional(),
    accreditations: z
      .array(
        z.object({
          name: z.string(),
          issuer: z.string(),
          expiry: z.string().optional(),
          number: z.string().optional(),
        }),
      )
      .optional(),
    insurance_details: z
      .object({
        provider: z.string(),
        policy_number: z.string(),
        coverage_amount: z.number(),
        expiry: z.string(),
      })
      .optional(),
  })
  .partial();

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const profileId = params.id;

    // Check authentication
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, organization_id, role')
      .eq('id', user.id)
      .single();

    if (!userProfile?.organization_id) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 },
      );
    }

    // Check if profile exists and belongs to user's organization
    const { data: existingProfile } = await supabase
      .from('directory_supplier_profiles')
      .select('id, organization_id, supplier_id')
      .eq('id', profileId)
      .single();

    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (existingProfile.organization_id !== userProfile.organization_id) {
      return NextResponse.json(
        { error: 'Unauthorized to update this profile' },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // Update the profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('directory_supplier_profiles')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw updateError;
    }

    // Update profile completion tracking
    await updateProfileCompletion(supabase, profileId, updatedProfile);

    // Update SEO data if business name changed
    if (validatedData.legal_business_name) {
      const { data: seoRecord } = await supabase
        .from('directory_supplier_seo')
        .select('id')
        .eq('supplier_profile_id', profileId)
        .single();

      if (seoRecord) {
        await supabase
          .from('directory_supplier_seo')
          .update({
            page_title: `${validatedData.legal_business_name} - Wedding Supplier`,
            meta_description: `Professional wedding services by ${validatedData.legal_business_name}`,
            updated_at: new Date().toISOString(),
          })
          .eq('supplier_profile_id', profileId);
      }
    }

    // Calculate completion percentage
    const completionScore = await supabase.rpc('calculate_profile_completion', {
      profile_id: profileId,
    });

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      completion: completionScore.data,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Error updating supplier profile:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to update supplier profile' },
      { status: 500 },
    );
  }
}

// Helper function to update profile completion tracking
async function updateProfileCompletion(
  supabase: any,
  profileId: string,
  profile: any,
) {
  const sections = [
    {
      name: 'basic_information',
      fields: [
        'legal_business_name',
        'company_registration_number',
        'established_year',
        'business_structure',
      ],
      weight: 20,
    },
    {
      name: 'service_details',
      fields: ['service_offerings', 'specializations', 'service_areas'],
      weight: 20,
    },
    {
      name: 'media_gallery',
      fields: ['logo_url', 'cover_image_url', 'gallery_images'],
      weight: 20,
    },
    {
      name: 'pricing_packages',
      fields: ['pricing_structure', 'minimum_spend', 'packages'],
      weight: 15,
    },
    {
      name: 'team_contact',
      fields: ['key_contact_name', 'key_contact_email', 'team_members'],
      weight: 15,
    },
    {
      name: 'verification',
      fields: ['verification_status'],
      weight: 10,
    },
  ];

  for (const section of sections) {
    let completedFields = 0;
    let totalFields = section.fields.length;

    for (const field of section.fields) {
      if (profile[field]) {
        if (Array.isArray(profile[field])) {
          if (profile[field].length > 0) completedFields++;
        } else if (typeof profile[field] === 'object') {
          if (Object.keys(profile[field]).length > 0) completedFields++;
        } else {
          completedFields++;
        }
      }
    }

    const percentage = Math.round((completedFields / totalFields) * 100);

    await supabase.from('directory_profile_completion').upsert({
      supplier_profile_id: profileId,
      section_name: section.name,
      is_completed: percentage === 100,
      completion_percentage: percentage,
      last_updated: new Date().toISOString(),
    });
  }
}
