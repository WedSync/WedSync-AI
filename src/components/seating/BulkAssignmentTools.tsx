'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  UserPlus,
  Target,
  Filter,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Search,
  Heart,
  UserCheck,
  Shuffle,
  Coffee,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Guest {
  id: string;
  name: string;
  email: string;
  category?: 'family' | 'friends' | 'work' | 'other';
  side?: 'bride' | 'groom' | 'mutual';
  ageGroup?: 'child' | 'adult' | 'senior';
  dietaryRequirements?: string[];
  accessibilityNeeds?: string[];
  tableId?: string;
  householdId?: string;
  tags?: string[];
  conflictsWith?: string[];
}

export interface Table {
  id: string;
  name: string;
  capacity: number;
  shape: 'round' | 'rectangle' | 'long-rectangle';
  guests: Guest[];
  isVip?: boolean;
  template?: 'family' | 'formal' | 'cocktail';
}

export interface BulkAssignmentRule {
  id: string;
  name: string;
  description: string;
  criteria: {
    category?: string[];
    side?: string[];
    ageGroup?: string[];
    tags?: string[];
    householdId?: boolean;
    dietaryRequirements?: string[];
  };
  targetTablePattern?: string;
  priority?: number;
}

interface BulkAssignmentToolsProps {
  guests: Guest[];
  tables: Table[];
  onBulkAssignment: (
    assignments: { guestId: string; tableId: string }[],
  ) => void;
  className?: string;
}

const PRESET_RULES: BulkAssignmentRule[] = [
  {
    id: 'immediate-family',
    name: 'Immediate Family',
    description: 'Assign immediate family members together',
    criteria: { category: ['family'], tags: ['immediate'] },
    targetTablePattern: 'vip',
    priority: 1,
  },
  {
    id: 'wedding-party',
    name: 'Wedding Party',
    description: 'Seat wedding party members at head table',
    criteria: { tags: ['wedding_party'] },
    targetTablePattern: 'head',
    priority: 2,
  },
  {
    id: 'elderly-guests',
    name: 'Senior Guests',
    description: 'Priority seating for elderly guests near facilities',
    criteria: { ageGroup: ['senior'] },
    targetTablePattern: 'accessible',
    priority: 3,
  },
  {
    id: 'children-families',
    name: 'Families with Children',
    description: 'Group families with children together',
    criteria: { ageGroup: ['child'], householdId: true },
    targetTablePattern: 'family',
    priority: 4,
  },
  {
    id: 'dietary-restrictions',
    name: 'Special Dietary Needs',
    description: 'Group guests with similar dietary requirements',
    criteria: { dietaryRequirements: ['vegetarian', 'vegan', 'gluten-free'] },
    targetTablePattern: 'dietary',
    priority: 5,
  },
  {
    id: 'work-colleagues',
    name: 'Work Colleagues',
    description: 'Seat colleagues from same workplace together',
    criteria: { category: ['work'] },
    targetTablePattern: 'social',
    priority: 6,
  },
];

