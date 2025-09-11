import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ReferralTrackingService } from '@/services/ReferralTrackingService';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
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

    const body = await request.json();
    const { customCode } = body;

    // Validate input
    if (customCode && !/^[A-Z0-9]{4,20}$/.test(customCode)) {
      return NextResponse.json(
        { error: 'Custom code must be 4-20 alphanumeric characters' },
        { status: 400 },
      );
    }

    const referralService = new ReferralTrackingService(supabase);
    const code = await referralService.generateReferralCode(
      user.id,
      customCode,
    );

    return NextResponse.json({
      success: true,
      code,
      message: 'Referral code generated successfully',
    });
  } catch (error: any) {
    console.error('Error generating referral code:', error);

    if (error.message === 'Referral code already exists') {
      return NextResponse.json(
        { error: 'Custom code already in use' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate referral code' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
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

    // Get existing referral code
    const { data: existingCode } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('supplier_id', user.id)
      .eq('is_active', true)
      .single();

    if (!existingCode) {
      return NextResponse.json(
        { error: 'No active referral code found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      code: existingCode.code,
      usageCount: existingCode.usage_count,
      createdAt: existingCode.created_at,
    });
  } catch (error) {
    console.error('Error retrieving referral code:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve referral code' },
      { status: 500 },
    );
  }
}
