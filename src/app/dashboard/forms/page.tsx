import { FormSystemLayout } from '@/components/forms/FormSystemLayout';
import { extractSearchParams } from '@/types/next15-params';

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; sort?: string; view?: string }>;
}) {
  // Extract async searchParams - Next.js 15 requirement
  const resolvedSearchParams = await extractSearchParams(searchParams);

  // Authentication is handled by the dashboard layout

  return (
    <FormSystemLayout currentSection="overview">
      <div>Forms content will be handled by FormSystemLayout</div>
    </FormSystemLayout>
  );
}
