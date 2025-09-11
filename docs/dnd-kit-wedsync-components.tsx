// DND Kit Production Components for WedSync
// This file contains ready-to-use drag-and-drop components for the WedSync project

import React, { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToWindowEdges, restrictToParentElement } from '@dnd-kit/modifiers';

// ============================================================================
// Type Definitions
// ============================================================================

interface VendorService {
  id: string;
  name: string;
  price: number;
  description: string;
  duration?: string;
  featured?: boolean;
}

interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  duration: number; // in minutes
  vendor?: string;
  location?: string;
  notes?: string;
}

interface Guest {
  id: string;
  name: string;
  email?: string;
  dietary?: string;
  plusOne?: boolean;
  rsvpStatus?: 'pending' | 'confirmed' | 'declined';
}

interface Table {
  id: string;
  name: string;
  capacity: number;
  location?: string;
}

interface Photo {
  id: string;
  url: string;
  thumbnail: string;
  caption?: string;
  tags?: string[];
  uploadedBy?: string;
  uploadedAt?: Date;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
}

// ============================================================================
// 1. Vendor Service Ordering Component
// ============================================================================

export function VendorServiceOrdering({
  services: initialServices,
  onReorder,
  onEdit,
  readOnly = false,
}: {
  services: VendorService[];
  onReorder?: (services: VendorService[]) => void;
  onEdit?: (service: VendorService) => void;
  readOnly?: boolean;
}) {
  const [services, setServices] = useState(initialServices);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      setServices((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        onReorder?.(newOrder);
        return newOrder;
      });
    }
    
    setActiveId(null);
  };

  const activeService = useMemo(
    () => services.find((s) => s.id === activeId),
    [activeId, services]
  );

  if (readOnly) {
    return (
      <div className="space-y-2">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} readOnly />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={services.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {services.map((service) => (
            <SortableServiceCard
              key={service.id}
              service={service}
              onEdit={onEdit}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeId && activeService ? (
          <ServiceCard service={activeService} isDragOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableServiceCard({
  service,
  onEdit,
}: {
  service: VendorService;
  onEdit?: (service: VendorService) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: service.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ServiceCard
        service={service}
        onEdit={onEdit}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function ServiceCard({
  service,
  onEdit,
  dragHandleProps,
  isDragOverlay,
  readOnly,
}: {
  service: VendorService;
  onEdit?: (service: VendorService) => void;
  dragHandleProps?: any;
  isDragOverlay?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border p-4 ${
        isDragOverlay ? 'shadow-lg rotate-3' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {!readOnly && (
          <div
            className="mt-1 cursor-move text-gray-400 hover:text-gray-600"
            {...dragHandleProps}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">
                {service.name}
                {service.featured && (
                  <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                    Featured
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{service.description}</p>
              {service.duration && (
                <p className="text-xs text-gray-500 mt-1">Duration: {service.duration}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-semibold text-lg">${service.price}</p>
              {!readOnly && onEdit && (
                <button
                  onClick={() => onEdit(service)}
                  className="text-sm text-blue-600 hover:text-blue-800 mt-1"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. Wedding Timeline Builder Component
// ============================================================================

export function WeddingTimelineBuilder({
  availableEvents: initialAvailable,
  timelineEvents: initialTimeline = [],
  onUpdate,
  startTime = '09:00',
  endTime = '23:00',
}: {
  availableEvents: TimelineEvent[];
  timelineEvents?: TimelineEvent[];
  onUpdate?: (timeline: TimelineEvent[]) => void;
  startTime?: string;
  endTime?: string;
}) {
  const [available, setAvailable] = useState(initialAvailable);
  const [timeline, setTimeline] = useState(initialTimeline);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id) || over.id;

    if (activeContainer === overContainer) {
      // Reordering within the same container
      if (overContainer === 'timeline') {
        const oldIndex = timeline.findIndex((item) => item.id === active.id);
        const newIndex = timeline.findIndex((item) => item.id === over.id);
        
        if (oldIndex !== newIndex) {
          const newTimeline = arrayMove(timeline, oldIndex, newIndex);
          setTimeline(newTimeline);
          onUpdate?.(newTimeline);
        }
      }
    } else {
      // Moving between containers
      if (activeContainer === 'available' && overContainer === 'timeline') {
        const event = available.find((e) => e.id === active.id);
        if (event) {
          setAvailable(available.filter((e) => e.id !== active.id));
          const newTimeline = [...timeline, event];
          setTimeline(newTimeline);
          onUpdate?.(newTimeline);
        }
      } else if (activeContainer === 'timeline' && overContainer === 'available') {
        const event = timeline.find((e) => e.id === active.id);
        if (event) {
          const newTimeline = timeline.filter((e) => e.id !== active.id);
          setTimeline(newTimeline);
          setAvailable([...available, event]);
          onUpdate?.(newTimeline);
        }
      }
    }
    
    setActiveId(null);
  };

  const findContainer = (id: UniqueIdentifier) => {
    if (available.some((item) => item.id === id)) {
      return 'available';
    }
    if (timeline.some((item) => item.id === id)) {
      return 'timeline';
    }
    return null;
  };

  const activeEvent = useMemo(() => {
    return (
      available.find((e) => e.id === activeId) ||
      timeline.find((e) => e.id === activeId)
    );
  }, [activeId, available, timeline]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToWindowEdges]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h3 className="text-lg font-semibold mb-3">Available Events</h3>
          <div className="bg-gray-50 rounded-lg p-4 min-h-[400px]">
            <SortableContext
              items={available.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {available.map((event) => (
                  <SortableEventCard key={event.id} event={event} />
                ))}
              </div>
            </SortableContext>
            {available.length === 0 && (
              <p className="text-gray-400 text-center py-8">
                All events added to timeline
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold mb-3">Wedding Timeline</h3>
          <div className="bg-white border rounded-lg p-4 min-h-[400px]">
            <TimelineView
              events={timeline}
              startTime={startTime}
              endTime={endTime}
            />
            <SortableContext
              items={timeline.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 mt-4">
                {timeline.map((event) => (
                  <SortableEventCard key={event.id} event={event} inTimeline />
                ))}
              </div>
            </SortableContext>
            {timeline.length === 0 && (
              <p className="text-gray-400 text-center py-8">
                Drag events here to build your timeline
              </p>
            )}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeId && activeEvent ? (
          <EventCard event={activeEvent} isDragOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableEventCard({
  event,
  inTimeline,
}: {
  event: TimelineEvent;
  inTimeline?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <EventCard event={event} inTimeline={inTimeline} />
    </div>
  );
}

function EventCard({
  event,
  inTimeline,
  isDragOverlay,
}: {
  event: TimelineEvent;
  inTimeline?: boolean;
  isDragOverlay?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-lg border p-3 cursor-move ${
        isDragOverlay ? 'shadow-xl rotate-2' : 'shadow-sm'
      } ${inTimeline ? 'border-blue-200' : 'border-gray-200'}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">{event.time}</span>
            <span className="text-xs text-gray-400">({event.duration} min)</span>
          </div>
          <h4 className="font-medium text-gray-900 mt-1">{event.title}</h4>
          {event.vendor && (
            <p className="text-xs text-gray-500 mt-1">Vendor: {event.vendor}</p>
          )}
          {event.location && (
            <p className="text-xs text-gray-500">Location: {event.location}</p>
          )}
        </div>
        <svg
          className="w-4 h-4 text-gray-400 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </div>
    </div>
  );
}

function TimelineView({
  events,
  startTime,
  endTime,
}: {
  events: TimelineEvent[];
  startTime: string;
  endTime: string;
}) {
  // Simple timeline visualization
  return (
    <div className="relative">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-300"></div>
      {events.map((event, index) => (
        <div key={event.id} className="relative pl-6 pb-4">
          <div className="absolute left-0 top-1 w-2 h-2 bg-blue-500 rounded-full -translate-x-1/2"></div>
          <div className="text-sm">
            <span className="font-medium">{event.time}</span> - {event.title}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// 3. Guest Seating Arrangement Component
// ============================================================================

export function GuestSeatingArrangement({
  guests: initialGuests,
  tables,
  initialArrangement = {},
  onUpdate,
}: {
  guests: Guest[];
  tables: Table[];
  initialArrangement?: Record<string, Guest[]>;
  onUpdate?: (arrangement: Record<string, Guest[]>) => void;
}) {
  const [arrangement, setArrangement] = useState<Record<string, Guest[]>>(() => {
    const defaultArrangement: Record<string, Guest[]> = {
      unassigned: initialGuests,
    };
    
    tables.forEach((table) => {
      defaultArrangement[table.id] = initialArrangement[table.id] || [];
    });
    
    // Remove assigned guests from unassigned
    const assignedGuestIds = new Set(
      Object.values(initialArrangement).flat().map((g) => g.id)
    );
    defaultArrangement.unassigned = initialGuests.filter(
      (g) => !assignedGuestIds.has(g.id)
    );
    
    return defaultArrangement;
  });

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = over.id as string;

    if (activeContainer && activeContainer !== overContainer) {
      const guest = arrangement[activeContainer].find((g) => g.id === active.id);
      
      if (guest) {
        const newArrangement = {
          ...arrangement,
          [activeContainer]: arrangement[activeContainer].filter(
            (g) => g.id !== active.id
          ),
          [overContainer]: [...(arrangement[overContainer] || []), guest],
        };
        
        setArrangement(newArrangement);
        onUpdate?.(newArrangement);
      }
    }
    
    setActiveId(null);
  };

  const findContainer = (id: UniqueIdentifier) => {
    return Object.keys(arrangement).find((key) =>
      arrangement[key].some((guest) => guest.id === id)
    );
  };

  const activeGuest = useMemo(() => {
    const container = findContainer(activeId as string);
    return container
      ? arrangement[container].find((g) => g.id === activeId)
      : null;
  }, [activeId, arrangement]);

  const getTableCapacityInfo = (tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    const seated = arrangement[tableId]?.length || 0;
    const capacity = table?.capacity || 0;
    return { seated, capacity, available: capacity - seated };
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((table) => {
            const { seated, capacity, available } = getTableCapacityInfo(table.id);
            return (
              <TableDropZone
                key={table.id}
                table={table}
                guests={arrangement[table.id] || []}
                seated={seated}
                capacity={capacity}
                available={available}
              />
            );
          })}
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Unassigned Guests</h3>
          <UnassignedGuestsZone guests={arrangement.unassigned || []} />
        </div>
      </div>

      <DragOverlay>
        {activeId && activeGuest ? (
          <GuestCard guest={activeGuest} isDragOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function TableDropZone({
  table,
  guests,
  seated,
  capacity,
  available,
}: {
  table: Table;
  guests: Guest[];
  seated: number;
  capacity: number;
  available: number;
}) {
  const { setNodeRef, isOver } = useSortable({
    id: table.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-white rounded-lg border-2 p-4 min-h-[200px] transition-colors ${
        isOver
          ? available > 0
            ? 'border-green-400 bg-green-50'
            : 'border-red-400 bg-red-50'
          : 'border-gray-200'
      }`}
    >
      <div className="mb-3">
        <h4 className="font-semibold text-gray-900">{table.name}</h4>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm text-gray-500">{table.location}</span>
          <span
            className={`text-sm font-medium ${
              available > 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {seated}/{capacity}
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {guests.map((guest) => (
          <DraggableGuestCard key={guest.id} guest={guest} />
        ))}
      </div>
      {guests.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-4">
          Drop guests here
        </p>
      )}
    </div>
  );
}

function UnassignedGuestsZone({ guests }: { guests: Guest[] }) {
  const { setNodeRef } = useSortable({
    id: 'unassigned',
  });

  return (
    <div
      ref={setNodeRef}
      className="bg-gray-50 rounded-lg border p-4 min-h-[150px]"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
        {guests.map((guest) => (
          <DraggableGuestCard key={guest.id} guest={guest} />
        ))}
      </div>
      {guests.length === 0 && (
        <p className="text-gray-400 text-center py-8">
          All guests have been assigned to tables
        </p>
      )}
    </div>
  );
}

function DraggableGuestCard({ guest }: { guest: Guest }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: guest.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-move"
    >
      <GuestCard guest={guest} />
    </div>
  );
}

function GuestCard({
  guest,
  isDragOverlay,
}: {
  guest: Guest;
  isDragOverlay?: boolean;
}) {
  const statusColors = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    declined: 'bg-red-100 text-red-800',
  };

  return (
    <div
      className={`bg-white rounded-lg border p-2 ${
        isDragOverlay ? 'shadow-xl rotate-3' : 'shadow-sm'
      }`}
    >
      <div className="text-sm font-medium text-gray-900">{guest.name}</div>
      {guest.plusOne && (
        <div className="text-xs text-gray-500">+1</div>
      )}
      {guest.rsvpStatus && (
        <span
          className={`inline-block px-1 py-0.5 text-xs rounded mt-1 ${
            statusColors[guest.rsvpStatus]
          }`}
        >
          {guest.rsvpStatus}
        </span>
      )}
      {guest.dietary && (
        <div className="text-xs text-gray-400 mt-1">{guest.dietary}</div>
      )}
    </div>
  );
}

// ============================================================================
// 4. Photo Gallery Organization Component
// ============================================================================

export function PhotoGalleryOrganizer({
  photos: initialPhotos,
  categories,
  initialOrganization = {},
  onUpdate,
}: {
  photos: Photo[];
  categories: Category[];
  initialOrganization?: Record<string, Photo[]>;
  onUpdate?: (organization: Record<string, Photo[]>) => void;
}) {
  const [organization, setOrganization] = useState<Record<string, Photo[]>>(() => {
    const defaultOrg: Record<string, Photo[]> = {
      uncategorized: initialPhotos,
    };
    
    categories.forEach((cat) => {
      defaultOrg[cat.id] = initialOrganization[cat.id] || [];
    });
    
    // Remove organized photos from uncategorized
    const organizedPhotoIds = new Set(
      Object.values(initialOrganization).flat().map((p) => p.id)
    );
    defaultOrg.uncategorized = initialPhotos.filter(
      (p) => !organizedPhotoIds.has(p.id)
    );
    
    return defaultOrg;
  });

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = over.id as string;

    if (activeContainer && activeContainer !== overContainer) {
      if (selectedPhotos.size > 0 && selectedPhotos.has(active.id as string)) {
        // Move all selected photos
        const photosToMove = organization[activeContainer].filter((p) =>
          selectedPhotos.has(p.id)
        );
        
        const newOrganization = {
          ...organization,
          [activeContainer]: organization[activeContainer].filter(
            (p) => !selectedPhotos.has(p.id)
          ),
          [overContainer]: [
            ...(organization[overContainer] || []),
            ...photosToMove,
          ],
        };
        
        setOrganization(newOrganization);
        setSelectedPhotos(new Set());
        onUpdate?.(newOrganization);
      } else {
        // Move single photo
        const photo = organization[activeContainer].find((p) => p.id === active.id);
        
        if (photo) {
          const newOrganization = {
            ...organization,
            [activeContainer]: organization[activeContainer].filter(
              (p) => p.id !== active.id
            ),
            [overContainer]: [...(organization[overContainer] || []), photo],
          };
          
          setOrganization(newOrganization);
          onUpdate?.(newOrganization);
        }
      }
    }
    
    setActiveId(null);
  };

  const findContainer = (id: UniqueIdentifier) => {
    return Object.keys(organization).find((key) =>
      organization[key].some((photo) => photo.id === id)
    );
  };

  const togglePhotoSelection = (photoId: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotos(newSelection);
  };

  const activePhoto = useMemo(() => {
    const container = findContainer(activeId as string);
    return container
      ? organization[container].find((p) => p.id === activeId)
      : null;
  }, [activeId, organization]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {selectedPhotos.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              {selectedPhotos.size} photo(s) selected. Drag any selected photo to move all.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <CategoryDropZone
              key={category.id}
              category={category}
              photos={organization[category.id] || []}
              selectedPhotos={selectedPhotos}
              onToggleSelection={togglePhotoSelection}
            />
          ))}
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Uncategorized Photos</h3>
          <UncategorizedPhotosZone
            photos={organization.uncategorized || []}
            selectedPhotos={selectedPhotos}
            onToggleSelection={togglePhotoSelection}
          />
        </div>
      </div>

      <DragOverlay>
        {activeId && activePhoto ? (
          <PhotoCard photo={activePhoto} isDragOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function CategoryDropZone({
  category,
  photos,
  selectedPhotos,
  onToggleSelection,
}: {
  category: Category;
  photos: Photo[];
  selectedPhotos: Set<string>;
  onToggleSelection: (photoId: string) => void;
}) {
  const { setNodeRef, isOver } = useSortable({
    id: category.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-white rounded-lg border-2 p-4 min-h-[300px] transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
      }`}
    >
      <div className="mb-3">
        <h4 className="font-semibold text-gray-900">{category.name}</h4>
        {category.description && (
          <p className="text-sm text-gray-500 mt-1">{category.description}</p>
        )}
        <span className="text-sm text-gray-400">{photos.length} photos</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <DraggablePhotoCard
            key={photo.id}
            photo={photo}
            isSelected={selectedPhotos.has(photo.id)}
            onToggleSelection={onToggleSelection}
          />
        ))}
      </div>
      {photos.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">
          Drop photos here
        </p>
      )}
    </div>
  );
}

function UncategorizedPhotosZone({
  photos,
  selectedPhotos,
  onToggleSelection,
}: {
  photos: Photo[];
  selectedPhotos: Set<string>;
  onToggleSelection: (photoId: string) => void;
}) {
  const { setNodeRef } = useSortable({
    id: 'uncategorized',
  });

  return (
    <div
      ref={setNodeRef}
      className="bg-gray-50 rounded-lg border p-4 min-h-[200px]"
    >
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
        {photos.map((photo) => (
          <DraggablePhotoCard
            key={photo.id}
            photo={photo}
            isSelected={selectedPhotos.has(photo.id)}
            onToggleSelection={onToggleSelection}
          />
        ))}
      </div>
      {photos.length === 0 && (
        <p className="text-gray-400 text-center py-8">
          All photos have been categorized
        </p>
      )}
    </div>
  );
}

function DraggablePhotoCard({
  photo,
  isSelected,
  onToggleSelection,
}: {
  photo: Photo;
  isSelected: boolean;
  onToggleSelection: (photoId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelection(photo.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-move relative"
      onClick={handleClick}
    >
      <PhotoCard photo={photo} isSelected={isSelected} />
    </div>
  );
}

function PhotoCard({
  photo,
  isSelected,
  isDragOverlay,
}: {
  photo: Photo;
  isSelected?: boolean;
  isDragOverlay?: boolean;
}) {
  return (
    <div
      className={`relative aspect-square rounded overflow-hidden ${
        isDragOverlay ? 'shadow-2xl rotate-3' : 'shadow-sm'
      } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
    >
      <img
        src={photo.thumbnail}
        alt={photo.caption || 'Photo'}
        className="w-full h-full object-cover"
      />
      {isSelected && (
        <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

// Export all components
export default {
  VendorServiceOrdering,
  WeddingTimelineBuilder,
  GuestSeatingArrangement,
  PhotoGalleryOrganizer,
};