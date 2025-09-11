'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Enter,
  Tab,
  Escape,
  Space,
  Accessibility,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Type,
  Contrast,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Accessibility context and hooks
interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReaderMode: boolean;
  soundEnabled: boolean;
  keyboardNavigation: boolean;
}

interface AccessibleSeatingManagerProps {
  guests: any[];
  tables: any[];
  onUpdateArrangement: (tables: any[], guests: any[]) => void;
  className?: string;
}

export function AccessibleSeatingManager({
  guests,
  tables,
  onUpdateArrangement,
  className,
}: AccessibleSeatingManagerProps) {
  const [accessibilitySettings, setAccessibilitySettings] =
    useState<AccessibilitySettings>({
      reducedMotion: false,
      highContrast: false,
      largeText: false,
      screenReaderMode: false,
      soundEnabled: true,
      keyboardNavigation: true,
    });

  const [focusedElement, setFocusedElement] = useState<string | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<string[]>([]);

  const liveRegionRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const skipLinksRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!accessibilitySettings.keyboardNavigation) return;

      const { key, ctrlKey, metaKey, shiftKey, altKey } = event;

      // Skip links navigation
      if (key === 'Tab' && !shiftKey && event.target === document.body) {
        if (skipLinksRef.current) {
          event.preventDefault();
          const firstSkipLink = skipLinksRef.current.querySelector('a');
          firstSkipLink?.focus();
        }
      }

      // Global shortcuts
      if (ctrlKey || metaKey) {
        switch (key) {
          case 'z':
            if (!shiftKey) {
              event.preventDefault();
              announceAction('Undo last action');
              // Call undo function
            } else {
              event.preventDefault();
              announceAction('Redo last action');
              // Call redo function
            }
            break;
          case 'o':
            event.preventDefault();
            announceAction('Starting seating optimization');
            // Call optimize function
            break;
          case 'f':
            event.preventDefault();
            announceAction('Opening search');
            // Focus search input
            break;
        }
        return;
      }

      // Context-specific navigation
      if (focusedElement === 'guest-list') {
        handleGuestListNavigation(key, shiftKey);
      } else if (focusedElement === 'table-layout') {
        handleTableLayoutNavigation(key, shiftKey);
      } else if (focusedElement === 'conflict-panel') {
        handleConflictPanelNavigation(key, shiftKey);
      }
    },
    [accessibilitySettings.keyboardNavigation, focusedElement],
  );

  // Guest list keyboard navigation
  const handleGuestListNavigation = useCallback(
    (key: string, shiftKey: boolean) => {
      const unassignedGuests = guests.filter((g) => !g.tableId);
      const currentIndex = selectedGuest
        ? unassignedGuests.findIndex((g) => g.id === selectedGuest)
        : -1;

      switch (key) {
        case 'ArrowUp':
          const prevIndex = Math.max(0, currentIndex - 1);
          setSelectedGuest(unassignedGuests[prevIndex]?.id || null);
          announceGuestSelection(unassignedGuests[prevIndex]);
          break;
        case 'ArrowDown':
          const nextIndex = Math.min(
            unassignedGuests.length - 1,
            currentIndex + 1,
          );
          setSelectedGuest(unassignedGuests[nextIndex]?.id || null);
          announceGuestSelection(unassignedGuests[nextIndex]);
          break;
        case 'Enter':
        case ' ':
          if (selectedGuest && selectedTable) {
            assignGuestToTable(selectedGuest, selectedTable);
          }
          break;
        case 'Tab':
          if (!shiftKey) {
            setFocusedElement('table-layout');
            announceAction(
              'Moved to table layout. Use arrow keys to navigate tables.',
            );
          }
          break;
      }
    },
    [selectedGuest, selectedTable, guests],
  );

  // Table layout keyboard navigation
  const handleTableLayoutNavigation = useCallback(
    (key: string, shiftKey: boolean) => {
      const currentIndex = selectedTable
        ? tables.findIndex((t) => t.id === selectedTable)
        : -1;

      switch (key) {
        case 'ArrowLeft':
          const prevIndex = Math.max(0, currentIndex - 1);
          setSelectedTable(tables[prevIndex]?.id || null);
          announceTableSelection(tables[prevIndex]);
          break;
        case 'ArrowRight':
          const nextIndex = Math.min(tables.length - 1, currentIndex + 1);
          setSelectedTable(tables[nextIndex]?.id || null);
          announceTableSelection(tables[nextIndex]);
          break;
        case 'Enter':
        case ' ':
          if (selectedGuest && selectedTable) {
            assignGuestToTable(selectedGuest, selectedTable);
          }
          break;
        case 'Tab':
          if (shiftKey) {
            setFocusedElement('guest-list');
            announceAction(
              'Moved to guest list. Use arrow keys to navigate guests.',
            );
          } else {
            setFocusedElement('conflict-panel');
            announceAction('Moved to conflict panel.');
          }
          break;
      }
    },
    [selectedTable, selectedGuest, tables],
  );

  // Conflict panel keyboard navigation
  const handleConflictPanelNavigation = useCallback(
    (key: string, shiftKey: boolean) => {
      switch (key) {
        case 'Tab':
          if (shiftKey) {
            setFocusedElement('table-layout');
            announceAction('Moved to table layout.');
          }
          break;
      }
    },
    [],
  );

  // Screen reader announcements
  const announceAction = useCallback(
    (message: string) => {
      setAnnouncements((prev) => [...prev, message]);
      if (accessibilitySettings.soundEnabled) {
        // Play notification sound
        try {
          const audio = new Audio('/sounds/notification.wav');
          audio.volume = 0.3;
          audio.play().catch(() => {}); // Ignore audio errors
        } catch (e) {
          // Fallback for browsers that don't support audio
        }
      }
    },
    [accessibilitySettings.soundEnabled],
  );

  const announceGuestSelection = useCallback(
    (guest: any) => {
      if (guest) {
        const dietary =
          guest.dietaryRequirements?.length > 0
            ? `, has dietary requirements: ${guest.dietaryRequirements.join(', ')}`
            : '';
        announceAction(`Selected guest ${guest.name}${dietary}`);
      }
    },
    [announceAction],
  );

  const announceTableSelection = useCallback(
    (table: any) => {
      if (table) {
        const capacity = `${table.guests.length} of ${table.capacity} seats occupied`;
        const vip = table.isVip ? ', VIP table' : '';
        announceAction(`Selected ${table.name}, ${capacity}${vip}`);
      }
    },
    [announceAction],
  );

  const assignGuestToTable = useCallback(
    (guestId: string, tableId: string) => {
      const guest = guests.find((g) => g.id === guestId);
      const table = tables.find((t) => t.id === tableId);

      if (!guest || !table) return;

      if (table.capacity - table.guests.length <= 0) {
        announceAction(
          `Cannot assign ${guest.name} to ${table.name}: table is full`,
        );
        toast({
          title: 'Assignment Failed',
          description: `${table.name} is at full capacity`,
          variant: 'destructive',
        });
        return;
      }

      // Perform assignment
      const updatedTables = tables.map((t) =>
        t.id === tableId ? { ...t, guests: [...t.guests, guest] } : t,
      );

      const updatedGuests = guests.map((g) =>
        g.id === guestId
          ? { ...g, tableId, seatNumber: table.guests.length + 1 }
          : g,
      );

      onUpdateArrangement(updatedTables, updatedGuests);
      announceAction(`Successfully assigned ${guest.name} to ${table.name}`);

      toast({
        title: 'Guest Assigned',
        description: `${guest.name} assigned to ${table.name}`,
      });
    },
    [guests, tables, onUpdateArrangement, announceAction, toast],
  );

  // Accessibility settings toggle
  const toggleAccessibilitySetting = useCallback(
    (setting: keyof AccessibilitySettings) => {
      setAccessibilitySettings((prev) => ({
        ...prev,
        [setting]: !prev[setting],
      }));

      const newValue = !accessibilitySettings[setting];
      announceAction(
        `${setting.replace(/([A-Z])/g, ' $1').toLowerCase()} ${newValue ? 'enabled' : 'disabled'}`,
      );
    },
    [accessibilitySettings, announceAction],
  );

  // Initialize keyboard navigation
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Auto-focus management
  useEffect(() => {
    if (focusedElement === 'guest-list' && selectedGuest) {
      const element = document.getElementById(`guest-${selectedGuest}`);
      element?.focus();
    } else if (focusedElement === 'table-layout' && selectedTable) {
      const element = document.getElementById(`table-${selectedTable}`);
      element?.focus();
    }
  }, [focusedElement, selectedGuest, selectedTable]);

  return (
    <>
      {/* Skip Links */}
      <div
        ref={skipLinksRef}
        className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-2 focus-within:left-2 focus-within:z-50"
      >
        <a
          href="#main-content"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md"
          onClick={() => mainContentRef.current?.focus()}
        >
          Skip to main content
        </a>
        <a
          href="#guest-list"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md ml-2"
          onClick={() => setFocusedElement('guest-list')}
        >
          Skip to guest list
        </a>
        <a
          href="#table-layout"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md ml-2"
          onClick={() => setFocusedElement('table-layout')}
        >
          Skip to table layout
        </a>
      </div>

      {/* Live Region for Screen Reader Announcements */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcements[announcements.length - 1]}
      </div>

      {/* Accessibility Controls */}
      <div className="border-b border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Accessibility Controls</h2>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAccessibilitySetting('screenReaderMode')}
              aria-pressed={accessibilitySettings.screenReaderMode}
              title="Toggle screen reader optimizations"
            >
              <Accessibility className="h-4 w-4" />
              <span className="sr-only">Screen Reader Mode</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAccessibilitySetting('highContrast')}
              aria-pressed={accessibilitySettings.highContrast}
              title="Toggle high contrast mode"
            >
              <Contrast className="h-4 w-4" />
              <span className="sr-only">High Contrast</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAccessibilitySetting('largeText')}
              aria-pressed={accessibilitySettings.largeText}
              title="Toggle large text mode"
            >
              <Type className="h-4 w-4" />
              <span className="sr-only">Large Text</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAccessibilitySetting('soundEnabled')}
              aria-pressed={accessibilitySettings.soundEnabled}
              title="Toggle sound notifications"
            >
              {accessibilitySettings.soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
              <span className="sr-only">Sound Notifications</span>
            </Button>
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium">
            Keyboard Shortcuts
          </summary>
          <div className="mt-2 text-sm text-muted-foreground space-y-1">
            <div>
              <kbd className="bg-muted px-1 rounded">Ctrl+Z</kbd> Undo
            </div>
            <div>
              <kbd className="bg-muted px-1 rounded">Ctrl+Shift+Z</kbd> Redo
            </div>
            <div>
              <kbd className="bg-muted px-1 rounded">Ctrl+O</kbd> Optimize
              Seating
            </div>
            <div>
              <kbd className="bg-muted px-1 rounded">Tab</kbd> Navigate between
              panels
            </div>
            <div>
              <kbd className="bg-muted px-1 rounded">Arrow Keys</kbd> Navigate
              within panel
            </div>
            <div>
              <kbd className="bg-muted px-1 rounded">Enter/Space</kbd> Select or
              assign
            </div>
            <div>
              <kbd className="bg-muted px-1 rounded">Escape</kbd> Cancel current
              action
            </div>
          </div>
        </details>
      </div>

      {/* Main Content */}
      <div
        ref={mainContentRef}
        id="main-content"
        className={cn(
          'flex h-full',
          accessibilitySettings.highContrast && 'contrast-125',
          accessibilitySettings.largeText && 'text-lg',
          className,
        )}
        tabIndex={-1}
      >
        {/* Guest List Panel */}
        <div
          id="guest-list"
          className="w-80 border-r border-border bg-background"
          role="region"
          aria-label="Guest List"
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Unassigned Guests
              <Badge variant="outline" className="ml-2">
                {guests.filter((g) => !g.tableId).length}
              </Badge>
            </h3>

            <div
              className="space-y-2 max-h-96 overflow-y-auto"
              role="listbox"
              aria-label="Unassigned guests"
              aria-activedescendant={
                selectedGuest ? `guest-${selectedGuest}` : undefined
              }
            >
              {guests
                .filter((g) => !g.tableId)
                .map((guest, index) => (
                  <div
                    key={guest.id}
                    id={`guest-${guest.id}`}
                    role="option"
                    aria-selected={selectedGuest === guest.id}
                    aria-describedby={`guest-${guest.id}-details`}
                    className={cn(
                      'p-3 rounded-lg border cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary',
                      selectedGuest === guest.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted/50',
                    )}
                    onClick={() => {
                      setSelectedGuest(guest.id);
                      setFocusedElement('guest-list');
                      announceGuestSelection(guest);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedGuest(guest.id);
                        announceGuestSelection(guest);
                      }
                    }}
                    tabIndex={selectedGuest === guest.id ? 0 : -1}
                  >
                    <div className="font-medium">{guest.name}</div>
                    <div
                      id={`guest-${guest.id}-details`}
                      className="text-sm text-muted-foreground"
                    >
                      {guest.email}
                      {guest.dietaryRequirements?.length > 0 && (
                        <div className="mt-1">
                          <span className="text-orange-600">
                            Dietary: {guest.dietaryRequirements.join(', ')}
                          </span>
                        </div>
                      )}
                      {guest.accessibilityNeeds?.length > 0 && (
                        <div className="mt-1">
                          <span className="text-blue-600">
                            Accessibility: {guest.accessibilityNeeds.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Table Layout Panel */}
        <div
          id="table-layout"
          className="flex-1"
          role="region"
          aria-label="Table Layout"
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Tables</h3>

            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              role="grid"
              aria-label="Wedding tables"
            >
              {tables.map((table) => (
                <Card
                  key={table.id}
                  id={`table-${table.id}`}
                  role="gridcell"
                  aria-label={`${table.name}, ${table.guests.length} of ${table.capacity} seats occupied${table.isVip ? ', VIP table' : ''}`}
                  className={cn(
                    'cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary',
                    selectedTable === table.id && 'ring-2 ring-primary',
                  )}
                  onClick={() => {
                    setSelectedTable(table.id);
                    setFocusedElement('table-layout');
                    announceTableSelection(table);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedTable(table.id);
                      announceTableSelection(table);
                    }
                  }}
                  tabIndex={selectedTable === table.id ? 0 : -1}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      {table.name}
                      {table.isVip && <Badge variant="secondary">VIP</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground mb-3">
                      {table.guests.length}/{table.capacity} seats
                    </div>

                    {table.guests.length > 0 ? (
                      <div className="space-y-1">
                        {table.guests.map((guest: any, index: number) => (
                          <div
                            key={guest.id}
                            className="text-xs p-1 bg-muted rounded"
                          >
                            {index + 1}. {guest.name}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-xs">
                        No guests assigned
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Assignment Instructions */}
            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2">Assignment Instructions</h4>
              <p className="text-sm text-muted-foreground">
                {selectedGuest && selectedTable ? (
                  <>
                    Press{' '}
                    <kbd className="bg-background px-1 rounded">Enter</kbd> or{' '}
                    <kbd className="bg-background px-1 rounded">Space</kbd> to
                    assign {guests.find((g) => g.id === selectedGuest)?.name} to{' '}
                    {tables.find((t) => t.id === selectedTable)?.name}
                  </>
                ) : selectedGuest ? (
                  'Select a table to assign the guest to'
                ) : selectedTable ? (
                  'Select a guest to assign to this table'
                ) : (
                  'Select a guest and a table to make an assignment'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Conflict Panel (Accessible Version) */}
      <div
        id="conflict-panel"
        className="border-t border-border bg-muted/30 p-4"
        role="region"
        aria-label="Seating Conflicts"
      >
        <h3 className="font-semibold mb-2">Seating Status</h3>
        <div className="text-sm">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-muted-foreground">Assigned:</span>{' '}
              <span className="font-medium">
                {guests.filter((g) => g.tableId).length}/{guests.length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Tables Used:</span>{' '}
              <span className="font-medium">
                {tables.filter((t) => t.guests.length > 0).length}/
                {tables.length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Completion:</span>{' '}
              <span className="font-medium">
                {Math.round(
                  (guests.filter((g) => g.tableId).length / guests.length) *
                    100,
                )}
                %
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
