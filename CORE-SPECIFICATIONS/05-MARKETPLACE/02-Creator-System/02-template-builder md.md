# 02-template-builder.md

## What to Build

Visual tool for packaging forms, journeys, and email sequences into sellable template packages.

## Key Technical Requirements

### Template Packaging System

```
interface TemplatePackage {
  metadata: {
    title: string
    description: string
    vendorTypes: VendorType[]
    tags: string[]
    version: string
  }
  components: {
    forms?: FormTemplate[]
    journeys?: JourneyTemplate[]
    emails?: EmailTemplate[]
    documents?: DocumentTemplate[]
  }
  dependencies: {
    requiredFields: CoreField[]
    requiredIntegrations: string[]
    minimumTier: SubscriptionTier
  }
  pricing: {
    basePrice: number
    bundleDiscount?: number
    earlyBirdPrice?: number
  }
}
```

### Template Builder UI

```
class TemplateBuilder {
  private package: TemplatePackage = {
    metadata: {},
    components: {},
    dependencies: {},
    pricing: {}
  }
  
  async addForm(formId: string) {
    const form = await this.getForm(formId)
    
    // Sanitize sensitive data
    const sanitized = this.sanitizeForm(form)
    
    // Extract dependencies
    const deps = this.extractDependencies(form)
    
    this.package.components.forms.push(sanitized)
    this.package.dependencies.requiredFields.push(...deps.fields)
  }
  
  async addJourney(journeyId: string) {
    const journey = await this.getJourney(journeyId)
    
    // Include all referenced modules
    const modules = await this.resolveModules(journey)
    
    this.package.components.journeys.push({
      journey: this.sanitizeJourney(journey),
      modules
    })
  }
  
  generatePreview(): TemplatePreview {
    return {
      screenshots: this.captureScreenshots(),
      demoData: this.generateDemoData(),
      featureList: this.extractFeatures()
    }
  }
}
```

### Content Sanitization

```
class TemplateSanitizer {
  sanitizeForm(form: Form): FormTemplate {
    // Remove client-specific data
    const clean = structuredClone(form);
    
    // Replace with placeholders
    clean.fields = [clean.fields.map](http://clean.fields.map)(field => ({
      ...field,
      defaultValue: this.sanitizeValue(field.type),
      options: field.options?.map(opt => this.sanitizeOption(opt))
    }));
    
    // Remove client IDs and personal data
    delete clean.client_id;
    delete clean.supplier_specific_data;
    
    return clean;
  }
  
  sanitizeValue(fieldType: string): any {
    const placeholders = {
      'email': '[client@example.com](mailto:client@example.com)',
      'phone': '+44 7700 900000',
      'text': 'Sample text',
      'venue': 'The Venue Name',
      'date': new Date().toISOString()
    };
    
    return placeholders[fieldType] || '';
  }
}
```

### Version Control

```
class TemplateVersioning {
  async saveVersion(templateId: string, changes: TemplateChanges) {
    const currentVersion = await this.getCurrentVersion(templateId)
    
    const newVersion = {
      version: this.incrementVersion(currentVersion.version),
      changes,
      changelog: changes.description,
      createdAt: new Date()
    }
    
    await db.insert('template_versions', {
      template_id: templateId,
      ...newVersion
    })
    
    // Notify existing purchasers
    await this.notifyPurchasers(templateId, newVersion)
  }
  
  incrementVersion(current: string): string {
    const [major, minor, patch] = current.split('.').map(Number)
    return `${major}.${minor}.${patch + 1}`
  }
}
```

## Critical Implementation Notes

- Auto-save during template creation
- Preview mode with sample data
- Dependency validation before publishing
- Template testing in sandbox environment
- Bundle creation for related templates

## Database Structure

```
CREATE TABLE template_drafts (
  id UUID PRIMARY KEY,
  creator_id UUID,
  package_data JSONB,
  last_saved TIMESTAMPTZ DEFAULT NOW(),
  published BOOLEAN DEFAULT false
);

CREATE TABLE template_versions (
  id UUID PRIMARY KEY,
  template_id UUID,
  version TEXT,
  changelog TEXT,
  package_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE template_components (
  id UUID PRIMARY KEY,
  template_id UUID,
  component_type TEXT,
  component_id UUID,
  component_data JSONB
);
```