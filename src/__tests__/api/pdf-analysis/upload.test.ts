import { POST } from '@/app/api/pdf-analysis/upload/route';
import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

// Mock Supabase
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: jest.fn(),
}));

// Mock cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({})),
}));

// Mock UUID
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

// Helper functions to reduce nesting (max 4 levels)
const createEqChain = (mockSingle: jest.Mock) => ({
  eq: jest.fn(() => ({ single: mockSingle })),
});

const createSelectChain = (mockSingle: jest.Mock) => ({
  select: jest.fn(() => createEqChain(mockSingle)),
});

const createMockSelectChain = (mockSingle: jest.Mock) => createSelectChain(mockSingle);

const createSelectInsertChain = (mockSingle: jest.Mock) => ({
  select: jest.fn(() => ({ single: mockSingle })),
});

const createInsertChain = (mockSingle: jest.Mock) => ({
  insert: jest.fn(() => createSelectInsertChain(mockSingle)),
});

const createMockInsertChain = (mockSingle: jest.Mock) => createInsertChain(mockSingle);

const createMockUpdateChain = () => ({
  update: jest.fn(() => ({
    eq: jest.fn(),
  })),
});

const createMockStorageBucket = () => ({
  upload: jest.fn(),
  remove: jest.fn(),
});

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    ...createMockSelectChain(jest.fn()),
    ...createMockInsertChain(jest.fn()),
    ...createMockUpdateChain(),
  })),
  storage: {
    from: jest.fn(() => createMockStorageBucket()),
  },
};

// Mock data helpers
const createSuccessResponse = (data: any) => Promise.resolve({ data, error: null });
const createErrorResponse = (error: Error) => Promise.resolve({ data: null, error });

// Table-specific mock builders
const createUserProfileMock = (organizationId: string | null = 'org-123') => {
  const mockSingle = jest.fn(() => 
    createSuccessResponse(
      organizationId ? { organization_id: organizationId } : null
    )
  );
  return createMockSelectChain(mockSingle);
};

const createPdfAnalysesMock = (analysisId: string = 'test-uuid-123', shouldError: boolean = false) => {
  const mockSingle = jest.fn(() => 
    shouldError 
      ? createErrorResponse(new Error('Database error'))
      : createSuccessResponse({ id: analysisId })
  );
  return createMockInsertChain(mockSingle);
};

// Helper to create upload response - EXTRACTED TO REDUCE NESTING
const createUploadResponse = (shouldError: boolean, path: string) => {
  return shouldError 
    ? createErrorResponse(new Error('Storage upload failed'))
    : createSuccessResponse({ path });
};

// Helper to create upload mock function - EXTRACTED TO REDUCE NESTING
const createUploadMockFn = (shouldError: boolean, path: string) => {
  return jest.fn(() => createUploadResponse(shouldError, path));
};

const createStorageMock = (shouldError: boolean = false, path: string = 'test-path') => ({
  upload: createUploadMockFn(shouldError, path),
  remove: jest.fn(),
});

// Table mock setup helper
const setupTableMocks = (config: {
  userProfile?: { organizationId: string | null };
  pdfAnalyses?: { analysisId: string; shouldError: boolean };
  storage?: { shouldError: boolean; path: string };
}) => {
  // Setup database table mocks
  mockSupabaseClient.from.mockImplementation((table: string) => {
    if (table === 'user_profiles' && config.userProfile) {
      return createUserProfileMock(config.userProfile.organizationId);
    }
    if (table === 'pdf_analyses' && config.pdfAnalyses) {
      return createPdfAnalysesMock(config.pdfAnalyses.analysisId, config.pdfAnalyses.shouldError);
    }
    return mockSupabaseClient.from();
  });

  // Setup storage mock if provided
  if (config.storage) {
    const mockStorageFrom = mockSupabaseClient.storage.from as jest.Mock;
    mockStorageFrom.mockReturnValue(
      createStorageMock(config.storage.shouldError, config.storage.path)
    );
  }
};

