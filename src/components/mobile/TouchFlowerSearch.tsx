'use client';

import { useState, useEffect, useMemo } from 'react';
import { useHaptic } from '@/hooks/useTouch';
import { MobileColorPicker } from './MobileColorPicker';

interface FlowerData {
  id: string;
  common_name: string;
  scientific_name: string;
  colors: string[];
  seasonal_score: number;
  wedding_uses: string[];
  sustainability_score?: number;
  offline?: boolean;
}

interface TouchFlowerSearchProps {
  weddingId?: string;
  isOffline: boolean;
  onFlowerSelect?: (flower: FlowerData) => void;
}

export function TouchFlowerSearch({
  weddingId,
  isOffline,
  onFlowerSelect,
}: TouchFlowerSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FF69B4');
  const [selectedUses, setSelectedUses] = useState<string[]>([]);
  const [minSustainability, setMinSustainability] = useState(0);
  const [flowers, setFlowers] = useState<FlowerData[]>([]);
  const [loading, setLoading] = useState(false);
  const { light: lightHaptic, success: successHaptic } = useHaptic();

  const weddingUses = [
    { id: 'bouquet', label: '💐 Bouquet', icon: '💐' },
    { id: 'centerpiece', label: '🌸 Centerpiece', icon: '🌸' },
    { id: 'ceremony', label: '⛪ Ceremony', icon: '⛪' },
    { id: 'boutonniere', label: '🤵 Boutonniere', icon: '🤵' },
    { id: 'corsage', label: '👰 Corsage', icon: '👰' },
  ];

  // Mock flower data for demonstration
  const mockFlowers: FlowerData[] = useMemo(
    () => [
      {
        id: '1',
        common_name: 'Garden Rose',
        scientific_name: 'Rosa x damascena',
        colors: ['#FF69B4', '#FFFFFF', '#FF0000', '#FFB6C1'],
        seasonal_score: 0.9,
        wedding_uses: ['bouquet', 'centerpiece', 'ceremony'],
        sustainability_score: 0.8,
      },
      {
        id: '2',
        common_name: 'Peony',
        scientific_name: 'Paeonia lactiflora',
        colors: ['#FF69B4', '#FFFFFF', '#FF1493'],
        seasonal_score: 0.6,
        wedding_uses: ['bouquet', 'centerpiece'],
        sustainability_score: 0.7,
      },
      {
        id: '3',
        common_name: "Baby's Breath",
        scientific_name: 'Gypsophila paniculata',
        colors: ['#FFFFFF', '#F8F8FF'],
        seasonal_score: 0.9,
        wedding_uses: ['bouquet', 'centerpiece', 'ceremony'],
        sustainability_score: 0.9,
      },
      {
        id: '4',
        common_name: 'Eucalyptus',
        scientific_name: 'Eucalyptus cinerea',
        colors: ['#228B22', '#90EE90', '#9ACD32'],
        seasonal_score: 0.8,
        wedding_uses: ['bouquet', 'centerpiece'],
        sustainability_score: 0.6,
      },
    ],
    [],
  );

  const filteredFlowers = useMemo(() => {
    return mockFlowers.filter((flower) => {
      // Text search
      const matchesSearch =
        !searchQuery ||
        flower.common_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        flower.scientific_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      // Color match (check if any flower color is similar to selected color)
      const matchesColor =
        !selectedColor ||
        flower.colors.some(
          (color) => colorDistance(color, selectedColor) < 100,
        );

      // Wedding uses
      const matchesUses =
        selectedUses.length === 0 ||
        selectedUses.some((use) => flower.wedding_uses.includes(use));

      // Sustainability
      const matchesSustainability =
        !flower.sustainability_score ||
        flower.sustainability_score >= minSustainability;

      return (
        matchesSearch && matchesColor && matchesUses && matchesSustainability
      );
    });
  }, [
    mockFlowers,
    searchQuery,
    selectedColor,
    selectedUses,
    minSustainability,
  ]);

  useEffect(() => {
    if (isOffline) {
      // Use offline data
      setFlowers(mockFlowers);
    } else {
      // In a real app, this would fetch from API
      setFlowers(mockFlowers);
    }
  }, [isOffline, mockFlowers]);

  const colorDistance = (color1: string, color2: string): number => {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');

    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);

    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);

    return Math.sqrt(
      Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2),
    );
  };

  const handleUseToggle = (useId: string) => {
    setSelectedUses((prev) =>
      prev.includes(useId)
        ? prev.filter((id) => id !== useId)
        : [...prev, useId],
    );
    lightHaptic();
  };

  const handleFlowerSelect = (flower: FlowerData) => {
    onFlowerSelect?.(flower);
    successHaptic();
  };

  const handleSearch = async () => {
    if (isOffline) return;

    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
  };

  return (
    <div className="touch-flower-search space-y-6">
      {isOffline && (
        <div className="bg-amber-100 border-amber-400 border rounded-lg p-3">
          <p className="text-amber-800 text-sm">
            📱 Offline Mode: Showing cached flower data
          </p>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search flowers by name..."
          className="w-full px-4 py-3 rounded-lg border border-gray-300 text-lg touch-manipulation"
          style={{ touchAction: 'manipulation' }}
        />
        <button
          onClick={handleSearch}
          disabled={loading || isOffline}
          className="absolute right-2 top-2 p-2 text-gray-500 hover:text-blue-500 min-h-[44px] min-w-[44px] touch-manipulation"
          style={{ touchAction: 'manipulation' }}
        >
          {loading ? '⏳' : '🔍'}
        </button>
      </div>

      {/* Color Filter */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Filter by Color
        </label>
        <MobileColorPicker
          value={selectedColor}
          onChange={setSelectedColor}
          showHistory={false}
        />
      </div>

      {/* Wedding Uses Filter */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Wedding Uses
        </label>
        <div className="flex flex-wrap gap-2">
          {weddingUses.map((use) => (
            <button
              key={use.id}
              onClick={() => handleUseToggle(use.id)}
              className={`
                px-3 py-2 rounded-full text-sm font-medium min-h-[44px] touch-manipulation
                transition-all duration-200
                ${
                  selectedUses.includes(use.id)
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                }
              `}
              style={{ touchAction: 'manipulation' }}
            >
              {use.icon} {use.label.split(' ')[1]}
            </button>
          ))}
        </div>
      </div>

      {/* Sustainability Filter */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Minimum Sustainability Score: {Math.round(minSustainability * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={minSustainability}
          onChange={(e) => setMinSustainability(parseFloat(e.target.value))}
          className="w-full h-8 rounded-lg appearance-none touch-manipulation bg-green-100"
          style={{ touchAction: 'manipulation' }}
        />
      </div>

      {/* Results */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Flowers ({filteredFlowers.length})
          </h3>
          {isOffline && (
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              Cached
            </span>
          )}
        </div>

        {filteredFlowers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🌸</div>
            <p>No flowers match your criteria</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredFlowers.map((flower) => (
              <button
                key={flower.id}
                onClick={() => handleFlowerSelect(flower)}
                className="bg-white border border-gray-200 rounded-lg p-4 text-left touch-manipulation active:scale-95 transition-transform shadow-sm"
                style={{ touchAction: 'manipulation' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {flower.common_name}
                    </h4>
                    <p className="text-sm text-gray-500 italic">
                      {flower.scientific_name}
                    </p>
                    <div className="flex items-center mt-2 space-x-2">
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        🌱{' '}
                        {Math.round((flower.sustainability_score || 0) * 100)}%
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        📅 {Math.round(flower.seasonal_score * 100)}%
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {flower.wedding_uses.map((use) => (
                        <span
                          key={use}
                          className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded"
                        >
                          {weddingUses.find((u) => u.id === use)?.icon} {use}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 ml-3">
                    {flower.colors.slice(0, 4).map((color, index) => (
                      <div
                        key={index}
                        className="w-6 h-6 rounded-full border border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    {flower.colors.length > 4 && (
                      <div className="w-6 h-6 rounded-full border border-gray-300 bg-gray-100 flex items-center justify-center text-xs">
                        +{flower.colors.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
