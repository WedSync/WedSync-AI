import React from 'react';

interface OptimizedFormCanvasProps {
  fields: any[];
  onFieldUpdate?: (field: any) => void;
}

export function OptimizedFormCanvas({
  fields,
  onFieldUpdate,
}: OptimizedFormCanvasProps) {
  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-4">Form Canvas</h3>
      {fields.length === 0 ? (
        <p className="text-gray-500">Drag fields here to build your form</p>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={index} className="p-3 border rounded">
              {field.label || field.type}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { OptimizedFormCanvas as FormCanvas };
