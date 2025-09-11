import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { coupleAuthService } from '@/lib/services/coupleAuthService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/dashboard';
    const invitation = searchParams.get('invitation');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      const errorMessage =
        error === 'access_denied'
          ? 'Authentication was cancelled'
          : 'Authentication failed';

      return NextResponse.redirect(
        `${origin}/signup?error=${encodeURIComponent(errorMessage)}`,
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${origin}/signup?error=No+authorization+code+provided`,
      );
    }

    const supabase = await createClient();

    // Exchange code for session
    const { data: authData, error: authError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (authError) {
      console.error('Code exchange error:', authError);
      return NextResponse.redirect(
        `${origin}/signup?error=${encodeURIComponent(authError.message)}`,
      );
    }

    const { user, session } = authData;

    if (!user || !session) {
      return NextResponse.redirect(
        `${origin}/signup?error=Authentication+failed`,
      );
    }

    // Check if this is a new user (first time OAuth signup)
    const { data: existingCouple } = await supabase
      .from('couples')
      .select('id, onboarding_completed')
      .eq('user_id', user.id)
      .single();

    let isNewSignup = false;
    let coupleResult = null;

    if (!existingCouple) {
      // New user - complete OAuth signup process
      isNewSignup = true;
      const provider = user.app_metadata?.provider || 'oauth';

      coupleResult = await coupleAuthService.handleOAuthSignup(
        user,
        provider,
        invitation || undefined,
      );

      if (!coupleResult.success) {
        console.error('OAuth signup completion failed:', coupleResult.error);
        return NextResponse.redirect(
          `${origin}/signup?error=${encodeURIComponent(coupleResult.error || 'Signup completion failed')}`,
        );
      }
    }

    // Determine redirect destination
    let redirectUrl = next;

    if (isNewSignup) {
      // New user - redirect to onboarding
      redirectUrl = invitation
        ? '/onboarding?from=invitation&step=wedding-details'
        : '/onboarding?step=wedding-details';
    } else if (!existingCouple.onboarding_completed) {
      // Existing user with incomplete onboarding
      redirectUrl = '/onboarding?step=continue';
    } else if (invitation) {
      // Existing user with invitation - handle supplier connection
      redirectUrl = `/dashboard?invitation=${invitation}&action=connect`;
    }

    // Log successful OAuth completion
    console.log('OAuth callback successful:', {
      userId: user.id,
      email: user.email,
      provider: user.app_metadata?.provider,
      isNewSignup,
      hasInvitation: !!invitation,
      redirectUrl,
      timestamp: new Date().toISOString(),
    });

    // Set additional success parameters for frontend
    const finalUrl = new URL(redirectUrl, origin);
    if (isNewSignup) {
      finalUrl.searchParams.set('signup', 'success');
      finalUrl.searchParams.set('method', 'oauth');
    }
    if (invitation) {
      finalUrl.searchParams.set('invitation', invitation);
    }

    return NextResponse.redirect(finalUrl.toString());
  } catch (error: any) {
    console.error('OAuth callback error:', error);

    const { origin } = new URL(request.url);
    return NextResponse.redirect(
      `${origin}/signup?error=${encodeURIComponent('Authentication failed. Please try again.')}`,
    );
  }
}

// Handle POST requests (some OAuth providers use POST)
export async function POST(request: NextRequest) {
  return GET(request);
}
