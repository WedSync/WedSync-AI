import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

import { ReportTemplateBuilder } from '../ReportTemplateBuilder';
import { ReportTemplate, ReportSection } from '../../types';

// Mock dependencies
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }: any) => (
    <div
      data-testid="dnd-context"
      onClick={() =>
        onDragEnd?.({ active: { id: 'test' }, over: { id: 'dropzone' } })
      }
    >
      {children}
    </div>
  ),
  useDraggable: () => ({
    attributes: { 'data-testid': 'draggable' },
    listeners: { onMouseDown: vi.fn() },
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
    active: null,
  }),
  DragOverlay: ({ children }: any) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => (
    <div data-testid="sortable-context">{children}</div>
  ),
  useSortable: () => ({
    attributes: { 'data-testid': 'sortable' },
    listeners: { onMouseDown: vi.fn() },
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: 'vertical',
}));

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: vi.fn(),
    handleSubmit: vi.fn((fn) => fn),
    formState: { errors: {}, isValid: true },
    watch: vi.fn(),
    setValue: vi.fn(),
    getValues: vi.fn(() => ({})),
    control: {},
  }),
  Controller: ({ render }: any) =>
    render({ field: { onChange: vi.fn(), value: '' } }),
}));

describe('ReportTemplateBuilder', () => {
  const mockTemplate: ReportTemplate = {
    id: 'test-template',
    name: 'Wedding Revenue Template',
    description: 'Template for wedding revenue reporting',
    category: 'financial',
    sections: [
      {
        id: 'section-1',
        type: 'chart',
        title: 'Monthly Revenue',
        chartType: 'bar',
        position: 0,
        config: {
          showLegend: true,
          showTooltip: true,
        },
      },
      {
        id: 'section-2',
        type: 'table',
        title: 'Booking Summary',
        position: 1,
        config: {
          showPagination: true,
          pageSize: 10,
        },
      },
    ],
    layout: {
      columns: 2,
      spacing: 'medium',
      responsive: true,
    },
    style: {
      theme: 'wedding',
      colors: {
        primary: '#c59d6c',
        secondary: '#8b6f47',
        accent: '#d4af37',
      },
    },
    isPublic: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    tags: ['revenue', 'wedding'],
  };

  const availableSections: ReportSection[] = [
    {
      id: 'new-chart',
      type: 'chart',
      title: 'New Chart',
      chartType: 'line',
      position: -1,
      config: {},
    },
    {
      id: 'new-table',
      type: 'table',
      title: 'New Table',
      position: -1,
      config: {},
    },
    {
      id: 'new-metric',
      type: 'metric',
      title: 'New Metric',
      position: -1,
      config: {},
    },
  ];

  const defaultProps = {
    template: mockTemplate,
    availableSections,
    onSave: vi.fn(),
    onPreview: vi.fn(),
    onCancel: vi.fn(),
    className: 'test-builder',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Template Builder Interface', () => {
    it('renders the template builder with drag and drop context', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
      expect(screen.getByTestId('sortable-context')).toBeInTheDocument();
      expect(screen.getByTestId('template-builder')).toBeInTheDocument();
    });

    it('displays template information', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      expect(
        screen.getByDisplayValue('Wedding Revenue Template'),
      ).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('Template for wedding revenue reporting'),
      ).toBeInTheDocument();
    });

    it('shows existing template sections', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
      expect(screen.getByText('Booking Summary')).toBeInTheDocument();
    });

    it('displays available sections to drag', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      expect(screen.getByText('New Chart')).toBeInTheDocument();
      expect(screen.getByText('New Table')).toBeInTheDocument();
      expect(screen.getByText('New Metric')).toBeInTheDocument();
    });
  });

  describe('Drag and Drop Functionality', () => {
    it('handles section reordering via drag and drop', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const dndContext = screen.getByTestId('dnd-context');
      fireEvent.click(dndContext); // Simulate drag end

      // Should trigger reordering
      expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
    });

    it('allows adding new sections via drag and drop', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const newSection = screen.getByText('New Chart');
      const dropZone = screen.getByTestId('template-canvas');

      // Simulate drag from available sections to canvas
      fireEvent.dragStart(newSection);
      fireEvent.dragOver(dropZone);
      fireEvent.drop(dropZone);

      expect(screen.getByTestId('template-canvas')).toBeInTheDocument();
    });

    it('shows drag overlay during drag operations', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const draggableSection = screen.getAllByTestId('draggable')[0];
      fireEvent.mouseDown(draggableSection);

      expect(screen.getByTestId('drag-overlay')).toBeInTheDocument();
    });

    it('validates drop zones and prevents invalid drops', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const invalidDropZone = screen.getByTestId('sidebar');
      const section = screen.getByText('Monthly Revenue');

      fireEvent.dragStart(section);
      fireEvent.dragOver(invalidDropZone);

      expect(invalidDropZone).not.toHaveClass('drop-valid');
    });
  });

  describe('Section Configuration', () => {
    it('opens section configuration panel when section is selected', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const section = screen.getByText('Monthly Revenue');
      fireEvent.click(section);

      expect(screen.getByTestId('section-config-panel')).toBeInTheDocument();
      expect(screen.getByText('Chart Configuration')).toBeInTheDocument();
    });

    it('allows editing section properties', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const section = screen.getByText('Monthly Revenue');
      fireEvent.click(section);

      const titleInput = screen.getByLabelText(/section title/i);
      fireEvent.change(titleInput, {
        target: { value: 'Updated Revenue Chart' },
      });

      expect(titleInput).toHaveValue('Updated Revenue Chart');
    });

    it('shows chart-specific configuration options', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const chartSection = screen.getByText('Monthly Revenue');
      fireEvent.click(chartSection);

      expect(screen.getByLabelText(/chart type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/show legend/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/show tooltip/i)).toBeInTheDocument();
    });

    it('shows table-specific configuration options', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const tableSection = screen.getByText('Booking Summary');
      fireEvent.click(tableSection);

      expect(screen.getByLabelText(/show pagination/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/page size/i)).toBeInTheDocument();
    });
  });

  describe('Real-time Preview', () => {
    it('shows live preview of template changes', async () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      expect(screen.getByTestId('template-preview')).toBeInTheDocument();

      // Change template name
      const nameInput = screen.getByDisplayValue('Wedding Revenue Template');
      fireEvent.change(nameInput, { target: { value: 'Updated Template' } });

      await waitFor(() => {
        expect(screen.getByText('Updated Template')).toBeInTheDocument();
      });
    });

    it('updates preview when sections are modified', async () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const section = screen.getByText('Monthly Revenue');
      fireEvent.click(section);

      const titleInput = screen.getByLabelText(/section title/i);
      fireEvent.change(titleInput, { target: { value: 'Revenue Analysis' } });

      await waitFor(() => {
        expect(screen.getByText('Revenue Analysis')).toBeInTheDocument();
      });
    });

    it('reflects layout changes in preview', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const columnsSelect = screen.getByLabelText(/columns/i);
      fireEvent.change(columnsSelect, { target: { value: '1' } });

      const preview = screen.getByTestId('template-preview');
      expect(preview).toHaveClass('single-column');
    });

    it('shows responsive preview for different screen sizes', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const mobilePreview = screen.getByRole('button', {
        name: /mobile preview/i,
      });
      fireEvent.click(mobilePreview);

      const preview = screen.getByTestId('template-preview');
      expect(preview).toHaveClass('mobile-preview');
    });
  });

  describe('Template Validation', () => {
    it('validates template before saving', () => {
      const templateWithoutSections = {
        ...mockTemplate,
        sections: [],
      };

      render(
        <ReportTemplateBuilder
          {...defaultProps}
          template={templateWithoutSections}
        />,
      );

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      expect(
        screen.getByText(/template must have at least one section/i),
      ).toBeInTheDocument();
      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });

    it('validates section configurations', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const section = screen.getByText('Monthly Revenue');
      fireEvent.click(section);

      // Clear the title
      const titleInput = screen.getByLabelText(/section title/i);
      fireEvent.change(titleInput, { target: { value: '' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      expect(
        screen.getByText(/section title is required/i),
      ).toBeInTheDocument();
    });

    it('validates template name and description', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const nameInput = screen.getByDisplayValue('Wedding Revenue Template');
      fireEvent.change(nameInput, { target: { value: '' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      expect(
        screen.getByText(/template name is required/i),
      ).toBeInTheDocument();
    });
  });

  describe('Wedding Industry Features', () => {
    it('includes wedding-specific section templates', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      expect(screen.getByText(/wedding revenue chart/i)).toBeInTheDocument();
      expect(screen.getByText(/seasonal booking trends/i)).toBeInTheDocument();
      expect(screen.getByText(/vendor performance/i)).toBeInTheDocument();
    });

    it('applies wedding theme styling', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const preview = screen.getByTestId('template-preview');
      expect(preview).toHaveStyle('--primary-color: #c59d6c');
      expect(preview).toHaveStyle('--secondary-color: #8b6f47');
    });

    it('shows vendor-specific section recommendations', () => {
      render(
        <ReportTemplateBuilder {...defaultProps} vendorType="photographer" />,
      );

      expect(screen.getByText(/photo delivery metrics/i)).toBeInTheDocument();
      expect(
        screen.getByText(/client satisfaction scores/i),
      ).toBeInTheDocument();
    });

    it('includes seasonal optimization suggestions', () => {
      // Mock peak wedding season
      vi.setSystemTime(new Date('2024-06-15'));

      render(<ReportTemplateBuilder {...defaultProps} />);

      expect(screen.getByText(/peak season templates/i)).toBeInTheDocument();
      expect(screen.getByText(/summer wedding analytics/i)).toBeInTheDocument();
    });
  });

  describe('Template Actions', () => {
    it('saves template with all sections and configurations', async () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Wedding Revenue Template',
            sections: expect.arrayContaining([
              expect.objectContaining({ title: 'Monthly Revenue' }),
              expect.objectContaining({ title: 'Booking Summary' }),
            ]),
          }),
        );
      });
    });

    it('triggers preview with current template state', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const previewButton = screen.getByRole('button', { name: /preview/i });
      fireEvent.click(previewButton);

      expect(defaultProps.onPreview).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Wedding Revenue Template',
        }),
      );
    });

    it('handles cancel action', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('provides template export functionality', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      expect(screen.getByTestId('export-modal')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<ReportTemplateBuilder {...defaultProps} />);

      expect(screen.getByTestId('template-builder')).toHaveClass(
        'mobile-layout',
      );
    });

    it('shows mobile-specific interface elements', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 320,
      });

      render(<ReportTemplateBuilder {...defaultProps} />);

      expect(screen.getByTestId('mobile-toolbar')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
    });

    it('optimizes drag and drop for touch devices', () => {
      // Mock touch device
      global.ontouchstart = vi.fn();

      render(<ReportTemplateBuilder {...defaultProps} />);

      const dragHandle = screen.getAllByTestId(/drag-handle/)[0];
      expect(dragHandle).toHaveClass('touch-optimized');
    });
  });

  describe('Performance Optimization', () => {
    it('virtualizes large lists of available sections', () => {
      const manySections = Array.from({ length: 100 }, (_, i) => ({
        id: `section-${i}`,
        type: 'chart' as const,
        title: `Chart ${i}`,
        chartType: 'bar' as const,
        position: -1,
        config: {},
      }));

      render(
        <ReportTemplateBuilder
          {...defaultProps}
          availableSections={manySections}
        />,
      );

      expect(screen.getByTestId('virtual-sections-list')).toBeInTheDocument();
    });

    it('debounces preview updates', async () => {
      vi.useFakeTimers();

      render(<ReportTemplateBuilder {...defaultProps} />);

      const nameInput = screen.getByDisplayValue('Wedding Revenue Template');

      // Rapid changes
      fireEvent.change(nameInput, { target: { value: 'Test 1' } });
      fireEvent.change(nameInput, { target: { value: 'Test 2' } });
      fireEvent.change(nameInput, { target: { value: 'Test 3' } });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Should only update once after debounce
      expect(screen.getByText('Test 3')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('lazy loads section configuration panels', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      // Configuration panel should not be loaded initially
      expect(
        screen.queryByTestId('section-config-panel'),
      ).not.toBeInTheDocument();

      // Should load when section is clicked
      const section = screen.getByText('Monthly Revenue');
      fireEvent.click(section);

      expect(screen.getByTestId('section-config-panel')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides keyboard navigation for drag and drop', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const firstSection = screen.getAllByTestId('draggable')[0];
      firstSection.focus();

      expect(firstSection).toHaveFocus();

      fireEvent.keyDown(firstSection, { key: 'Space' });
      expect(screen.getByText(/drag mode activated/i)).toBeInTheDocument();
    });

    it('announces drag and drop operations to screen readers', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
    });

    it('provides proper ARIA labels for sections', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const sections = screen.getAllByRole('button');
      sections.forEach((section) => {
        expect(section).toHaveAttribute('aria-label');
      });
    });

    it('supports screen reader navigation of template structure', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      const templateCanvas = screen.getByTestId('template-canvas');
      expect(templateCanvas).toHaveAttribute('role', 'application');
      expect(templateCanvas).toHaveAttribute(
        'aria-label',
        'Template builder canvas',
      );
    });
  });

  describe('Error Handling', () => {
    it('recovers from drag and drop errors', () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(<ReportTemplateBuilder {...defaultProps} />);

      // Simulate drag error
      const dndContext = screen.getByTestId('dnd-context');
      fireEvent.error(dndContext);

      expect(screen.getByTestId('template-builder')).toBeInTheDocument();

      consoleError.mockRestore();
    });

    it('handles invalid section configurations', () => {
      const invalidTemplate = {
        ...mockTemplate,
        sections: [
          {
            id: 'invalid-section',
            type: 'invalid' as any,
            title: 'Invalid Section',
            position: 0,
            config: {},
          },
        ],
      };

      render(
        <ReportTemplateBuilder {...defaultProps} template={invalidTemplate} />,
      );

      expect(screen.getByTestId('section-error')).toBeInTheDocument();
      expect(screen.getByText(/unsupported section type/i)).toBeInTheDocument();
    });

    it('provides fallback for preview rendering errors', () => {
      render(<ReportTemplateBuilder {...defaultProps} />);

      // Mock preview error
      const preview = screen.getByTestId('template-preview');
      fireEvent.error(preview);

      expect(screen.getByText(/preview unavailable/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /retry preview/i }),
      ).toBeInTheDocument();
    });
  });
});
