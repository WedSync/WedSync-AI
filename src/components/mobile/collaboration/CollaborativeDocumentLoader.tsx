/**
 * CollaborativeDocumentLoader - Server Component for loading collaborative documents
 * WS-244 Team D - Mobile-First Real-Time Collaboration System
 *
 * Features:
 * - Server-side document loading with authentication
 * - Wedding-specific document types and permissions
 * - Optimized for mobile with selective loading
 * - Supabase integration for document management
 * - SEO-friendly with proper meta data
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Metadata } from 'next';

interface CollaborativeDocument {
  id: string;
  wedding_id: string;
  title: string;
  type: 'guest_list' | 'vendor_selection' | 'timeline' | 'family_input';
  content: string;
  yjs_state: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  permissions: {
    can_read: boolean;
    can_write: boolean;
    can_share: boolean;
  };
  collaborators: Array<{
    user_id: string;
    user_name: string;
    user_avatar?: string;
    role: 'owner' | 'editor' | 'viewer';
    last_active: string;
  }>;
}

interface CollaborativeDocumentLoaderProps {
  documentId: string;
  weddingId?: string;
  userId?: string;
  preloadContent?: boolean;
  children: (document: CollaborativeDocument) => React.ReactNode;
}

// Generate metadata for SEO
export async function generateMetadata({
  documentId,
  weddingId,
}: {
  documentId: string;
  weddingId?: string;
}): Promise<Metadata> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  const { data: document } = await supabase
    .from('collaborative_documents')
    .select('title, type, wedding_id, weddings(couple_names)')
    .eq('id', documentId)
    .eq('wedding_id', weddingId || '')
    .single();

  if (!document) {
    return {
      title: 'Document Not Found - WedSync',
      description: 'The requested collaborative document could not be found.',
    };
  }

  const coupleNames = document.weddings?.couple_names || 'Wedding';
  const documentTypeLabel = document.type
    .replace('_', ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return {
    title: `${document.title} - ${coupleNames} - WedSync`,
    description: `Collaborate on ${documentTypeLabel} for ${coupleNames} wedding planning. Real-time editing with family, vendors, and wedding planners.`,
    keywords: [
      'wedding planning',
      'collaboration',
      'real-time editing',
      documentTypeLabel.toLowerCase(),
    ],
    openGraph: {
      title: `${document.title} - ${coupleNames}`,
      description: `Collaborative ${documentTypeLabel} for wedding planning`,
      type: 'article',
      locale: 'en_GB',
      siteName: 'WedSync',
    },
    robots: {
      index: false, // Private documents shouldn't be indexed
      follow: false,
    },
  };
}

// Loading skeleton for mobile
function DocumentLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-6 bg-gray-200 rounded w-48"></div>
        <div className="h-8 bg-gray-200 rounded w-20"></div>
      </div>

      {/* Collaborators skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
        <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
        <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
        <div className="h-6 bg-gray-200 rounded w-16"></div>
      </div>

      {/* Content skeleton */}
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>

      {/* Mobile toolbar skeleton */}
      <div className="flex gap-2">
        <div className="h-10 bg-gray-200 rounded w-20"></div>
        <div className="h-10 bg-gray-200 rounded w-24"></div>
        <div className="h-10 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  );
}

