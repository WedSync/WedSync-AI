import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Tutorial start request schema
const startTutorialSchema = z.object({
  tutorialType: z.enum(['onboarding', 'feature-discovery', 'advanced']),
  userType: z.enum(['couple', 'planner', 'vendor']).optional(),
  deviceType: z.enum(['mobile', 'tablet', 'desktop']).optional(),
  previousExperience: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validatedData = startTutorialSchema.parse(body);

    const supabase = await createClient();

    // Check if user has existing tutorial progress
    const { data: existingProgress } = await supabase
      .from('tutorial_progress')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('tutorial_type', validatedData.tutorialType)
      .single();

    // Define tutorial steps based on type
    const tutorialSteps = getTutorialSteps(
      validatedData.tutorialType,
      validatedData.userType,
    );

    // Create or update tutorial session
    const tutorialSession = {
      user_id: session.user.id,
      tutorial_type: validatedData.tutorialType,
      user_type: validatedData.userType || 'couple',
      device_type: validatedData.deviceType || 'desktop',
      steps: tutorialSteps,
      current_step: existingProgress?.current_step || 1,
      completed_steps: existingProgress?.completed_steps || [],
      skipped_steps: existingProgress?.skipped_steps || [],
      started_at: existingProgress?.started_at || new Date().toISOString(),
      last_activity: new Date().toISOString(),
      status: 'active' as const,
    };

    const { data, error } = await supabase
      .from('tutorial_progress')
      .upsert(tutorialSession, {
        onConflict: 'user_id,tutorial_type',
      })
      .select()
      .single();

    if (error) {
      console.error('Tutorial start error:', error);
      return NextResponse.json(
        { error: 'Failed to start tutorial' },
        { status: 500 },
      );
    }

    // Track tutorial start event
    await supabase.from('tutorial_analytics').insert({
      user_id: session.user.id,
      tutorial_type: validatedData.tutorialType,
      event_type: 'start',
      step_id: tutorialSteps[0].id,
      timestamp: new Date().toISOString(),
      device_type: validatedData.deviceType,
      user_type: validatedData.userType,
    });

    return NextResponse.json({
      success: true,
      tutorial: {
        id: data.id,
        type: data.tutorial_type,
        currentStep: data.current_step,
        totalSteps: tutorialSteps.length,
        steps: tutorialSteps,
        canResume: Boolean(existingProgress),
      },
    });
  } catch (error) {
    console.error('Tutorial start error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

function getTutorialSteps(tutorialType: string, userType?: string) {
  const baseSteps = [
    {
      id: 'welcome-orientation',
      title: 'Welcome to WedSync!',
      description:
        "Let's take a quick tour to help you plan your perfect wedding.",
      content: {
        primary:
          "We'll show you the key features that make wedding planning effortless.",
        secondary:
          'You can skip this tour anytime and return to it later from the Help menu.',
        cta: 'Start Tour',
      },
      position: 'center-modal',
      highlightTarget: null,
      estimatedTime: '3 min tour',
      required: false,
    },
    {
      id: 'profile-setup',
      title: 'Complete Your Wedding Profile',
      description:
        'Add your wedding date, venue, and guest count to unlock personalized planning features.',
      content: {
        primary:
          'Your wedding details help us customize your planning experience.',
        secondary: 'Click the profile icon to add your wedding information.',
        cta: 'Try It Now',
      },
      position: 'bottom-right',
      highlightTarget: '#user-profile-section',
      interactionRequired: true,
      validationTarget: '#wedding-date-field',
    },
    {
      id: 'dashboard-overview',
      title: 'Your Wedding Command Center',
      description:
        'Everything you need to plan your wedding is organized in these sections.',
      content: {
        primary:
          'Track progress, manage tasks, and collaborate with your team all in one place.',
        secondary: 'Each card shows real-time progress and upcoming deadlines.',
        cta: 'Explore Dashboard',
      },
      position: 'top-center',
      highlightTarget: '.dashboard-cards',
      interactionHints: ['scroll', 'click-cards'],
    },
    {
      id: 'vendor-management',
      title: 'Find & Manage Your Dream Team',
      description:
        'Connect with vendors, track contracts, and manage communications.',
      content: {
        primary:
          'Browse verified vendors, save favorites, and track your hiring progress.',
        secondary:
          'Try adding a vendor to see how easy it is to stay organized.',
        cta: 'Add a Vendor',
      },
      position: 'left',
      highlightTarget: '#vendor-section',
      interactionRequired: true,
      demoMode: true,
    },
    {
      id: 'timeline-creation',
      title: 'Build Your Wedding Timeline',
      description:
        'Create a detailed timeline that keeps everyone on schedule.',
      content: {
        primary:
          'Add events, set reminders, and share with your wedding party.',
        secondary: 'Smart suggestions help you plan the perfect day timeline.',
        cta: 'Create Timeline',
      },
      position: 'right',
      highlightTarget: '#timeline-builder',
      interactionRequired: true,
      smartSuggestions: true,
    },
    {
      id: 'communication-hub',
      title: 'Stay Connected With Your Team',
      description:
        'Message vendors, share updates, and coordinate with your wedding party.',
      content: {
        primary:
          'All your wedding communications in one secure, organized place.',
        secondary:
          'Try sending a message to see how easy collaboration can be.',
        cta: 'Send Message',
      },
      position: 'bottom-left',
      highlightTarget: '#communication-panel',
      interactionRequired: true,
      demoMode: true,
    },
    {
      id: 'celebration-completion',
      title: "Congratulations! You're Ready to Plan",
      description:
        "You've learned the basics. Now let's make your wedding dreams come true!",
      content: {
        primary:
          "You now know how to use WedSync's core features to plan your perfect day.",
        secondary:
          'Ready to dive deeper? Check out our advanced features or start planning right away.',
        cta: 'Start Planning',
        secondaryCta: 'Explore Advanced Features',
      },
      position: 'center-modal',
      celebration: true,
      nextSteps: [
        'Complete your wedding profile',
        'Set your budget and priorities',
        'Start browsing vendors',
        'Create your first timeline',
      ],
    },
  ];

  // Customize steps based on user type
  if (userType === 'vendor') {
    return baseSteps.map((step) => ({
      ...step,
      content: {
        ...step.content,
        primary: step.content.primary
          .replace('wedding', 'business')
          .replace('plan your', 'manage your'),
      },
    }));
  }

  return baseSteps;
}