// Create mock file
const createMockFile = (name: string, size: number, type: string) => {
  const file = new File(['dummy content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// Mock override helper functions for nesting reduction
// Reduces inline mock override nesting from 5+ levels to ≤4 levels

/**
 * Creates a storage mock override with custom upload/remove handlers
 * Reduces nesting: mockStorageFrom.mockReturnValue({ upload: ..., remove: ... })
 */
function createStorageMockOverride(config: {
  upload?: jest.Mock;
  remove?: jest.Mock;
}) {
  const mockStorageFrom = mockSupabaseClient.storage.from as jest.Mock;
  const mockReturnValue: any = {};
  
  if (config.upload) {
    mockReturnValue.upload = config.upload;
  }
  
  if (config.remove) {
    mockReturnValue.remove = config.remove;
  }
  
  mockStorageFrom.mockReturnValue(mockReturnValue);
}

/**
 * Creates a database table mock override for specific tables
 * Reduces nesting: mockSupabaseClient.from.mockImplementation((table) => { ... })
 */
function createTableMockOverride(tableOverrides: Record<string, any>) {
  mockSupabaseClient.from.mockImplementation((table: string) => {
    if (tableOverrides[table]) {
      return tableOverrides[table];
    }
    
    // Fall back to default behavior for non-overridden tables
    if (table === 'user_profiles') {
      return createUserProfileMock('org-123');
    }
    
    return {};
  });
}

/**
 * Sets up table mocks with storage override for upload cleanup test
 * Combines setupTableMocks + storage override to reduce nesting
 */
function setupTableMocksWithStorageOverride(config: {
  userProfile?: { organizationId: string | null };
  pdfAnalyses?: { analysisId: string; shouldError: boolean };
  storage?: { shouldError: boolean; path: string };
  storageOverride?: { upload?: jest.Mock; remove?: jest.Mock };
}) {
  setupTableMocks({
    userProfile: config.userProfile,
    pdfAnalyses: config.pdfAnalyses,
    storage: config.storage,
  });
  
  if (config.storageOverride) {
    createStorageMockOverride(config.storageOverride);
  }
}

/**
 * Sets up table mocks with database table override for insert capture test
 * Combines setupTableMocks + table override to reduce nesting
 */
function setupTableMocksWithDatabaseOverride(config: {
  userProfile?: { organizationId: string | null };
  storage?: { shouldError: boolean; path: string };
  tableOverrides?: Record<string, any>;
}) {
  setupTableMocks({
    userProfile: config.userProfile,
    storage: config.storage,
  });
  
  if (config.tableOverrides) {
    createTableMockOverride(config.tableOverrides);
  }
}

describe('/api/pdf-analysis/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('requires authentication', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Not authenticated'),
    });

    const formData = new FormData();
    formData.append(
      'file',
      createMockFile('test.pdf', 1024, 'application/pdf'),
    );

    const request = new NextRequest(
      'http://localhost:3000/api/pdf-analysis/upload',
      {
        method: 'POST',
        body: formData,
      },
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  it('requires user to have an organization', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    setupTableMocks({
      userProfile: { organizationId: null }, // No organization
    });

    const formData = new FormData();
    formData.append(
      'file',
      createMockFile('test.pdf', 1024, 'application/pdf'),
    );

    const request = new NextRequest(
      'http://localhost:3000/api/pdf-analysis/upload',
      {
        method: 'POST',
        body: formData,
      },
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('No organization found');
  });

  it('requires a file to be provided', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const formData = new FormData();
    // No file added

    const request = new NextRequest(
      'http://localhost:3000/api/pdf-analysis/upload',
      {
        method: 'POST',
        body: formData,
      },
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('No file provided');
  });

  it('validates file type (PDF only)', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const formData = new FormData();
    formData.append('file', createMockFile('image.jpg', 1024, 'image/jpeg'));

    const request = new NextRequest(
      'http://localhost:3000/api/pdf-analysis/upload',
      {
        method: 'POST',
        body: formData,
      },
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Only PDF files are allowed');
  });

  it('validates file size (max 10MB)', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const formData = new FormData();
    const largeFile = createMockFile(
      'large.pdf',
      15 * 1024 * 1024,
      'application/pdf',
    ); // 15MB
    formData.append('file', largeFile);

    const request = new NextRequest(
      'http://localhost:3000/api/pdf-analysis/upload',
      {
        method: 'POST',
        body: formData,
      },
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('File size must be under 10MB');
  });

  it('successfully uploads valid PDF file', async () => {
    // Mock successful authentication and organization
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    setupTableMocks({
      userProfile: { organizationId: 'org-123' },
      pdfAnalyses: { analysisId: 'test-uuid-123', shouldError: false },
      storage: { shouldError: false, path: 'test-uuid-123-wedding-form.pdf' },
    });

    const formData = new FormData();
    formData.append(
      'file',
      createMockFile('wedding-form.pdf', 2 * 1024 * 1024, 'application/pdf'),
    );

    const request = new NextRequest(
      'http://localhost:3000/api/pdf-analysis/upload',
      {
        method: 'POST',
        body: formData,
      },
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.analysisId).toBe('test-uuid-123');
    expect(json.message).toBe('File uploaded successfully');
    expect(json.status).toBe('processing');
  });

  it('handles storage upload failures', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    setupTableMocks({
      userProfile: { organizationId: 'org-123' },
      storage: { shouldError: true, path: '' },
    });

    const formData = new FormData();
    formData.append(
      'file',
      createMockFile('wedding-form.pdf', 1024, 'application/pdf'),
    );

    const request = new NextRequest(
      'http://localhost:3000/api/pdf-analysis/upload',
      {
        method: 'POST',
        body: formData,
      },
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe('Failed to upload file');
  });

  it('handles database insertion failures and cleans up uploaded file', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const mockRemove = jest.fn();
    setupTableMocksWithStorageOverride({
      userProfile: { organizationId: 'org-123' },
      pdfAnalyses: { analysisId: 'test-uuid-123', shouldError: true },
      storage: { shouldError: false, path: 'test-path' },
      storageOverride: {
        upload: jest.fn(() => createSuccessResponse({ path: 'test-path' })),
        remove: mockRemove,
      },
    });

    const formData = new FormData();
    formData.append(
      'file',
      createMockFile('wedding-form.pdf', 1024, 'application/pdf'),
    );

    const request = new NextRequest(
      'http://localhost:3000/api/pdf-analysis/upload',
      {
        method: 'POST',
        body: formData,
      },
    );

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe('Failed to create analysis record');
    expect(mockRemove).toHaveBeenCalledWith(['test-path']); // Should clean up uploaded file
  });

  it('creates database record with correct wedding industry fields', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const mockInsert = jest.fn(() => createMockInsertChain(
      jest.fn(() => createSuccessResponse({ id: 'test-uuid-123' }))
    ));

    setupTableMocksWithDatabaseOverride({
      userProfile: { organizationId: 'org-123' },
      storage: { shouldError: false, path: 'test-path' },
      tableOverrides: {
        pdf_analyses: { insert: mockInsert },
      },
    });

    const formData = new FormData();
    formData.append(
      'file',
      createMockFile('wedding-questionnaire.pdf', 1024, 'application/pdf'),
    );

    const request = new NextRequest(
      'http://localhost:3000/api/pdf-analysis/upload',
      {
        method: 'POST',
        body: formData,
      },
    );

    await POST(request);

    expect(mockInsert).toHaveBeenCalledWith({
      id: 'test-uuid-123',
      organization_id: 'org-123',
      user_id: 'user-123',
      original_filename: 'wedding-questionnaire.pdf',
      storage_path: 'test-path',
      file_size: 1024,
      status: 'processing',
      created_at: expect.any(String),
    });
  });

  it('generates unique filenames to prevent conflicts', async () => {
    const mockUpload = jest.fn(() => createSuccessResponse({ path: 'test-path' }));

    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    setupTableMocksWithStorageOverride({
      userProfile: { organizationId: 'org-123' },
      pdfAnalyses: { analysisId: 'test-uuid-123', shouldError: false },
      storageOverride: {
        upload: mockUpload,
      },
    });

    const formData = new FormData();
    formData.append(
      'file',
      createMockFile('common-name.pdf', 1024, 'application/pdf'),
    );

    const request = new NextRequest(
      'http://localhost:3000/api/pdf-analysis/upload',
      {
        method: 'POST',
        body: formData,
      },
    );

    await POST(request);

    // Should use UUID prefix to ensure uniqueness
    expect(mockUpload).toHaveBeenCalledWith(
      'test-uuid-123-common-name.pdf',
      expect.any(File),
      { cacheControl: '3600', upsert: false },
    );
  });
});
