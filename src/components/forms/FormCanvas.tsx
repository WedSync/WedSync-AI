'use client';

import { FormSection, FormField, FormRow } from '@/types/forms';
import { useDroppable, DragOverlay } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  TrashIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { nanoid } from 'nanoid';
import { useState, useRef, useEffect } from 'react';

interface FormCanvasProps {
  sections: FormSection[];
  setSections: React.Dispatch<React.SetStateAction<FormSection[]>>;
  onFieldSelect: (field: FormField | null) => void;
  selectedFieldId?: string;
}

function SortableField({
  field,
  sectionId,
  isSelected,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  field: FormField;
  sectionId: string;
  isSelected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field.id,
    data: {
      type: 'field',
      field,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const renderFieldPreview = () => {
    switch (field.type) {
      case 'heading':
        return <h3 className="text-lg font-semibold">{field.label}</h3>;
      case 'paragraph':
        return <p className="text-gray-600">{field.label}</p>;
      case 'divider':
        return <hr className="border-gray-300" />;
      case 'text':
      case 'email':
      case 'tel':
      case 'number':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.validation?.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <input
              type={field.type}
              placeholder={field.placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled
            />
            {field.helperText && (
              <p className="mt-1 text-sm text-gray-500">{field.helperText}</p>
            )}
          </div>
        );
      case 'textarea':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.validation?.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <textarea
              placeholder={field.placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              disabled
            />
            {field.helperText && (
              <p className="mt-1 text-sm text-gray-500">{field.helperText}</p>
            )}
          </div>
        );
      case 'select':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.validation?.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled
            >
              <option>Choose an option...</option>
              {field.options?.map((opt) => (
                <option key={opt.id} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );
      case 'radio':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.validation?.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <div className="space-y-2">
              {field.options?.map((opt) => (
                <label key={opt.id} className="flex items-center">
                  <input
                    type="radio"
                    name={field.id}
                    value={opt.value}
                    disabled
                    className="mr-2"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        );
      case 'checkbox':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.validation?.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <div className="space-y-2">
              {field.options?.map((opt) => (
                <label key={opt.id} className="flex items-center">
                  <input
                    type="checkbox"
                    value={opt.value}
                    disabled
                    className="mr-2"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        );
      case 'date':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.validation?.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled
            />
          </div>
        );
      case 'file':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.validation?.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
              <p className="text-sm text-gray-500">
                Click to upload or drag and drop
              </p>
              {field.helperText && (
                <p className="mt-1 text-xs text-gray-400">{field.helperText}</p>
              )}
            </div>
          </div>
        );
      case 'signature':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.validation?.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <div className="border border-gray-300 rounded-md h-24 bg-gray-50 flex items-center justify-center">
              <p className="text-sm text-gray-400">Sign here</p>
            </div>
          </div>
        );
      default:
        return <div>Unsupported field type: {field.type}</div>;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative group p-4 bg-white border-2 rounded-lg transition-all
        ${isDragging ? 'opacity-50' : ''}
        ${isSelected ? 'border-purple-500 shadow-md' : 'border-gray-200 hover:border-gray-300'}
      `}
      onClick={onSelect}
    >
      {/* Field Actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="p-1 hover:bg-gray-100 rounded"
            title="Edit"
          >
            <PencilIcon className="h-4 w-4 text-gray-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1 hover:bg-gray-100 rounded"
            title="Duplicate"
          >
            <DocumentDuplicateIcon className="h-4 w-4 text-gray-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 hover:bg-gray-100 rounded"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4 text-red-500" />
          </button>
          <div
            {...attributes}
            {...listeners}
            className="p-1 hover:bg-gray-100 rounded cursor-move"
            title="Drag to reorder"
          >
            <svg
              className="h-4 w-4 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8h16M4 16h16"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Field Preview */}
      {renderFieldPreview()}
    </div>
  );
}

function DroppableSection({
  section,
  onFieldSelect,
  selectedFieldId,
  onFieldDuplicate,
  onFieldDelete,
}: {
  section: FormSection;
  onFieldSelect: (field: FormField | null) => void;
  selectedFieldId?: string;
  onFieldDuplicate: (field: FormField) => void;
  onFieldDelete: (fieldId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-${section.id}`,
    data: {
      type: 'dropzone',
      sectionId: section.id,
      fields: section.fields,
    },
  });

  return (
    <div className="mb-8">
      <div className="mb-4">
        <input
          type="text"
          defaultValue={section.title}
          className="text-xl font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-purple-500 rounded px-2 -ml-2"
          readOnly
        />
        {section.description && (
          <p className="text-gray-600 mt-1 ml-2">{section.description}</p>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={`
          min-h-[200px] p-4 border-2 border-dashed rounded-lg transition-colors
          ${isOver ? 'border-purple-400 bg-purple-50' : 'border-gray-300 bg-gray-50'}
        `}
      >
        {section.fields.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">
              Drag fields here to add them to this section
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {section.fields.map((field) => (
              <SortableField
                key={field.id}
                field={field}
                sectionId={section.id}
                isSelected={selectedFieldId === field.id}
                onSelect={() => onFieldSelect(field)}
                onDuplicate={() => onFieldDuplicate(field)}
                onDelete={() => onFieldDelete(field.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Grid-based canvas for multi-column layout
function GridCanvas({
  rows,
  setRows,
  onFieldSelect,
  selectedFieldId,
  onFieldDuplicate,
  onFieldDelete,
}: {
  rows: FormRow[];
  setRows: React.Dispatch<React.SetStateAction<FormRow[]>>;
  onFieldSelect: (field: FormField | null) => void;
  selectedFieldId?: string;
  onFieldDuplicate: (field: FormField) => void;
  onFieldDelete: (fieldId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'grid-canvas',
    data: {
      type: 'grid',
      rows,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[200px] p-4 border-2 border-dashed rounded-lg transition-colors
        ${isOver ? 'border-purple-400 bg-purple-50' : 'border-gray-300 bg-gray-50'}
      `}
    >
      {rows.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">
            Drag fields here to start building your form
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Drop fields side-by-side to create columns (up to 4)
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <div
              key={row.id}
              className={`grid gap-4`}
              style={{
                gridTemplateColumns: `repeat(${row.fields.length}, 1fr)`,
              }}
            >
              {row.fields.map((field) => (
                <SortableField
                  key={field.id}
                  field={field}
                  sectionId="grid"
                  isSelected={selectedFieldId === field.id}
                  onSelect={() => onFieldSelect(field)}
                  onDuplicate={() => onFieldDuplicate(field)}
                  onDelete={() => onFieldDelete(field.id)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FormCanvas({
  sections,
  setSections,
  onFieldSelect,
  selectedFieldId,
  rows,
  setRows,
}: FormCanvasProps) {
  // Use grid-based layout if rows are provided
  const [useGrid, setUseGrid] = useState(true);
  const [gridRows, setGridRows] = useState<FormRow[]>(rows || []);

  const handleFieldDuplicate = (field: FormField) => {
    if (useGrid) {
      // Duplicate in grid
      const newField = {
        ...field,
        id: nanoid(),
        label: `${field.label} (Copy)`,
      };

      setGridRows((prev) => {
        const newRows = [...prev];
        for (const row of newRows) {
          const fieldIndex = row.fields.findIndex((f) => f.id === field.id);
          if (fieldIndex !== -1) {
            // Add to same row if space, otherwise create new row
            if (row.fields.length < 4) {
              row.fields.splice(fieldIndex + 1, 0, newField);
            } else {
              const newRow: FormRow = {
                id: nanoid(),
                fields: [newField],
              };
              const rowIndex = newRows.indexOf(row);
              newRows.splice(rowIndex + 1, 0, newRow);
            }
            break;
          }
        }
        return newRows;
      });
    } else {
      // Duplicate in sections
      const newField = {
        ...field,
        id: nanoid(),
        label: `${field.label} (Copy)`,
      };

      setSections((prev) =>
        prev.map((section) => {
          const fieldIndex = section.fields.findIndex((f) => f.id === field.id);
          if (fieldIndex !== -1) {
            const newFields = [...section.fields];
            newFields.splice(fieldIndex + 1, 0, newField);
            return {
              ...section,
              fields: newFields.map((f, i) => ({ ...f, order: i })),
            };
          }
          return section;
        }),
      );
    }
  };

  const handleFieldDelete = (fieldId: string) => {
    if (useGrid) {
      setGridRows((prev) => {
        const newRows = prev
          .map((row) => ({
            ...row,
            fields: row.fields.filter((f) => f.id !== fieldId),
          }))
          .filter((row) => row.fields.length > 0);
        return newRows;
      });
    } else {
      setSections((prev) =>
        prev.map((section) => ({
          ...section,
          fields: section.fields
            .filter((f) => f.id !== fieldId)
            .map((f, i) => ({ ...f, order: i })),
        })),
      );
    }
    onFieldSelect(null);
  };

  const addSection = () => {
    const newSection: FormSection = {
      id: nanoid(),
      title: `Section ${sections.length + 1}`,
      description: '',
      fields: [],
      order: sections.length,
    };
    setSections((prev) => [...prev, newSection]);
  };

  // Update parent state when grid rows change
  useEffect(() => {
    if (setRows) {
      setRows(gridRows);
    }
  }, [gridRows, setRows]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Toggle between grid and section layout */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setUseGrid(!useGrid)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Squares2X2Icon className="h-4 w-4" />
          {useGrid ? 'Switch to Sections' : 'Switch to Grid'}
        </button>
      </div>

      {useGrid ? (
        <GridCanvas
          rows={gridRows}
          setRows={setGridRows}
          onFieldSelect={onFieldSelect}
          selectedFieldId={selectedFieldId}
          onFieldDuplicate={handleFieldDuplicate}
          onFieldDelete={handleFieldDelete}
        />
      ) : (
        <>
          {sections.map((section) => (
            <DroppableSection
              key={section.id}
              section={section}
              onFieldSelect={onFieldSelect}
              selectedFieldId={selectedFieldId}
              onFieldDuplicate={handleFieldDuplicate}
              onFieldDelete={handleFieldDelete}
            />
          ))}

          <button
            onClick={addSection}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
          >
            + Add Section
          </button>
        </>
      )}
    </div>
  );
}
