'use client';

// APIDocumentationGenerator.tsx
// WS-072: API Documentation Generator
// Dynamic documentation generator for WedSync API endpoints

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Copy,
  Download,
  ExternalLink,
  Code,
  Book,
  Play,
  Settings,
} from 'lucide-react';

interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  requiredScope: string;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
    example?: any;
  }>;
  requestBody?: {
    contentType: string;
    schema: any;
    example: any;
  };
  responses: Array<{
    status: number;
    description: string;
    schema?: any;
    example?: any;
  }>;
  examples: Array<{
    title: string;
    language: string;
    code: string;
  }>;
}

const API_ENDPOINTS: APIEndpoint[] = [
  {
    path: '/v1/clients',
    method: 'GET',
    description: 'Retrieve a list of clients',
    requiredScope: 'read:clients',
    parameters: [
      {
        name: 'page',
        type: 'integer',
        required: false,
        description: 'Page number for pagination',
        example: 1,
      },
      {
        name: 'limit',
        type: 'integer',
        required: false,
        description: 'Number of items per page (max 100)',
        example: 20,
      },
      {
        name: 'search',
        type: 'string',
        required: false,
        description: 'Search term for client names or emails',
        example: 'john',
      },
      {
        name: 'status',
        type: 'string',
        required: false,
        description: 'Filter by client status',
        example: 'active',
      },
    ],
    responses: [
      {
        status: 200,
        description: 'List of clients retrieved successfully',
        example: {
          data: [
            {
              id: 'client_123',
              name: 'John & Jane Smith',
              email: 'john@example.com',
              weddingDate: '2024-06-15',
              status: 'active',
              createdAt: '2024-01-15T10:30:00Z',
            },
          ],
          meta: {
            totalCount: 150,
            page: 1,
            pageSize: 20,
            totalPages: 8,
          },
        },
      },
    ],
    examples: [
      {
        title: 'cURL',
        language: 'bash',
        code: `curl -X GET "https://api.wedsync.com/v1/clients?page=1&limit=20" \\
  -H "Authorization: Bearer ws_your_api_key_here" \\
  -H "Content-Type: application/json"`,
      },
      {
        title: 'JavaScript',
        language: 'javascript',
        code: `const response = await fetch('https://api.wedsync.com/v1/clients?page=1&limit=20', {
  headers: {
    'Authorization': 'Bearer ws_your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.data); // Array of clients`,
      },
      {
        title: 'Python',
        language: 'python',
        code: `import requests

headers = {
    'Authorization': 'Bearer ws_your_api_key_here',
    'Content-Type': 'application/json'
}

response = requests.get(
    'https://api.wedsync.com/v1/clients',
    headers=headers,
    params={'page': 1, 'limit': 20}
)

data = response.json()
print(data['data'])  # List of clients`,
      },
    ],
  },
  {
    path: '/v1/clients',
    method: 'POST',
    description: 'Create a new client',
    requiredScope: 'write:clients',
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        required: ['name', 'email', 'weddingDate'],
        properties: {
          name: {
            type: 'string',
            description: 'Client full name or couple names',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Primary contact email',
          },
          phone: {
            type: 'string',
            description: 'Primary contact phone number',
          },
          weddingDate: {
            type: 'string',
            format: 'date',
            description: 'Wedding date in YYYY-MM-DD format',
          },
          venue: { type: 'string', description: 'Wedding venue name' },
          guestCount: { type: 'integer', description: 'Estimated guest count' },
        },
      },
      example: {
        name: 'John & Jane Smith',
        email: 'john@example.com',
        phone: '+1-555-123-4567',
        weddingDate: '2024-06-15',
        venue: 'The Grand Ballroom',
        guestCount: 150,
      },
    },
    responses: [
      {
        status: 201,
        description: 'Client created successfully',
        example: {
          data: {
            id: 'client_456',
            name: 'John & Jane Smith',
            email: 'john@example.com',
            phone: '+1-555-123-4567',
            weddingDate: '2024-06-15',
            venue: 'The Grand Ballroom',
            guestCount: 150,
            status: 'active',
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-15T10:30:00Z',
          },
        },
      },
      {
        status: 400,
        description: 'Invalid request data',
        example: {
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: {
              email: 'Invalid email format',
              weddingDate: 'Date must be in the future',
            },
          },
        },
      },
    ],
    examples: [
      {
        title: 'cURL',
        language: 'bash',
        code: `curl -X POST "https://api.wedsync.com/v1/clients" \\
  -H "Authorization: Bearer ws_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "John & Jane Smith",
    "email": "john@example.com",
    "phone": "+1-555-123-4567",
    "weddingDate": "2024-06-15",
    "venue": "The Grand Ballroom",
    "guestCount": 150
  }'`,
      },
      {
        title: 'JavaScript',
        language: 'javascript',
        code: `const clientData = {
  name: 'John & Jane Smith',
  email: 'john@example.com',
  phone: '+1-555-123-4567',
  weddingDate: '2024-06-15',
  venue: 'The Grand Ballroom',
  guestCount: 150
};

const response = await fetch('https://api.wedsync.com/v1/clients', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ws_your_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(clientData)
});

const newClient = await response.json();
console.log(newClient.data);`,
      },
    ],
  },
  {
    path: '/v1/forms/{formId}/responses',
    method: 'GET',
    description: 'Get responses for a specific form',
    requiredScope: 'read:forms',
    parameters: [
      {
        name: 'formId',
        type: 'string',
        required: true,
        description: 'The form ID to get responses for',
        example: 'form_123',
      },
      {
        name: 'status',
        type: 'string',
        required: false,
        description: 'Filter by response status',
        example: 'completed',
      },
      {
        name: 'since',
        type: 'string',
        required: false,
        description: 'ISO date to get responses since',
        example: '2024-01-01T00:00:00Z',
      },
    ],
    responses: [
      {
        status: 200,
        description: 'Form responses retrieved successfully',
        example: {
          data: [
            {
              id: 'response_789',
              formId: 'form_123',
              clientId: 'client_456',
              responses: {
                dietary_restrictions: 'Vegetarian',
                song_requests: ['First Dance - Ed Sheeran'],
                guest_count: 2,
              },
              status: 'completed',
              submittedAt: '2024-01-20T15:45:00Z',
            },
          ],
          meta: { totalCount: 45 },
        },
      },
    ],
    examples: [
      {
        title: 'cURL',
        language: 'bash',
        code: `curl -X GET "https://api.wedsync.com/v1/forms/form_123/responses" \\
  -H "Authorization: Bearer ws_your_api_key_here" \\
  -H "Content-Type: application/json"`,
      },
    ],
  },
];

