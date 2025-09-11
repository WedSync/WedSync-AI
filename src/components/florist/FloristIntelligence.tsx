'use client';

import { useState } from 'react';
import { Tab } from '@headlessui/react';
import { FlowerSearch } from './FlowerSearch';
import { ColorPaletteGenerator } from './ColorPaletteGenerator';
import { ArrangementPlanner } from './ArrangementPlanner';
import { SustainabilityAnalyzer } from './SustainabilityAnalyzer';
import {
  MagnifyingGlassIcon,
  SwatchIcon,
  SparklesIcon,
  LeafIcon,
} from '@heroicons/react/24/outline';
import { classNames } from '@/lib/utils';

interface FloristIntelligenceProps {
  weddingId?: string;
  onRecommendationSelect?: (recommendation: any) => void;
  initialMode?: 'search' | 'palette' | 'arrangement' | 'sustainability';
  className?: string;
}

const tabs = [
  {
    id: 'search',
    name: 'Flower Search',
    icon: MagnifyingGlassIcon,
    emoji: '🔍',
  },
  {
    id: 'palette',
    name: 'Color Palette',
    icon: SwatchIcon,
    emoji: '🎨',
  },
  {
    id: 'arrangement',
    name: 'Arrangement',
    icon: SparklesIcon,
    emoji: '💐',
  },
  {
    id: 'sustainability',
    name: 'Sustainability',
    icon: LeafIcon,
    emoji: '🌱',
  },
];

export function FloristIntelligence({
  weddingId,
  onRecommendationSelect,
  initialMode = 'search',
  className = '',
}: FloristIntelligenceProps) {
  const initialTabIndex = tabs.findIndex((tab) => tab.id === initialMode);
  const [selectedIndex, setSelectedIndex] = useState(
    initialTabIndex >= 0 ? initialTabIndex : 0,
  );
  const [searchResults, setSearchResults] = useState(null);
  const [generatedPalette, setGeneratedPalette] = useState(null);

  return (
    <div
      className={`space-y-6 ${className}`}
      role="main"
      aria-label="Florist Intelligence System"
    >
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <span className="text-3xl" role="img" aria-label="Florist">
                🌺
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                AI Florist Intelligence
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Smart tools for flower selection, color harmony, and sustainable
                arrangements
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
            <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 p-1">
              {tabs.map((tab, index) => (
                <Tab
                  key={tab.id}
                  className={({ selected }) =>
                    classNames(
                      'w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-colors',
                      'ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                      selected
                        ? 'bg-white text-blue-700 shadow'
                        : 'text-gray-700 hover:bg-white/[0.12] hover:text-gray-900',
                    )
                  }
                  aria-label={`Switch to ${tab.name} tab`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-lg" role="img" aria-hidden="true">
                      {tab.emoji}
                    </span>
                    <span className="hidden sm:inline">{tab.name}</span>
                  </div>
                </Tab>
              ))}
            </Tab.List>

            <Tab.Panels className="mt-6">
              <Tab.Panel
                className="rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Flower Search Panel"
              >
                <FlowerSearch
                  weddingId={weddingId}
                  onResultsUpdate={setSearchResults}
                  onFlowerSelect={onRecommendationSelect}
                />
              </Tab.Panel>

              <Tab.Panel
                className="rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Color Palette Generator Panel"
              >
                <ColorPaletteGenerator
                  weddingId={weddingId}
                  onPaletteGenerated={setGeneratedPalette}
                  initialColors={generatedPalette?.colors}
                />
              </Tab.Panel>

              <Tab.Panel
                className="rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Arrangement Planner Panel"
              >
                <ArrangementPlanner
                  weddingId={weddingId}
                  selectedFlowers={searchResults?.flowers}
                  colorPalette={generatedPalette}
                  onArrangementComplete={onRecommendationSelect}
                />
              </Tab.Panel>

              <Tab.Panel
                className="rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Sustainability Analyzer Panel"
              >
                <SustainabilityAnalyzer
                  weddingId={weddingId}
                  selectedFlowers={searchResults?.flowers}
                  onAnalysisComplete={onRecommendationSelect}
                />
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      </div>
    </div>
  );
}
