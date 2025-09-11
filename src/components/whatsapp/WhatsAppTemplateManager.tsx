'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED';
  category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
  language: string;
  components?: any[];
  created_at?: string;
  updated_at?: string;
}

interface WhatsAppTemplateManagerProps {
  onCreateTemplate: (template: any) => Promise<void>;
  onDeleteTemplate: (templateName: string) => Promise<void>;
  className?: string;
}

export function WhatsAppTemplateManager({
  onCreateTemplate,
  onDeleteTemplate,
  className = '',
}: WhatsAppTemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'UTILITY' as 'AUTHENTICATION' | 'MARKETING' | 'UTILITY',
    language: 'en_US',
    bodyText: '',
    headerText: '',
    footerText: '',
    hasButtons: false,
    buttons: [],
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/whatsapp/templates');
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Load templates error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);

    try {
      const components: any[] = [];

      // Add header if provided
      if (formData.headerText.trim()) {
        components.push({
          type: 'HEADER',
          format: 'TEXT',
          text: formData.headerText.trim(),
        });
      }

      // Add body (required)
      components.push({
        type: 'BODY',
        text: formData.bodyText.trim(),
      });

      // Add footer if provided
      if (formData.footerText.trim()) {
        components.push({
          type: 'FOOTER',
          text: formData.footerText.trim(),
        });
      }

      const templateData = {
        name: formData.name,
        language: formData.language,
        category: formData.category,
        components,
      };

      await onCreateTemplate(templateData);

      // Reset form and reload templates
      setFormData({
        name: '',
        category: 'UTILITY',
        language: 'en_US',
        bodyText: '',
        headerText: '',
        footerText: '',
        hasButtons: false,
        buttons: [],
      });
      setShowCreateForm(false);
      await loadTemplates();
    } catch (error) {
      console.error('Create template error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (templateName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the template "${templateName}"?`,
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      await onDeleteTemplate(templateName);
      await loadTemplates();
    } catch (error) {
      console.error('Delete template error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: Template['status']) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4 text-success-600" />;
      case 'PENDING':
        return <Clock className="w-4 h-4 text-warning-600" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4 text-error-600" />;
      case 'PAUSED':
        return <AlertCircle className="w-4 h-4 text-warning-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: Template['status']) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-success-50 text-success-700 border-success-200';
      case 'PENDING':
        return 'bg-warning-50 text-warning-700 border-warning-200';
      case 'REJECTED':
        return 'bg-error-50 text-error-700 border-error-200';
      case 'PAUSED':
        return 'bg-warning-50 text-warning-700 border-warning-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getCategoryColor = (category: Template['category']) => {
    switch (category) {
      case 'MARKETING':
        return 'bg-primary-50 text-primary-700 border-primary-200';
      case 'AUTHENTICATION':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'UTILITY':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Message Templates
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage WhatsApp message templates for your business communications
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="
            flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700
            text-white font-medium text-sm rounded-lg shadow-xs hover:shadow-sm
            transition-all duration-200
            focus:outline-none focus:ring-4 focus:ring-primary-100
          "
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-xl">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Create Message Template
              </h3>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="venue_confirmation"
                      required
                      className="
                        w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                        text-gray-900 placeholder-gray-500 shadow-xs
                        focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                        transition-all duration-200
                      "
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          category: e.target.value as
                            | 'AUTHENTICATION'
                            | 'MARKETING'
                            | 'UTILITY',
                        }))
                      }
                      className="
                        w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                        text-gray-900 shadow-xs
                        focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                        transition-all duration-200
                      "
                    >
                      <option value="UTILITY">Utility</option>
                      <option value="MARKETING">Marketing</option>
                      <option value="AUTHENTICATION">Authentication</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Header (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.headerText}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        headerText: e.target.value,
                      }))
                    }
                    placeholder="Venue Confirmation"
                    className="
                      w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                      text-gray-900 placeholder-gray-500 shadow-xs
                      focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                      transition-all duration-200
                    "
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message Body *
                  </label>
                  <textarea
                    value={formData.bodyText}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        bodyText: e.target.value,
                      }))
                    }
                    placeholder="Your venue booking for {{1}} has been confirmed for {{2}}. Please review the details and let us know if you have any questions."
                    rows={4}
                    required
                    className="
                      w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                      text-gray-900 placeholder-gray-500 shadow-xs resize-none
                      focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                      transition-all duration-200
                    "
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use {'{{1}}'}, {'{{2}}'}, etc. for variables
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Footer (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.footerText}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        footerText: e.target.value,
                      }))
                    }
                    placeholder="WedSync - Your wedding coordination partner"
                    className="
                      w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg
                      text-gray-900 placeholder-gray-500 shadow-xs
                      focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300
                      transition-all duration-200
                    "
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="
                      px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200
                      font-medium text-sm rounded-lg
                      transition-all duration-200
                    "
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="
                      flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700
                      text-white font-medium text-sm rounded-lg shadow-xs hover:shadow-sm
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-200
                    "
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Template'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600 mb-4">No templates found</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Create your first template
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-6 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {template.name}
                      </h3>

                      <span
                        className={`
                        inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border
                        ${getStatusColor(template.status)}
                      `}
                      >
                        {getStatusIcon(template.status)}
                        {template.status}
                      </span>

                      <span
                        className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                        ${getCategoryColor(template.category)}
                      `}
                      >
                        {template.category}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600">
                      Language: {template.language} • Components:{' '}
                      {template.components?.length || 0}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="
                        p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100
                        rounded-lg transition-all duration-200
                      "
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(template.name)}
                      disabled={isLoading}
                      className="
                        p-2 text-error-500 hover:text-error-700 hover:bg-error-50
                        rounded-lg transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                      "
                      title="Delete Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
