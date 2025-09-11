import { FormSystemLayout } from '@/components/forms/FormSystemLayout';
import {
  FormBuilderPageProps,
  extractParams,
  extractSearchParams,
} from '@/types/next15-params';

export default async function FormBuilderPage({
  params,
  searchParams,
}: FormBuilderPageProps) {
  try {
    // Extract async params - Next.js 15 requirement
    const resolvedParams = await extractParams(params);
    const resolvedSearchParams = await extractSearchParams(searchParams);

    const template = resolvedSearchParams.template as string | undefined;
    const mode = resolvedSearchParams.mode as string | undefined;
    const formId = resolvedSearchParams.id as string | undefined;
    const clientId = resolvedSearchParams.clientId as string | undefined;

    // Authentication is handled by the dashboard layout

    return (
      <FormSystemLayout 
        currentSection="builder" 
        formId={formId} 
        clientId={clientId}
      />
    );
  } catch (error) {
    console.error('Error in FormBuilderPage:', error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            Error Loading Form Builder
          </h1>
          <p className="text-gray-600">Please try refreshing the page</p>
        </div>
      </div>
    );
  }
}
