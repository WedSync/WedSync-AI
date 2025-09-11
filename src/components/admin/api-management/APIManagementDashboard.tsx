'use client';

import React, { useState } from 'react';
import { Key, Activity, Shield, AlertCircle } from 'lucide-react';

export default function APIManagementDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const apiStats = {
    totalRequests: 125000,
    activeKeys: 42,
    errorRate: 0.5,
    avgResponseTime: 145,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">API Management</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Generate New Key
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">
                {apiStats.totalRequests.toLocaleString()}
              </p>
            </div>
            <Activity className="text-blue-500" size={32} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Keys</p>
              <p className="text-2xl font-bold text-gray-900">
                {apiStats.activeKeys}
              </p>
            </div>
            <Key className="text-green-500" size={32} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Error Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {apiStats.errorRate}%
              </p>
            </div>
            <AlertCircle className="text-red-500" size={32} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Response</p>
              <p className="text-2xl font-bold text-gray-900">
                {apiStats.avgResponseTime}ms
              </p>
            </div>
            <Shield className="text-purple-500" size={32} />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {['overview', 'keys', 'usage', 'logs'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">API Overview</h3>
              <p className="text-gray-600">
                Monitor your API usage, manage keys, and view system health
                metrics.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Quick Stats</h4>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>
                    • {apiStats.totalRequests.toLocaleString()} total API calls
                    this month
                  </li>
                  <li>• {apiStats.activeKeys} active API keys</li>
                  <li>• {apiStats.errorRate}% error rate (excellent!)</li>
                  <li>• {apiStats.avgResponseTime}ms average response time</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'keys' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">API Keys Management</h3>
              <p className="text-gray-600">
                Manage API keys and their permissions.
              </p>
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <Key className="mx-auto text-gray-400 mb-2" size={48} />
                <p className="text-gray-500">
                  API key management interface would be here
                </p>
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Usage Analytics</h3>
              <p className="text-gray-600">
                View detailed API usage patterns and trends.
              </p>
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <Activity className="mx-auto text-gray-400 mb-2" size={48} />
                <p className="text-gray-500">
                  Usage analytics dashboard would be here
                </p>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">API Logs</h3>
              <p className="text-gray-600">
                View recent API requests and responses.
              </p>
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <Shield className="mx-auto text-gray-400 mb-2" size={48} />
                <p className="text-gray-500">API logs viewer would be here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
