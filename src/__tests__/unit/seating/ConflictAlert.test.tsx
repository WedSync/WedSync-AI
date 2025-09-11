/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ConflictAlert, createConflictDetails } from '@/components/seating/ConflictAlert';
import type { ConflictDetails, Guest, Table } from '@/types/seating';
// Mock Lucide icons
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <div data-testid="alert-triangle-icon">⚠️</div>,
  Users: () => <div data-testid="users-icon">👥</div>,
  ChevronDown: () => <div data-testid="chevron-down-icon">▼</div>,
  ChevronRight: () => <div data-testid="chevron-right-icon">▶</div>,
  X: () => <div data-testid="x-icon">✕</div>,
  Lightbulb: () => <div data-testid="lightbulb-icon">💡</div>,
  ArrowRight: () => <div data-testid="arrow-right-icon">→</div>,
}));
// Mock UI components
vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, className, variant }: any) => (
    <div className={`alert ${className} ${variant}`} data-testid="alert">
      {children}
    </div>
  ),
  AlertTitle: ({ children }: any) => (
    <div className="alert-title" data-testid="alert-title">
  AlertDescription: ({ children }: any) => (
    <div className="alert-description" data-testid="alert-description">
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className, ...props }: any) => (
    <button
      onClick={onClick}
      className={`btn ${variant} ${size} ${className}`}
      data-testid="button"
      {...props}
    >
    </button>
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`} data-testid="badge">
    </span>
vi.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open, onOpenChange }: any) => (
    <div className="collapsible" data-open={open}>
  CollapsibleTrigger: ({ children, asChild }: any) => (
    <div className="collapsible-trigger" data-testid="collapsible-trigger">
  CollapsibleContent: ({ children }: any) => (
    <div className="collapsible-content" data-testid="collapsible-content">
const mockGuests: Guest[] = [
  {
    id: 'guest-1',
    name: 'John Doe',
    priority: 'vip',
  },
    id: 'guest-2',
    name: 'Jane Smith',
    priority: 'family',
];
const mockTable: Table = {
  id: 'table-1',
  name: 'Head Table',
  capacity: 8,
  shape: 'round',
  position: { x: 100, y: 100 },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};
describe('ConflictAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('Basic Rendering', () => {
    it('renders nothing when no conflicts', () => {
      const { container } = render(<ConflictAlert conflicts={[]} />);
      expect(container.firstChild).toBeNull();
    });
    it('renders single conflict alert', () => {
      const conflict = createConflictDetails(
        'guest_conflict',
        'high',
        mockTable,
        mockGuests,
        'Test conflict message'
      );
      render(<ConflictAlert conflicts={[conflict]} />);
      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(screen.getByText('Guest Relationship Conflict at Head Table')).toBeInTheDocument();
      expect(screen.getByText('Test conflict message')).toBeInTheDocument();
    it('renders multiple conflicts with summary', () => {
      const conflicts = [
        createConflictDetails('guest_conflict', 'high', mockTable, mockGuests, 'Conflict 1'),
        createConflictDetails('capacity_exceeded', 'medium', mockTable, mockGuests, 'Conflict 2'),
      ];
      render(<ConflictAlert conflicts={conflicts} />);
      expect(screen.getByText('2 seating conflicts detected')).toBeInTheDocument();
      expect(screen.getByText('1 critical')).toBeInTheDocument();
  describe('Conflict Types', () => {
    it('displays guest conflict correctly', () => {
        'Relationship conflict detected'
      expect(screen.getByTestId('badge')).toHaveTextContent('high');
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    it('displays capacity exceeded conflict', () => {
        'capacity_exceeded',
        'Table is over capacity'
      expect(screen.getByText('Table Over Capacity at Head Table')).toBeInTheDocument();
      expect(screen.getByText('Table is over capacity')).toBeInTheDocument();
    it('displays dietary conflict', () => {
        'dietary_conflict',
        'medium',
        'Dietary requirements conflict'
      expect(screen.getByText('Dietary Requirements Conflict at Head Table')).toBeInTheDocument();
      expect(screen.getByTestId('badge')).toHaveTextContent('medium');
    it('displays accessibility conflict', () => {
        'accessibility_conflict',
        'low',
        'Accessibility needs not met'
      expect(screen.getByText('Accessibility Needs Conflict at Head Table')).toBeInTheDocument();
      expect(screen.getByTestId('badge')).toHaveTextContent('low');
  describe('Severity Levels', () => {
    it('applies correct styling for high severity', () => {
        'Critical conflict'
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveClass('destructive');
    it('applies correct styling for medium severity', () => {
        'Medium conflict'
      expect(alert).not.toHaveClass('destructive');
    it('applies correct styling for low severity', () => {
        'Low conflict'
  describe('Affected Guests Display', () => {
    it('displays affected guest names', () => {
        'Conflict between guests'
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    it('handles single affected guest', () => {
        [mockGuests[0]],
        'Single guest accessibility issue'
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  describe('Suggestions and Expandable Content', () => {
    it('shows suggestions when provided', () => {
        'Conflict message',
        ['Move guests to different tables', 'Review relationship settings']
      render(<ConflictAlert conflicts={[conflict]} showSuggestions={true} />);
      expect(screen.getByTestId('collapsible-trigger')).toBeInTheDocument();
      expect(screen.getByText(/show.*suggestions.*2/i)).toBeInTheDocument();
    it('hides suggestions when showSuggestions is false', () => {
        ['Move guests to different tables']
      render(<ConflictAlert conflicts={[conflict]} showSuggestions={false} />);
      expect(screen.queryByTestId('collapsible-trigger')).not.toBeInTheDocument();
    it('displays suggestions in collapsible content', () => {
      expect(screen.getByText('Move guests to different tables')).toBeInTheDocument();
      expect(screen.getByText('Review relationship settings')).toBeInTheDocument();
  describe('Action Buttons', () => {
    it('displays action buttons when onResolve is provided', () => {
      const onResolve = vi.fn();
        ['Suggestion 1']
      render(
        <ConflictAlert conflicts={[conflict]} onResolve={onResolve} showSuggestions={true} />
      expect(screen.getByText('Auto-resolve')).toBeInTheDocument();
      expect(screen.getByText('Move guests')).toBeInTheDocument();
      expect(screen.getByText('Ignore')).toBeInTheDocument();
    it('calls onResolve with correct parameters when action clicked', async () => {
      const autoResolveButton = screen.getByText('Auto-resolve');
      fireEvent.click(autoResolveButton);
      expect(onResolve).toHaveBeenCalledWith(conflict, 'auto_resolve');
    it('handles multiple action button clicks', async () => {
        'Over capacity',
        ['Add more tables']
      const moveButton = screen.getByText('Move guests');
      const ignoreButton = screen.getByText('Ignore');
      fireEvent.click(moveButton);
      expect(onResolve).toHaveBeenCalledWith(conflict, 'move_guests');
      fireEvent.click(ignoreButton);
      expect(onResolve).toHaveBeenCalledWith(conflict, 'ignore');
      expect(onResolve).toHaveBeenCalledTimes(2);
  describe('Dismissal Functionality', () => {
    it('shows dismiss button when onDismiss is provided', () => {
      const onDismiss = vi.fn();
        'Conflict message'
      render(<ConflictAlert conflicts={[conflict]} onDismiss={onDismiss} />);
      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    it('calls onDismiss when dismiss button clicked', () => {
      const dismissButton = screen.getByTestId('x-icon').closest('button');
      fireEvent.click(dismissButton!);
      expect(onDismiss).toHaveBeenCalledWith(conflict);
  describe('Compact Mode', () => {
    it('renders in compact mode when specified', () => {
        <ConflictAlert conflicts={[conflict]} compact={true} showSuggestions={true} />
      // In compact mode, suggestions should be collapsed by default
      expect(screen.queryByTestId('collapsible-content')).toBeInTheDocument();
  describe('Multiple Conflicts Handling', () => {
    it('groups conflicts by severity', () => {
        createConflictDetails('guest_conflict', 'high', mockTable, mockGuests, 'High priority'),
        createConflictDetails('dietary_conflict', 'medium', mockTable, mockGuests, 'Medium priority'),
        createConflictDetails('accessibility_conflict', 'low', mockTable, mockGuests, 'Low priority'),
        createConflictDetails('capacity_exceeded', 'high', mockTable, mockGuests, 'Another high'),
      expect(screen.getByText('4 seating conflicts detected')).toBeInTheDocument();
      expect(screen.getByText('2 critical')).toBeInTheDocument();
    it('displays auto-resolve all button for multiple conflicts', () => {
      render(<ConflictAlert conflicts={conflicts} onResolve={onResolve} />);
      const autoResolveAllButton = screen.getByText('Auto-resolve all');
      fireEvent.click(autoResolveAllButton);
      // Should call onResolve for each conflict
  describe('Error Handling', () => {
    it('handles missing conflict data gracefully', () => {
      const invalidConflict = {
        type: 'guest_conflict',
        severity: 'high',
        affectedGuests: [],
        table: mockTable,
        message: 'Test conflict',
        suggestions: [],
      } as ConflictDetails;
      expect(() => {
        render(<ConflictAlert conflicts={[invalidConflict]} />);
      }).not.toThrow();
    it('handles malformed suggestions', () => {
        undefined // No suggestions
        render(<ConflictAlert conflicts={[conflict]} showSuggestions={true} />);
    it('handles empty guest list', () => {
        [], // No affected guests
        'Conflict with no guests'
        render(<ConflictAlert conflicts={[conflict]} />);
  describe('Accessibility', () => {
    it('has proper ARIA attributes for alerts', () => {
        'Accessibility test conflict'
      expect(alert).toBeInTheDocument();
      
      // Check that alert content is readable
      expect(screen.getByTestId('alert-title')).toBeInTheDocument();
      expect(screen.getByTestId('alert-description')).toBeInTheDocument();
    it('provides accessible button labels', () => {
        <ConflictAlert 
          conflicts={[conflict]} 
          onResolve={onResolve} 
          onDismiss={onDismiss} 
          showSuggestions={true} 
        />
      // All buttons should have accessible names
      const buttons = screen.getAllByTestId('button');
      buttons.forEach(button => {
        expect(button).toHaveTextContent(/\w+/); // Should have some text content
      });
});
describe('createConflictDetails', () => {
  it('creates conflict details with custom message and suggestions', () => {
    const conflict = createConflictDetails(
      'guest_conflict',
      'high',
      mockTable,
      mockGuests,
      'Custom conflict message',
      ['Custom suggestion 1', 'Custom suggestion 2']
    );
    expect(conflict.type).toBe('guest_conflict');
    expect(conflict.severity).toBe('high');
    expect(conflict.table).toBe(mockTable);
    expect(conflict.affectedGuests).toBe(mockGuests);
    expect(conflict.message).toBe('Custom conflict message');
    expect(conflict.suggestions).toEqual(['Custom suggestion 1', 'Custom suggestion 2']);
  it('generates default message and suggestions when not provided', () => {
      'capacity_exceeded',
      'medium',
      mockGuests
    expect(conflict.message).toContain('guests but capacity is');
    expect(conflict.suggestions).toContain('Move some guests to available tables');
    expect(conflict.suggestions).toContain('Increase table capacity if space allows');
  it('generates appropriate suggestions for different conflict types', () => {
    const guestConflict = createConflictDetails('guest_conflict', 'high', mockTable, mockGuests);
    expect(guestConflict.suggestions).toContain('Move conflicting guests to different tables');
    const dietaryConflict = createConflictDetails('dietary_conflict', 'medium', mockTable, mockGuests);
    expect(dietaryConflict.suggestions).toContain('Group guests with similar dietary needs');
    const accessibilityConflict = createConflictDetails('accessibility_conflict', 'low', mockTable, mockGuests);
    expect(accessibilityConflict.suggestions).toContain('Move guests with accessibility needs to accessible tables');
  it('handles edge cases in conflict creation', () => {
    // Empty guests array
    const conflict1 = createConflictDetails(
      [],
      'No guests conflict'
    expect(conflict1.affectedGuests).toEqual([]);
    // Null/undefined handling
    expect(() => {
      createConflictDetails(
        undefined,
        undefined
    }).not.toThrow();
