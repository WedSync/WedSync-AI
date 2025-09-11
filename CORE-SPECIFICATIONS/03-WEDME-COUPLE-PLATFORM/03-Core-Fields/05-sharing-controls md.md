# 05-sharing-controls.md

## What to Build

Granular permission system allowing couples to control which core fields each supplier can access and modify.

## Key Technical Requirements

### Permission Matrix

```
// types/fieldPermissions.ts
interface FieldPermission {
  supplierId: string;
  fieldKey: CoreFieldKey;
  permissions: {
    read: boolean;
    write: boolean;
    required: boolean; // Supplier needs this field
  };
  reason?: string; // Why supplier needs this
}

const defaultPermissions: Record<SupplierType, CoreFieldKey[]> = {
  photographer: ['wedding_date', 'venues', 'guest_count', 'ceremony_time'],
  caterer: ['wedding_date', 'venues', 'guest_count', 'dietary_requirements'],
  dj: ['wedding_date', 'reception_venue', 'guest_count', 'music_preferences'],
  florist: ['wedding_date', 'venues', 'color_scheme']
};
```

### Permission UI Component

```
// components/couple/FieldPermissions.tsx
const FieldPermissionControl = ({ field, suppliers }) => {
  return (
    <div className="permission-grid">
      <h3>{field.label}</h3>
      {[suppliers.map](http://suppliers.map)(supplier => (
        <div key={[supplier.id](http://supplier.id)} className="supplier-permission">
          <span>{[supplier.name](http://supplier.name)}</span>
          <Switch 
            checked={hasPermission([supplier.id](http://supplier.id), field.key, 'read')}
            onChange={(allowed) => updatePermission(
              [supplier.id](http://supplier.id), 
              field.key, 
              'read', 
              allowed
            )}
          />
          {supplier.requestedFields.includes(field.key) && (
            <Badge>Requested</Badge>
          )}
        </div>
      ))}
    </div>
  );
};
```

### RLS Implementation

```
-- Row Level Security for field access
CREATE POLICY supplier_field_access ON core_fields
FOR SELECT USING (
  couple_id IN (
    SELECT couple_id FROM supplier_connections
    WHERE supplier_id = auth.uid()
  )
  AND field_key IN (
    SELECT field_key FROM field_permissions
    WHERE supplier_id = auth.uid()
    AND read = true
  )
);
```

## Critical Implementation Notes

- Default to minimal access (principle of least privilege)
- Show suppliers what fields they're missing
- Audit log all permission changes
- Bulk permission templates by supplier type
- Alert suppliers when permissions change

## API Endpoint

```
// app/api/permissions/update/route.ts
export async function PUT(request: Request) {
  const { supplierId, fieldKey, permission, allowed } = await request.json();
  
  await updateFieldPermission({
    supplierId,
    fieldKey,
    [permission]: allowed
  });
  
  // Notify supplier of permission change
  await notifySupplier(supplierId, { fieldKey, permission, allowed });
  
  return NextResponse.json({ success: true });
}
```