export function APIDocumentationGenerator() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint>(
    API_ENDPOINTS[0],
  );
  const [apiKey, setApiKey] = useState('ws_your_api_key_here');
  const [baseUrl, setBaseUrl] = useState('https://api.wedsync.com');
  const [selectedExample, setSelectedExample] = useState<string>('cURL');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-blue-100 text-blue-800';
      case 'POST':
        return 'bg-green-100 text-green-800';
      case 'PUT':
        return 'bg-yellow-100 text-yellow-800';
      case 'PATCH':
        return 'bg-orange-100 text-orange-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const generateRequestUrl = () => {
    let url = `${baseUrl}${selectedEndpoint.path}`;

    // Replace path parameters
    url = url.replace(/\{(\w+)\}/g, (match, param) => {
      const paramDef = selectedEndpoint.parameters?.find(
        (p) => p.name === param,
      );
      return paramDef?.example || `{${param}}`;
    });

    // Add query parameters
    const queryParams = selectedEndpoint.parameters
      ?.filter((p) => p.type !== 'path' && p.example)
      .map((p) => `${p.name}=${encodeURIComponent(p.example)}`)
      .join('&');

    if (queryParams && selectedEndpoint.method === 'GET') {
      url += `?${queryParams}`;
    }

    return url;
  };

  const generateCurlCommand = () => {
    const url = generateRequestUrl();
    let command = `curl -X ${selectedEndpoint.method} "${url}" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json"`;

    if (selectedEndpoint.requestBody && selectedEndpoint.method !== 'GET') {
      command += ` \\\n  -d '${JSON.stringify(selectedEndpoint.requestBody.example, null, 2)}'`;
    }

    return command;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">API Documentation</h2>
          <p className="text-gray-600">
            Interactive documentation and code examples for WedSync API
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export OpenAPI
          </Button>
          <Button variant="outline" size="sm">
            <ExternalLink className="w-4 h-4 mr-2" />
            Postman Collection
          </Button>
        </div>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuration
          </CardTitle>
          <CardDescription>
            Customize the documentation examples
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.wedsync.com"
              />
            </div>
            <div>
              <Label htmlFor="apiKey">Your API Key</Label>
              <Input
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="ws_your_api_key_here"
                type="password"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Endpoint List */}
        <div className="lg:col-span-1">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Endpoints</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {API_ENDPOINTS.map((endpoint, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedEndpoint(endpoint)}
                    className={`w-full text-left p-3 hover:bg-gray-50 transition-colors border-l-4 ${
                      selectedEndpoint === endpoint
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        className={`text-xs ${getMethodColor(endpoint.method)}`}
                      >
                        {endpoint.method}
                      </Badge>
                    </div>
                    <div className="font-mono text-sm text-gray-700 truncate">
                      {endpoint.path}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {endpoint.description}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Endpoint Details */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Badge className={`${getMethodColor(selectedEndpoint.method)}`}>
                  {selectedEndpoint.method}
                </Badge>
                <span className="font-mono">{selectedEndpoint.path}</span>
              </CardTitle>
              <CardDescription>{selectedEndpoint.description}</CardDescription>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  Requires: {selectedEndpoint.requiredScope}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="parameters">Parameters</TabsTrigger>
                  <TabsTrigger value="examples">Examples</TabsTrigger>
                  <TabsTrigger value="responses">Responses</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Request URL</h4>
                    <div className="flex items-center gap-2">
                      <Input
                        value={generateRequestUrl()}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generateRequestUrl())}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Quick Test</h4>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                      <pre>{generateCurlCommand()}</pre>
                    </div>
                    <div className="flex justify-end mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generateCurlCommand())}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy cURL
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="parameters" className="space-y-4">
                  {selectedEndpoint.parameters &&
                  selectedEndpoint.parameters.length > 0 ? (
                    <div className="space-y-4">
                      {selectedEndpoint.parameters.map((param, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                              {param.name}
                            </code>
                            <Badge
                              variant={
                                param.required ? 'destructive' : 'secondary'
                              }
                              className="text-xs"
                            >
                              {param.required ? 'Required' : 'Optional'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {param.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {param.description}
                          </p>
                          {param.example && (
                            <div>
                              <span className="text-xs text-gray-500">
                                Example:{' '}
                              </span>
                              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                {JSON.stringify(param.example)}
                              </code>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No parameters required for this endpoint
                    </div>
                  )}

                  {selectedEndpoint.requestBody && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Request Body</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="mb-2">
                          <Badge variant="outline" className="text-xs">
                            {selectedEndpoint.requestBody.contentType}
                          </Badge>
                        </div>
                        <pre className="text-sm overflow-x-auto">
                          {JSON.stringify(
                            selectedEndpoint.requestBody.example,
                            null,
                            2,
                          )}
                        </pre>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="examples" className="space-y-4">
                  <div className="flex gap-2 mb-4">
                    {selectedEndpoint.examples.map((example) => (
                      <Button
                        key={example.language}
                        variant={
                          selectedExample === example.language
                            ? 'default'
                            : 'outline'
                        }
                        size="sm"
                        onClick={() => setSelectedExample(example.language)}
                      >
                        {example.title}
                      </Button>
                    ))}
                  </div>

                  {selectedEndpoint.examples
                    .filter(
                      (example) =>
                        example.language === selectedExample ||
                        example.title === selectedExample,
                    )
                    .map((example, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">{example.title}</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(example.code)}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </Button>
                        </div>
                        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                          <pre>{example.code}</pre>
                        </div>
                      </div>
                    ))}
                </TabsContent>

                <TabsContent value="responses" className="space-y-4">
                  {selectedEndpoint.responses.map((response, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge
                          className={`${
                            response.status < 300
                              ? 'bg-green-100 text-green-800'
                              : response.status < 400
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {response.status}
                        </Badge>
                        <span className="text-sm font-medium">
                          {response.description}
                        </span>
                      </div>
                      {response.example && (
                        <div className="bg-gray-50 p-3 rounded font-mono text-sm overflow-x-auto">
                          <pre>{JSON.stringify(response.example, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