export function BulkAssignmentTools({
  guests,
  tables,
  onBulkAssignment,
  className,
}: BulkAssignmentToolsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [activeRule, setActiveRule] = useState<BulkAssignmentRule | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<
    'all' | 'unassigned' | 'category' | 'side'
  >('unassigned');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const { toast } = useToast();

  // Filter guests based on current filters
  const filteredGuests = useMemo(() => {
    let filtered = guests;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (guest) =>
          guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          guest.email.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Status filter
    switch (filterBy) {
      case 'unassigned':
        filtered = filtered.filter((guest) => !guest.tableId);
        break;
      case 'category':
        if (categoryFilter) {
          filtered = filtered.filter(
            (guest) => guest.category === categoryFilter,
          );
        }
        break;
      case 'side':
        if (categoryFilter) {
          filtered = filtered.filter((guest) => guest.side === categoryFilter);
        }
        break;
    }

    return filtered;
  }, [guests, searchQuery, filterBy, categoryFilter]);

  // Get available tables with capacity
  const availableTables = useMemo(() => {
    return tables
      .map((table) => ({
        ...table,
        availableSeats: table.capacity - table.guests.length,
        canFitSelection:
          table.capacity - table.guests.length >= selectedGuests.length,
      }))
      .filter((table) => table.availableSeats > 0);
  }, [tables, selectedGuests.length]);

  // Handle guest selection
  const toggleGuestSelection = useCallback((guestId: string) => {
    setSelectedGuests((prev) =>
      prev.includes(guestId)
        ? prev.filter((id) => id !== guestId)
        : [...prev, guestId],
    );
  }, []);

  const selectAllFiltered = useCallback(() => {
    const unassignedFiltered = filteredGuests.filter((guest) => !guest.tableId);
    setSelectedGuests(unassignedFiltered.map((guest) => guest.id));
  }, [filteredGuests]);

  const clearSelection = useCallback(() => {
    setSelectedGuests([]);
  }, []);

  // Apply bulk assignment
  const applyBulkAssignment = useCallback(() => {
    if (selectedGuests.length === 0 || !selectedTable) {
      toast({
        title: 'Invalid Selection',
        description: 'Please select guests and a target table',
        variant: 'destructive',
      });
      return;
    }

    const table = tables.find((t) => t.id === selectedTable);
    if (!table) return;

    if (table.capacity - table.guests.length < selectedGuests.length) {
      toast({
        title: 'Insufficient Capacity',
        description: `${table.name} only has ${table.capacity - table.guests.length} available seats`,
        variant: 'destructive',
      });
      return;
    }

    const assignments = selectedGuests.map((guestId) => ({
      guestId,
      tableId: selectedTable,
    }));

    onBulkAssignment(assignments);
    setSelectedGuests([]);
    setSelectedTable('');
    setIsOpen(false);

    toast({
      title: 'Bulk Assignment Complete',
      description: `Assigned ${selectedGuests.length} guests to ${table.name}`,
    });
  }, [selectedGuests, selectedTable, tables, onBulkAssignment, toast]);

  // Apply preset rule
  const applyPresetRule = useCallback(
    (rule: BulkAssignmentRule) => {
      const matchingGuests = guests.filter((guest) => {
        const criteria = rule.criteria;

        // Check category
        if (
          criteria.category &&
          (!guest.category || !criteria.category.includes(guest.category))
        ) {
          return false;
        }

        // Check side
        if (
          criteria.side &&
          (!guest.side || !criteria.side.includes(guest.side))
        ) {
          return false;
        }

        // Check age group
        if (
          criteria.ageGroup &&
          (!guest.ageGroup || !criteria.ageGroup.includes(guest.ageGroup))
        ) {
          return false;
        }

        // Check tags
        if (
          criteria.tags &&
          (!guest.tags ||
            !criteria.tags.some((tag) => guest.tags!.includes(tag)))
        ) {
          return false;
        }

        // Check household grouping
        if (criteria.householdId && !guest.householdId) {
          return false;
        }

        // Check dietary requirements
        if (
          criteria.dietaryRequirements &&
          (!guest.dietaryRequirements ||
            !criteria.dietaryRequirements.some((req) =>
              guest.dietaryRequirements!.includes(req),
            ))
        ) {
          return false;
        }

        return !guest.tableId; // Only unassigned guests
      });

      if (matchingGuests.length === 0) {
        toast({
          title: 'No Matching Guests',
          description: `No unassigned guests match the criteria for ${rule.name}`,
          variant: 'destructive',
        });
        return;
      }

      // Find suitable tables
      let suitableTables = tables.filter((table) => {
        if (rule.targetTablePattern) {
          return (
            table.name
              .toLowerCase()
              .includes(rule.targetTablePattern.toLowerCase()) ||
            (rule.targetTablePattern === 'vip' && table.isVip)
          );
        }
        return table.capacity - table.guests.length > 0;
      });

      if (suitableTables.length === 0) {
        suitableTables = tables.filter(
          (table) => table.capacity - table.guests.length > 0,
        );
      }

      // Create assignments by grouping
      const assignments: { guestId: string; tableId: string }[] = [];
      let currentTableIndex = 0;

      if (criteria.householdId) {
        // Group by household
        const households = new Map<string, Guest[]>();
        matchingGuests.forEach((guest) => {
          if (guest.householdId) {
            if (!households.has(guest.householdId)) {
              households.set(guest.householdId, []);
            }
            households.get(guest.householdId)!.push(guest);
          } else {
            // Single guests
            if (!households.has('singles')) {
              households.set('singles', []);
            }
            households.get('singles')!.push(guest);
          }
        });

        households.forEach((householdGuests) => {
          const table =
            suitableTables[currentTableIndex % suitableTables.length];
          if (
            table &&
            table.capacity - table.guests.length >= householdGuests.length
          ) {
            householdGuests.forEach((guest) => {
              assignments.push({ guestId: guest.id, tableId: table.id });
            });
            currentTableIndex++;
          }
        });
      } else {
        // Distribute evenly across suitable tables
        matchingGuests.forEach((guest, index) => {
          const table = suitableTables[index % suitableTables.length];
          if (table && table.capacity - table.guests.length > 0) {
            assignments.push({ guestId: guest.id, tableId: table.id });
          }
        });
      }

      if (assignments.length > 0) {
        onBulkAssignment(assignments);
        toast({
          title: 'Rule Applied Successfully',
          description: `${rule.name}: Assigned ${assignments.length} guests`,
        });
      }

      setActiveRule(null);
    },
    [guests, tables, onBulkAssignment, toast],
  );

  const getGuestBadges = useCallback((guest: Guest) => {
    const badges = [];

    if (guest.category) {
      badges.push({ text: guest.category, variant: 'secondary' as const });
    }

    if (guest.side) {
      badges.push({ text: guest.side, variant: 'outline' as const });
    }

    if (guest.dietaryRequirements && guest.dietaryRequirements.length > 0) {
      badges.push({ text: 'Dietary', variant: 'destructive' as const });
    }

    if (guest.accessibilityNeeds && guest.accessibilityNeeds.length > 0) {
      badges.push({ text: 'Accessibility', variant: 'default' as const });
    }

    return badges;
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <Users className="h-4 w-4 mr-2" />
          Bulk Assignment
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Guest Assignment</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Assignment</TabsTrigger>
            <TabsTrigger value="rules">Smart Rules</TabsTrigger>
          </TabsList>

          {/* Manual Assignment Tab */}
          <TabsContent value="manual" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Guest Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Select Guests</span>
                    <Badge variant="outline">
                      {selectedGuests.length} selected
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filters */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search guests..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <Select
                        value={filterBy}
                        onValueChange={(value: any) => setFilterBy(value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Guests</SelectItem>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          <SelectItem value="category">By Category</SelectItem>
                          <SelectItem value="side">By Side</SelectItem>
                        </SelectContent>
                      </Select>

                      {(filterBy === 'category' || filterBy === 'side') && (
                        <Select
                          value={categoryFilter}
                          onValueChange={setCategoryFilter}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {filterBy === 'category' ? (
                              <>
                                <SelectItem value="family">Family</SelectItem>
                                <SelectItem value="friends">Friends</SelectItem>
                                <SelectItem value="work">Work</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="bride">Bride</SelectItem>
                                <SelectItem value="groom">Groom</SelectItem>
                                <SelectItem value="mutual">Mutual</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={selectAllFiltered}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Select All (
                        {filteredGuests.filter((g) => !g.tableId).length})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={clearSelection}
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </div>

                  {/* Guest List */}
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filteredGuests.map((guest) => (
                      <div
                        key={guest.id}
                        className={cn(
                          'flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors',
                          selectedGuests.includes(guest.id)
                            ? 'bg-blue-50 border-blue-200'
                            : guest.tableId
                              ? 'bg-muted/50 text-muted-foreground'
                              : 'hover:bg-muted/50',
                        )}
                        onClick={() =>
                          !guest.tableId && toggleGuestSelection(guest.id)
                        }
                      >
                        <Checkbox
                          checked={selectedGuests.includes(guest.id)}
                          disabled={!!guest.tableId}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">
                            {guest.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {guest.email}
                          </div>
                          {guest.tableId && (
                            <div className="text-xs text-green-600">
                              Already assigned to{' '}
                              {tables.find((t) => t.id === guest.tableId)?.name}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {getGuestBadges(guest).map((badge, index) => (
                            <Badge
                              key={index}
                              variant={badge.variant}
                              className="text-xs"
                            >
                              {badge.text}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Table Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Select Target Table</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {availableTables.map((table) => (
                      <div
                        key={table.id}
                        className={cn(
                          'p-3 rounded-lg border cursor-pointer transition-colors',
                          selectedTable === table.id
                            ? 'bg-blue-50 border-blue-200'
                            : table.canFitSelection
                              ? 'hover:bg-muted/50'
                              : 'bg-red-50 border-red-200 cursor-not-allowed',
                        )}
                        onClick={() =>
                          table.canFitSelection && setSelectedTable(table.id)
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{table.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {table.availableSeats}/{table.capacity} available
                              {table.isVip && (
                                <Badge variant="secondary" className="ml-2">
                                  VIP
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {table.canFitSelection ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedGuests.length > 0 && selectedTable && (
                    <div className="pt-4 border-t">
                      <Button onClick={applyBulkAssignment} className="w-full">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assign {selectedGuests.length} Guests
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Smart Rules Tab */}
          <TabsContent value="rules" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PRESET_RULES.map((rule) => {
                const matchingGuests = guests
                  .filter((guest) => !guest.tableId)
                  .filter((guest) => {
                    const criteria = rule.criteria;
                    return (
                      (!criteria.category ||
                        (guest.category &&
                          criteria.category.includes(guest.category))) &&
                      (!criteria.side ||
                        (guest.side && criteria.side.includes(guest.side))) &&
                      (!criteria.ageGroup ||
                        (guest.ageGroup &&
                          criteria.ageGroup.includes(guest.ageGroup))) &&
                      (!criteria.tags ||
                        (guest.tags &&
                          criteria.tags.some((tag) =>
                            guest.tags!.includes(tag),
                          )))
                    );
                  });

                return (
                  <Card
                    key={rule.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{rule.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {rule.description}
                          </p>
                        </div>
                        <Badge variant="outline">
                          Priority {rule.priority}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="text-muted-foreground">
                            Matches:
                          </span>
                          <span className="ml-1 font-medium">
                            {matchingGuests.length} guests
                          </span>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => applyPresetRule(rule)}
                          disabled={matchingGuests.length === 0}
                        >
                          <Target className="h-4 w-4 mr-1" />
                          Apply
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
