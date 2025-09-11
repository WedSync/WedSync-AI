import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateType = searchParams.get('type') as 'email' | 'sms' | 'all';

    const categories = new Set<string>();

    // Get email template categories
    if (!templateType || templateType === 'email' || templateType === 'all') {
      const { data: emailCategories } = await supabase
        .from('email_templates')
        .select('category')
        .eq('is_active', true);

      emailCategories?.forEach((t) => t.category && categories.add(t.category));
    }

    // Get SMS template categories
    if (!templateType || templateType === 'sms' || templateType === 'all') {
      const { data: smsCategories } = await supabase
        .from('sms_templates')
        .select('category')
        .eq('is_active', true);

      smsCategories?.forEach((t) => t.category && categories.add(t.category));
    }

    // Convert to array and sort
    const categoriesArray = Array.from(categories).sort();

    // Add metadata about each category
    const categoriesWithMetadata = await Promise.all(
      categoriesArray.map(async (category) => {
        const emailCount =
          templateType === 'sms'
            ? 0
            : await getTemplateCount('email_templates', category);
        const smsCount =
          templateType === 'email'
            ? 0
            : await getTemplateCount('sms_templates', category);

        return {
          name: category,
          display_name: formatCategoryName(category),
          description: getCategoryDescription(category),
          email_template_count: emailCount,
          sms_template_count: smsCount,
          total_template_count: emailCount + smsCount,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: {
        categories: categoriesWithMetadata,
        total_categories: categoriesWithMetadata.length,
      },
    });
  } catch (error) {
    console.error('Failed to fetch template categories:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch template categories',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

async function getTemplateCount(
  table: string,
  category: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('category', category)
    .eq('is_active', true);

  if (error) {
    console.error(`Failed to count templates in ${table}:`, error);
    return 0;
  }

  return count || 0;
}

function formatCategoryName(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    journey: 'Templates used in automated customer journeys',
    transactional: 'System-generated transactional messages',
    marketing: 'Promotional and marketing communications',
    onboarding: 'Welcome and onboarding sequences',
    reminders: 'Appointment and task reminders',
    confirmations: 'Booking and event confirmations',
    follow_up: 'Post-event follow-up communications',
    thank_you: 'Thank you and appreciation messages',
    notifications: 'System and status notifications',
    surveys: 'Feedback and survey requests',
  };

  return (
    descriptions[category] ||
    `Templates for ${formatCategoryName(category).toLowerCase()}`
  );
}