export async function CollaborativeDocumentLoader({
  documentId,
  weddingId,
  userId,
  preloadContent = true,
  children,
}: CollaborativeDocumentLoaderProps) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login?redirect=/collaboration/' + documentId);
  }

  const currentUserId = userId || user.id;

  try {
    // Load collaborative document with wedding and user context
    const { data: document, error: docError } = await supabase
      .from('collaborative_documents')
      .select(
        `
        id,
        wedding_id,
        title,
        type,
        content,
        yjs_state,
        version,
        created_at,
        updated_at,
        created_by,
        weddings (
          id,
          couple_names,
          wedding_date,
          status
        ),
        collaborative_document_permissions (
          user_id,
          can_read,
          can_write,
          can_share
        )
      `,
      )
      .eq('id', documentId)
      .eq('wedding_id', weddingId || '')
      .single();

    if (docError || !document) {
      console.error('Document not found:', docError);
      notFound();
    }

    // Check permissions
    const userPermissions = document.collaborative_document_permissions?.find(
      (p: any) => p.user_id === currentUserId,
    );

    if (!userPermissions?.can_read) {
      // Check if user is part of the wedding
      const { data: weddingAccess } = await supabase
        .from('wedding_team_members')
        .select('role')
        .eq('wedding_id', document.wedding_id)
        .eq('user_id', currentUserId)
        .single();

      if (!weddingAccess) {
        redirect('/unauthorized');
      }
    }

    // Load active collaborators (last 24 hours)
    const { data: collaborators } = await supabase
      .from('collaborative_document_sessions')
      .select(
        `
        user_id,
        last_active,
        user_profiles (
          full_name,
          avatar_url
        ),
        wedding_team_members (
          role
        )
      `,
      )
      .eq('document_id', documentId)
      .gte(
        'last_active',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('last_active', { ascending: false });

    // Format document for component consumption
    const collaborativeDocument: CollaborativeDocument = {
      id: document.id,
      wedding_id: document.wedding_id,
      title: document.title,
      type: document.type,
      content: preloadContent ? document.content || '' : '',
      yjs_state: document.yjs_state,
      version: document.version,
      created_at: document.created_at,
      updated_at: document.updated_at,
      created_by: document.created_by,
      permissions: {
        can_read: userPermissions?.can_read || !!weddingAccess,
        can_write:
          userPermissions?.can_write || weddingAccess?.role !== 'viewer',
        can_share:
          userPermissions?.can_share || weddingAccess?.role === 'owner',
      },
      collaborators:
        collaborators?.map((collab) => ({
          user_id: collab.user_id,
          user_name: collab.user_profiles?.full_name || 'Unknown User',
          user_avatar: collab.user_profiles?.avatar_url || undefined,
          role: collab.wedding_team_members?.role || 'viewer',
          last_active: collab.last_active,
        })) || [],
    };

    // Update user's last active timestamp
    await supabase.from('collaborative_document_sessions').upsert(
      {
        document_id: documentId,
        user_id: currentUserId,
        last_active: new Date().toISOString(),
      },
      {
        onConflict: 'document_id,user_id',
      },
    );

    return (
      <div className="collaborative-document-container">
        {children(collaborativeDocument)}
      </div>
    );
  } catch (error) {
    console.error('Error loading collaborative document:', error);

    // Return error state
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-error-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Document Error
        </h2>
        <p className="text-gray-600 mb-4">
          We couldn't load this collaborative document. This might be a
          temporary issue.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }
}

// Wrapper with Suspense for better mobile loading experience
export function CollaborativeDocumentProvider({
  documentId,
  weddingId,
  userId,
  preloadContent = true,
  children,
}: CollaborativeDocumentLoaderProps) {
  return (
    <Suspense fallback={<DocumentLoadingSkeleton />}>
      <CollaborativeDocumentLoader
        documentId={documentId}
        weddingId={weddingId}
        userId={userId}
        preloadContent={preloadContent}
      >
        {children}
      </CollaborativeDocumentLoader>
    </Suspense>
  );
}

// Mobile-optimized document list loader
export async function CollaborativeDocumentList({
  weddingId,
  documentType,
  limit = 10,
}: {
  weddingId: string;
  documentType?: CollaborativeDocument['type'];
  limit?: number;
}) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const query = supabase
    .from('collaborative_documents')
    .select(
      `
      id,
      title,
      type,
      updated_at,
      version,
      collaborative_document_sessions (
        user_id,
        last_active
      )
    `,
    )
    .eq('wedding_id', weddingId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (documentType) {
    query.eq('type', documentType);
  }

  const { data: documents } = await query;

  if (!documents?.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No collaborative documents found.</p>
        <p className="text-sm mt-2">
          Create your first document to start collaborating!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">{doc.title}</h3>
              <p className="text-sm text-gray-500 capitalize">
                {doc.type.replace('_', ' ')} • v{doc.version}
              </p>
            </div>
            <div className="text-xs text-gray-400">
              {new Date(doc.updated_at).toLocaleDateString()}
            </div>
          </div>

          {/* Active collaborators indicator */}
          {doc.collaborative_document_sessions &&
            doc.collaborative_document_sessions.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <div className="flex -space-x-1">
                  {doc.collaborative_document_sessions
                    .slice(0, 3)
                    .map((session: any, index: number) => (
                      <div
                        key={session.user_id}
                        className="w-6 h-6 bg-primary-100 border-2 border-white rounded-full flex items-center justify-center text-xs font-medium text-primary-700"
                      >
                        {index + 1}
                      </div>
                    ))}
                </div>
                <span className="text-xs text-gray-500">
                  {doc.collaborative_document_sessions.length} active
                </span>
              </div>
            )}
        </div>
      ))}
    </div>
  );
}
