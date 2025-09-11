# 04-photo-groups.md

## What to Build

Create a drag-and-drop interface for organizing family photo groups that syncs directly with photographers.

## Key Technical Requirements

### Photo Group Structure

```
// types/photoGroups.ts
interface PhotoGroup {
  id: string;
  name: string; // "Bride's Immediate Family"
  order: number;
  estimated_time: number; // minutes
  members: PhotoGroupMember[];
  location?: string;
  notes?: string;
  must_have: boolean;
}

interface PhotoGroupMember {
  guest_id: string;
  role?: string; // "Mother of Bride"
  required: boolean;
  confirmed: boolean;
}

interface PhotoSchedule {
  groups: PhotoGroup[];
  total_time: number;
  photographer_notes?: string;
}
```

### Drag-Drop Interface

```
// components/photos/PhotoGroupBuilder.tsx
const PhotoGroupBuilder = () => {
  const [groups, setGroups] = useState<PhotoGroup[]>([]);
  const [unassigned, setUnassigned] = useState<Guest[]>([]);
  
  const handleDrop = (guestId: string, groupId: string) => {
    moveGuestToGroup(guestId, groupId);
    recalculateTimings();
  };
  
  return (
    <DndContext onDragEnd={handleDrop}>
      <div className="grid grid-cols-3 gap-4">
        <UnassignedGuests guests={unassigned} />
        
        <div className="col-span-2">
          {[groups.map](http://groups.map)(group => (
            <PhotoGroupCard 
              key={[group.id](http://group.id)}
              group={group}
              onDrop={(guestId) => handleDrop(guestId, [group.id](http://group.id))}
            />
          ))}
          <AddGroupButton />
        </div>
      </div>
    </DndContext>
  );
};
```

### Time Estimation

```
// utils/photoTimeEstimator.ts
const estimatePhotoTime = (group: PhotoGroup): number => {
  const baseTime = 2; // Setup time
  const perPersonTime = 0.5; // Per person
  const complexityMultiplier = group.members.length > 10 ? 1.5 : 1;
  
  return Math.ceil(
    (baseTime + (group.members.length * perPersonTime)) * complexityMultiplier
  );
};

const generateSchedule = (groups: PhotoGroup[]): string => {
  let currentTime = ceremonyEndTime;
  return [groups.map](http://groups.map)(group => {
    const duration = estimatePhotoTime(group);
    const slot = `${formatTime(currentTime)} - ${[group.name](http://group.name)} (${duration} min)`;
    currentTime = addMinutes(currentTime, duration);
    return slot;
  }).join('\n');
};
```

## Critical Implementation Notes

- Pre-populate common groups (immediate family, wedding party)
- Show total time calculation
- Flag conflicts (same person in overlapping groups)
- Generate printable shot list for photographer
- Allow photographer to reorder via their dashboard

## Photographer Sync

```
// app/api/photos/sync/route.ts
export async function POST(request: Request) {
  const { coupleId, groups } = await request.json();
  
  // Share with photographer
  await shareWithSupplier({
    supplierId: getPhotographer(coupleId),
    data: groups,
    type: 'photo_groups'
  });
  
  return NextResponse.json({ synced: true });
}
```