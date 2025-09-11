# 04-validation-rules.md

## What to Build

Comprehensive validation system for core fields with wedding-specific rules and intelligent error handling.

## Key Technical Requirements

### Validation Schema

```
// validators/coreFieldValidators.ts
import { z } from 'zod';

const weddingDateSchema = [z.date](http://z.date)()
  .min(new Date(), 'Wedding date must be in the future')
  .max(addYears(new Date(), 3), 'Please select a date within 3 years');

const guestCountSchema = z.object({
  adults: z.number().min(2).max(500),
  children: z.number().min(0).max(100),
  total: z.number().min(2).max(600)
});

const venueSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().min(10),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional(),
  capacity: z.number().optional()
});

const emailSchema = z.string()
  .email()
  .refine(async (email) => {
    // Check if email already registered
    const exists = await checkEmailExists(email);
    return !exists;
  }, 'Email already registered');
```

### Real-time Validation

```
// hooks/useFieldValidation.ts
export function useFieldValidation(fieldKey: string) {
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  
  const validate = useCallback(async (value: any) => {
    setIsValidating(true);
    
    try {
      const schema = getSchemaForField(fieldKey);
      await schema.parseAsync(value);
      setError(null);
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      }
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [fieldKey]);
  
  return { validate, error, isValidating };
}
```

### Cross-field Validation

```
// Reception venue must have capacity >= guest count
const crossFieldRules = [
  {
    fields: ['reception_venue', 'guest_count'],
    validator: (values) => {
      if (values.reception_venue?.capacity && values.guest_count?.total) {
        return values.reception_venue.capacity >= values.guest_[count.total](http://count.total);
      }
      return true;
    },
    message: 'Venue capacity insufficient for guest count'
  }
];
```

## Critical Implementation Notes

- Debounce validation by 500ms during typing
- Show inline errors below fields
- Validate on blur for immediate feedback
- Prevent form submission with validation errors
- Log validation failures for pattern analysis

## API Validation

```
// app/api/core-fields/validate/route.ts
export async function POST(request: Request) {
  const { fieldKey, value } = await request.json();
  
  const result = await validateField(fieldKey, value);
  
  return NextResponse.json({
    valid: result.valid,
    errors: result.errors,
    warnings: result.warnings
  });
}
```