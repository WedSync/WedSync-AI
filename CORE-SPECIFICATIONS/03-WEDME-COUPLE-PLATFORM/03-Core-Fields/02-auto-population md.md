# 02-auto-population.md

## What to Build

Create an intelligent system that automatically fills supplier forms with core field data, eliminating repetitive data entry.

## Key Technical Requirements

### Field Mapping Engine

```
// services/autoPopulation.ts
interface FieldMapping {
  supplierFieldId: string;
  coreFieldKey: CoreFieldKey;
  transformer?: (value: any) => any;
  condition?: (coreFields: CoreFields) => boolean;
}

class AutoPopulationEngine {
  async populateForm(formId: string, coupleId: string) {
    const mappings = await getFieldMappings(formId);
    const coreFields = await getCoreFields(coupleId);
    
    const populated = {};
    
    for (const mapping of mappings) {
      if (mapping.condition && !mapping.condition(coreFields)) {
        continue;
      }
      
      const value = coreFields[mapping.coreFieldKey];
      populated[mapping.supplierFieldId] = mapping.transformer 
        ? mapping.transformer(value)
        : value;
    }
    
    return populated;
  }
}
```

### Real-time Sync

```
// hooks/useAutoPopulate.ts
export function useAutoPopulate(formId: string) {
  const { fields } = useCoreFieldsStore();
  
  useEffect(() => {
    const channel = supabase
      .channel('core-fields-sync')
      .on('broadcast', { event: 'field-update' }, ({ payload }) => {
        // Update form field if mapped
        const mapping = getMapping(formId, payload.key);
        if (mapping) {
          updateFormField(mapping.fieldId, payload.value);
        }
      })
      .subscribe();
      
    return () => channel.unsubscribe();
  }, [formId]);
}
```

## Critical Implementation Notes

- Show "Auto-filled" badge on populated fields
- Allow manual override with warning
- Handle field format transformations (date formats, etc.)
- Queue updates to prevent race conditions
- Log all auto-population events

## API Endpoint

```
// app/api/forms/populate/route.ts
export async function POST(request: Request) {
  const { formId, coupleId } = await request.json();
  
  const populatedData = await autoPopulate(formId, coupleId);
  
  return NextResponse.json({ 
    fields: populatedData,
    mappedCount: Object.keys(populatedData).length 
  });
}
```