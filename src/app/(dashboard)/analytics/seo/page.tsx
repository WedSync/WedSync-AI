import { Metadata } from 'next';
import SEOAnalyticsDashboard from '@/components/analytics/seo/SEOAnalyticsDashboard';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'SEO Analytics | WedSync',
  description:
    'Track your search rankings, organic traffic, and SEO performance',
};

export default async function SEOAnalyticsPage() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Check authentication
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Get supplier ID
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id, business_name')
    .eq('user_id', session.user.id)
    .single();

  if (!supplier) {
    redirect('/onboarding');
  }

  return (
    <div className="p-6">
      <SEOAnalyticsDashboard supplierId={supplier.id} />
    </div>
  );
}
