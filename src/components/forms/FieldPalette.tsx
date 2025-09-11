'use client';

import { useDraggable } from '@dnd-kit/core';
import { FormFieldType } from '@/types/forms';
import { Heading } from '@/components/ui/heading';
import {
  Bars3Icon,
  EnvelopeIcon,
  PhoneIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  RadioIcon,
  CheckIcon,
  CalendarIcon,
  ClockIcon,
  PaperClipIcon,
  HashtagIcon,
  ChatBubbleBottomCenterTextIcon,
  MinusIcon,
  PhotoIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

const FIELD_CATEGORIES = [
  {
    name: 'Basic Fields',
    fields: [
      { type: 'text' as FormFieldType, label: 'Text Input', icon: Bars3Icon },
      { type: 'email' as FormFieldType, label: 'Email', icon: EnvelopeIcon },
      { type: 'tel' as FormFieldType, label: 'Phone', icon: PhoneIcon },
      {
        type: 'textarea' as FormFieldType,
        label: 'Text Area',
        icon: DocumentTextIcon,
      },
      { type: 'number' as FormFieldType, label: 'Number', icon: HashtagIcon },
    ],
  },
  {
    name: 'Choice Fields',
    fields: [
      {
        type: 'select' as FormFieldType,
        label: 'Dropdown',
        icon: ChevronDownIcon,
      },
      {
        type: 'radio' as FormFieldType,
        label: 'Radio Buttons',
        icon: RadioIcon,
      },
      {
        type: 'checkbox' as FormFieldType,
        label: 'Checkboxes',
        icon: CheckIcon,
      },
    ],
  },
  {
    name: 'Date & Time',
    fields: [
      {
        type: 'date' as FormFieldType,
        label: 'Date Picker',
        icon: CalendarIcon,
      },
      { type: 'time' as FormFieldType, label: 'Time Picker', icon: ClockIcon },
    ],
  },
  {
    name: 'Special Fields',
    fields: [
      {
        type: 'file' as FormFieldType,
        label: 'File Upload',
        icon: PaperClipIcon,
      },
      {
        type: 'signature' as FormFieldType,
        label: 'Signature',
        icon: PencilSquareIcon,
      },
      { type: 'image' as FormFieldType, label: 'Image', icon: PhotoIcon },
    ],
  },
  {
    name: 'Layout',
    fields: [
      {
        type: 'heading' as FormFieldType,
        label: 'Heading',
        icon: ChatBubbleBottomCenterTextIcon,
      },
      {
        type: 'paragraph' as FormFieldType,
        label: 'Paragraph',
        icon: DocumentTextIcon,
      },
      { type: 'divider' as FormFieldType, label: 'Divider', icon: MinusIcon },
    ],
  },
];

function DraggableField({
  type,
  label,
  icon: Icon,
}: {
  type: FormFieldType;
  label: string;
  icon: any;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `palette-${type}`,
      data: {
        source: 'palette',
        fieldType: type,
      },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg
        cursor-move hover:border-purple-300 hover:shadow-sm transition-all
        ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-purple-500' : ''}
      `}
    >
      <Icon className="h-5 w-5 text-gray-500" />
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  );
}

export function FieldPalette() {
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Field Types</h3>
      <p className="text-sm text-gray-500 mb-6">
        Drag fields to add them to your form
      </p>

      <div className="space-y-6">
        {FIELD_CATEGORIES.map((category) => (
          <div key={category.name}>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {category.name}
            </h4>
            <div className="space-y-2">
              {category.fields.map((field) => (
                <DraggableField
                  key={field.type}
                  type={field.type}
                  label={field.label}
                  icon={field.icon}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
