# 01-profile-creation.md

## What to Build

A self-service profile creation system for suppliers to build their directory listings with guided setup and validation.

## Key Technical Requirements

### Profile Setup Flow

```
interface ProfileSetup {
  basic_info: {
    business_name: string;
    category: string;
    location: LocationData;
    contact_info: ContactInfo;
  };
  services: {
    description: string;
    service_types: string[];
    service_areas: string[];
    starting_prices: PriceRange[];
  };
  portfolio: {
    hero_images: File[];
    gallery_images: File[];
    featured_work: FeaturedWork[];
  };
  business_details: {
    years_experience: number;
    team_size: number;
    insurance_info: InsuranceData;
    certifications: Certification[];
  };
}
```

### Multi-Step Creation Wizard

1. **Business Basics** (required)
    - Business name and category
    - Primary location and service radius
    - Contact information
2. **Service Details** (required)
    - Service description (500 char min)
    - Specific services offered
    - Starting price ranges
    - Availability preferences
3. **Portfolio Upload** (required)
    - Minimum 5 high-quality images
    - Auto-optimization for web
    - Alt text generation for SEO
4. **Business Verification** (optional)
    - Insurance certificates
    - Professional certifications
    - Social media links

## Critical Implementation Notes

### Image Handling

```
// Auto-optimize uploaded images
export async function processPortfolioImage(file: File): Promise<ProcessedImage> {
  return {
    thumbnail: await resizeImage(file, 300, 200),
    medium: await resizeImage(file, 800, 600),
    large: await resizeImage(file, 1200, 800),
    webp_formats: await convertToWebP(file),
    alt_text: await generateAltText(file),
    seo_filename: generateSEOFilename([file.name](http://file.name))
  };
}
```

### Validation Rules

- Business name: 3-100 characters, unique per location
- Description: 100-2000 characters, keyword density check
- Portfolio: 5-50 images, max 10MB each
- Location: Must be valid address with coordinates
- Price ranges: Logical min/max validation

### Draft Saving

```
// Auto-save every 30 seconds
export function useProfileAutoSave(profileData: ProfileSetup) {
  useEffect(() => {
    const interval = setInterval(() => {
      saveDraft(profileData);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [profileData]);
}
```

### Completion Scoring

- Basic Info: 30 points
- Service Details: 25 points
- Portfolio (5+ images): 25 points
- Business Verification: 20 points
- Total: 100 points (80+ required for visibility)