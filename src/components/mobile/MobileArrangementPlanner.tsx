'use client';

import { useState } from 'react';
import { useHaptic, useTouchDrag } from '@/hooks/useTouch';

interface ArrangementItem {
  id: string;
  type: 'flower' | 'greenery' | 'accent';
  name: string;
  color: string;
  quantity: number;
  position?: { x: number; y: number };
}

interface MobileArrangementPlannerProps {
  weddingId?: string;
  isOffline: boolean;
  onArrangementComplete?: (arrangement: any) => void;
}

export function MobileArrangementPlanner({
  weddingId,
  isOffline,
  onArrangementComplete,
}: MobileArrangementPlannerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('bouquet');
  const [arrangementItems, setArrangementItems] = useState<ArrangementItem[]>(
    [],
  );
  const [availableItems] = useState<ArrangementItem[]>([
    { id: '1', type: 'flower', name: 'Rose', color: '#FF69B4', quantity: 12 },
    { id: '2', type: 'flower', name: 'Peony', color: '#FF1493', quantity: 8 },
    {
      id: '3',
      type: 'greenery',
      name: 'Eucalyptus',
      color: '#228B22',
      quantity: 6,
    },
    {
      id: '4',
      type: 'accent',
      name: "Baby's Breath",
      color: '#FFFFFF',
      quantity: 10,
    },
    {
      id: '5',
      type: 'flower',
      name: 'Hydrangea',
      color: '#87CEEB',
      quantity: 5,
    },
    { id: '6', type: 'greenery', name: 'Fern', color: '#228B22', quantity: 4 },
  ]);

  const { success: successHaptic, light: lightHaptic } = useHaptic();

  const templates = [
    {
      id: 'bouquet',
      name: '💐 Bridal Bouquet',
      description: 'Classic round bouquet',
      maxItems: 6,
    },
    {
      id: 'centerpiece',
      name: '🌸 Centerpiece',
      description: 'Table centerpiece arrangement',
      maxItems: 8,
    },
    {
      id: 'boutonniere',
      name: '🤵 Boutonniere',
      description: "Groom's lapel pin",
      maxItems: 3,
    },
    {
      id: 'corsage',
      name: '👰 Corsage',
      description: 'Wrist or pin corsage',
      maxItems: 4,
    },
  ];

  const {
    isDragging,
    dragPosition,
    handlers: dragHandlers,
  } = useTouchDrag({
    threshold: 10,
    onDragStart: (position) => {
      console.log('Drag started:', position);
      lightHaptic();
    },
    onDragMove: (position) => {
      // Visual feedback during drag
    },
    onDragEnd: (position) => {
      console.log('Drag ended:', position);
      successHaptic();
    },
  });

  const addToArrangement = (item: ArrangementItem) => {
    const currentTemplate = templates.find((t) => t.id === selectedTemplate);
    if (
      !currentTemplate ||
      arrangementItems.length >= currentTemplate.maxItems
    ) {
      return;
    }

    const newItem = {
      ...item,
      id: `${item.id}-${Date.now()}`,
      quantity: 1,
      position: { x: Math.random() * 200, y: Math.random() * 200 },
    };

    setArrangementItems([...arrangementItems, newItem]);
    successHaptic();
  };

  const removeFromArrangement = (itemId: string) => {
    setArrangementItems(arrangementItems.filter((item) => item.id !== itemId));
    lightHaptic();
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return;

    setArrangementItems((items) =>
      items.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
    );
    lightHaptic();
  };

  const clearArrangement = () => {
    setArrangementItems([]);
    successHaptic();
  };

  const saveArrangement = () => {
    const arrangement = {
      template: selectedTemplate,
      items: arrangementItems,
      totalCost: calculateTotalCost(),
      weddingId,
    };

    onArrangementComplete?.(arrangement);
    successHaptic();
  };

  const calculateTotalCost = () => {
    // Mock pricing calculation
    return arrangementItems.reduce((total, item) => {
      const baseCost =
        item.type === 'flower' ? 3 : item.type === 'greenery' ? 1 : 2;
      return total + baseCost * item.quantity;
    }, 0);
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'flower':
        return '🌸';
      case 'greenery':
        return '🌿';
      case 'accent':
        return '✨';
      default:
        return '💐';
    }
  };

  return (
    <div className="mobile-arrangement-planner space-y-6">
      {isOffline && (
        <div className="bg-amber-100 border-amber-400 border rounded-lg p-3">
          <p className="text-amber-800 text-sm">
            💐 Offline Mode: Basic arrangement planning available
          </p>
        </div>
      )}

      {/* Template Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Arrangement Type
        </label>
        <div className="grid grid-cols-1 gap-2">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => {
                setSelectedTemplate(template.id);
                setArrangementItems([]); // Clear when switching templates
                lightHaptic();
              }}
              className={`
                p-4 rounded-lg text-left touch-manipulation transition-all duration-200
                ${
                  selectedTemplate === template.id
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-50 text-gray-700 active:bg-gray-100'
                }
              `}
              style={{ touchAction: 'manipulation' }}
            >
              <div className="font-medium">{template.name}</div>
              <div className="text-sm opacity-75 mt-1">
                {template.description}
              </div>
              <div className="text-xs opacity-60 mt-2">
                Max {template.maxItems} items
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Current Arrangement */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            Current Arrangement ({arrangementItems.length}/
            {templates.find((t) => t.id === selectedTemplate)?.maxItems})
          </h3>
          {arrangementItems.length > 0 && (
            <button
              onClick={clearArrangement}
              className="text-red-500 text-sm font-medium min-h-[44px] touch-manipulation"
              style={{ touchAction: 'manipulation' }}
            >
              Clear All
            </button>
          )}
        </div>

        {arrangementItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
            <div className="text-4xl mb-2">💐</div>
            <p>Your arrangement is empty</p>
            <p className="text-sm">Add flowers from the selection below</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            {/* Drag and Drop Canvas */}
            <div
              className="relative bg-gray-50 rounded-lg h-48 mb-4 overflow-hidden"
              {...dragHandlers}
            >
              {arrangementItems.map((item) => (
                <div
                  key={item.id}
                  className="absolute w-8 h-8 rounded-full flex items-center justify-center text-lg cursor-move"
                  style={{
                    backgroundColor: item.color + '20',
                    border: `2px solid ${item.color}`,
                    left: item.position?.x || 0,
                    top: item.position?.y || 0,
                    transform: isDragging ? 'scale(1.1)' : 'scale(1)',
                  }}
                  title={`${item.name} (${item.quantity})`}
                >
                  {getItemIcon(item.type)}
                </div>
              ))}

              {arrangementItems.length > 0 && (
                <div className="absolute bottom-2 left-2 text-xs text-gray-500 bg-white px-2 py-1 rounded">
                  Tap and drag to arrange
                </div>
              )}
            </div>

            {/* Item List */}
            <div className="space-y-2">
              {arrangementItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 rounded-full mr-2"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm touch-manipulation"
                      style={{ touchAction: 'manipulation' }}
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm touch-manipulation"
                      style={{ touchAction: 'manipulation' }}
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeFromArrangement(item.id)}
                      className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm touch-manipulation"
                      style={{ touchAction: 'manipulation' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cost Estimate */}
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-800">
                  Estimated Cost:
                </span>
                <span className="text-lg font-bold text-green-800">
                  ${calculateTotalCost()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Available Items */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">
          Available Flowers & Greenery
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {availableItems.map((item) => (
            <button
              key={item.id}
              onClick={() => addToArrangement(item)}
              disabled={
                arrangementItems.length >=
                (templates.find((t) => t.id === selectedTemplate)?.maxItems ||
                  6)
              }
              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg touch-manipulation active:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ touchAction: 'manipulation' }}
            >
              <div className="flex items-center">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-lg mr-3"
                  style={{ backgroundColor: item.color + '20' }}
                >
                  <span className="text-lg">{getItemIcon(item.type)}</span>
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-gray-500 capitalize">
                    {item.type}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">+</div>
                <div className="text-xs text-gray-500">Add</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Save Arrangement */}
      {arrangementItems.length > 0 && (
        <button
          onClick={saveArrangement}
          className="w-full bg-green-500 text-white py-4 rounded-lg font-medium text-lg min-h-[56px] touch-manipulation active:bg-green-600"
          style={{ touchAction: 'manipulation' }}
        >
          💾 Save Arrangement (${calculateTotalCost()})
        </button>
      )}
    </div>
  );
}
