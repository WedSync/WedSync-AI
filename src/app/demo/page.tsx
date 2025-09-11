'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isDemoMode, validateDemoMode, DEMO_PERSONAS, getPersonaById, type DemoPersona } from '@/lib/demo/config';
import { demoAuth } from '@/lib/demo/auth';

export default function DemoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check demo mode and validate
  useEffect(() => {
    try {
      validateDemoMode();
      if (!isDemoMode()) {
        router.push('/');
        return;
      }

      // Handle deep link persona parameter
      const personaParam = searchParams.get('persona');
      if (personaParam) {
        const persona = getPersonaById(personaParam);
        if (persona) {
          handlePersonaSelect(personaParam);
        }
      }
    } catch (error) {
      console.error('Demo mode validation failed:', error);
      router.push('/');
    }
  }, [searchParams, router]);

  const handlePersonaSelect = async (personaId: string) => {
    setSelectedPersona(personaId);
    setIsLoading(true);

    try {
      // Sign in with demo persona
      const { data, error } = await demoAuth.signIn(personaId);

      if (error) {
        console.error('Demo sign in failed:', error);
        setIsLoading(false);
        setSelectedPersona(null);
        return;
      }

      // Navigate to appropriate dashboard
      const persona = getPersonaById(personaId);
      if (persona) {
        const dashboardUrl = getDashboardUrl(persona);
        router.push(dashboardUrl);
      }
    } catch (error) {
      console.error('Demo authentication error:', error);
      setIsLoading(false);
      setSelectedPersona(null);
    }
  };

  const getDashboardUrl = (persona: DemoPersona): string => {
    switch (persona.type) {
      case 'couple':
        return '/client/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/dashboard';
    }
  };

  const PersonaCard = ({ persona }: { persona: DemoPersona }) => {
    const isSelected = selectedPersona === persona.id;
    const isCurrentlyLoading = isLoading && isSelected;

    return (
      <div
        key={persona.id}
        className={`
          relative p-6 rounded-lg border-2 cursor-pointer transition-all duration-200
          ${isSelected
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
          }
          ${isCurrentlyLoading ? 'opacity-75' : ''}
        `}
        onClick={() => !isLoading && handlePersonaSelect(persona.id)}
      >
        {isCurrentlyLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        <div className="flex items-start space-x-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
            style={{ backgroundColor: persona.colors.primary }}
          >
            {persona.company?.charAt(0) || persona.name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {persona.company || persona.name}
            </h3>
            {persona.company && (
              <p className="text-sm text-gray-600 mb-2">{persona.name}</p>
            )}

            <div
              className="inline-block px-2 py-1 rounded-full text-xs font-medium mb-2"
              style={{
                backgroundColor: persona.colors.primary + '20',
                color: persona.colors.primary
              }}
            >
              {persona.type}
            </div>

            <p className="text-sm text-gray-600 mb-2">
              {isCurrentlyLoading ? '🚀 Loading demo environment...' : persona.description}
            </p>

            <p className="text-xs text-gray-500">
              📍 {persona.location}
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (!isDemoMode()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Demo Mode Disabled</h1>
          <p className="text-gray-600">Demo mode is only available in development environment.</p>
        </div>
      </div>
    );
  }

  // Group personas by type
  const couples = DEMO_PERSONAS.filter(p => p.type === 'couple');
  const suppliers = DEMO_PERSONAS.filter(p => p.type === 'supplier');
  const admins = DEMO_PERSONAS.filter(p => p.type === 'admin');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Mode Banner */}
      <div className="bg-yellow-100 border-b border-yellow-200 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-800 font-medium">🎭 Demo Mode Active - Sample data only</span>
            <span className="text-yellow-600">|</span>
            <span className="text-yellow-700">Development environment</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">WedSync Demo Platform</h1>
          <p className="text-xl text-gray-600 mb-6">Experience the complete wedding management ecosystem</p>

          <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-lg border border-blue-200">
            <div className="text-2xl mr-3">🎉</div>
            <div className="text-left">
              <div className="text-sm text-blue-800">
                <strong>Demo Mode Active</strong> - Explore all features with sample data
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Couples Section */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">👰🤵 Couples (WedMe.app)</h2>
            <div className="space-y-4">
              {couples.map(persona => (
                <PersonaCard key={persona.id} persona={persona} />
              ))}
            </div>
          </div>

          {/* Suppliers Section */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">🏢 Wedding Suppliers (WedSync)</h2>
            <div className="space-y-4">
              {suppliers.map(persona => (
                <PersonaCard key={persona.id} persona={persona} />
              ))}
            </div>
          </div>

          {/* Admin Section */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">⚙️ Platform Administration</h2>
            <div className="space-y-4">
              {admins.map(persona => (
                <PersonaCard key={persona.id} persona={persona} />
              ))}
            </div>

            {/* Quick Access */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Access</h2>
              <div className="space-y-2">
                <a
                  href="/demo?persona=couple-sarah-michael"
                  className="block px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                >
                  👰 Sarah & Michael
                </a>
                <a
                  href="/demo?persona=photographer-everlight"
                  className="block px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                >
                  📸 Everlight Photography
                </a>
                <a
                  href="/demo?persona=venue-old-barn"
                  className="block px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                >
                  🏛️ The Old Barn
                </a>
                <a
                  href="/demo?persona=admin-wedsync"
                  className="block px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                >
                  ⚙️ Admin Dashboard
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            This is a demonstration environment with sample data. No real transactions or data storage occurs in demo mode.
          </p>
        </div>
      </div>
    </div>
  );
}