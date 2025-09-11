// /app/(dashboard)/api-keys/page.tsx
// WS-072: API Keys Dashboard Page
// Main dashboard for managing third-party integration API keys

import React from 'react';
import { Metadata } from 'next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { APIKeyManager } from '@/components/api-keys/APIKeyManager';
import {
  Key,
  Shield,
  Activity,
  Globe,
  Zap,
  ExternalLink,
  FileText,
  Settings,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'API Keys - WedSync',
  description:
    'Manage API keys for third-party integrations and webhook access',
};

export default function APIKeysPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Key className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">API Keys & Integrations</h1>
        </div>
        <p className="text-gray-600 text-lg">
          Securely connect WedSync with your favorite tools and platforms
        </p>
      </div>

      {/* Quick Stats & Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Enterprise</div>
            <p className="text-xs text-gray-600">
              256-bit encryption, IP whitelisting, scope-based permissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limiting</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">Smart</div>
            <p className="text-xs text-gray-600">
              Configurable limits per minute, hour, and day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Integrations</CardTitle>
            <Globe className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">Ready</div>
            <p className="text-xs text-gray-600">
              Zapier, HubSpot, Monday.com, Slack, and more
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monitoring</CardTitle>
            <Settings className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">Real-time</div>
            <p className="text-xs text-gray-600">
              Usage analytics, error tracking, performance metrics
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Integration Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Popular Integrations
            </CardTitle>
            <CardDescription>
              Connect WedSync with your existing workflow tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-sm">Z</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Zapier</h4>
                  <p className="text-sm text-gray-600">Automate workflows</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">H</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">HubSpot</h4>
                  <p className="text-sm text-gray-600">CRM integration</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 font-bold text-sm">M</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Monday.com</h4>
                  <p className="text-sm text-gray-600">Project management</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 font-bold text-sm">S</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Slack</h4>
                  <p className="text-sm text-gray-600">Team notifications</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Documentation
            </CardTitle>
            <CardDescription>
              Everything you need to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/docs/api/getting-started"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium">Getting Started</span>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>

            <a
              href="/docs/api/authentication"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium">Authentication</span>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>

            <a
              href="/docs/api/endpoints"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium">API Reference</span>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>

            <a
              href="/docs/integrations"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium">Integration Guides</span>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Security Notice */}
      <div className="mb-8">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 mb-1">
                  Security Best Practices
                </h3>
                <p className="text-blue-800 text-sm mb-3">
                  Keep your API keys secure by following these recommendations:
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Store keys in environment variables, never in code</li>
                  <li>• Use scope-based permissions to limit access</li>
                  <li>• Set appropriate rate limits for your use case</li>
                  <li>• Rotate keys regularly and revoke unused ones</li>
                  <li>• Monitor usage for suspicious activity</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Key Manager */}
      <APIKeyManager />

      {/* Usage Examples */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Start Examples</CardTitle>
            <CardDescription>
              Common patterns for using WedSync API keys
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* cURL Example */}
            <div>
              <h4 className="font-medium mb-2">cURL Request</h4>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre>{`curl -X GET "https://api.wedsync.com/v1/clients" \\
  -H "Authorization: Bearer ws_your_api_key_here" \\
  -H "Content-Type: application/json"`}</pre>
              </div>
            </div>

            {/* JavaScript Example */}
            <div>
              <h4 className="font-medium mb-2">JavaScript / Node.js</h4>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre>{`const response = await fetch('https://api.wedsync.com/v1/clients', {
  headers: {
    'Authorization': 'Bearer ws_your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();`}</pre>
              </div>
            </div>

            {/* Python Example */}
            <div>
              <h4 className="font-medium mb-2">Python</h4>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre>{`import requests

headers = {
    'Authorization': 'Bearer ws_your_api_key_here',
    'Content-Type': 'application/json'
}

response = requests.get('https://api.wedsync.com/v1/clients', headers=headers)
data = response.json()`}</pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
