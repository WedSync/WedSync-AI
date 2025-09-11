# 04-shared-resources.md

## What to Build

Centralized repository for documents, images, and files shared between couples and suppliers, with version control and access management.

## Key Technical Requirements

### Resource Management

```
interface SharedResource {
  id: string;
  couple_id: string;
  supplier_id?: string; // null if couple uploaded
  resource_type: 'document' | 'image' | 'spreadsheet' | 'contract' | 'inspiration';
  metadata: {
    filename: string;
    size: number;
    mime_type: string;
    uploaded_by: string;
    uploaded_at: Date;
    version: number;
  };
  permissions: {
    view: string[]; // supplier_ids or 'all'
    download: string[];
    comment: string[];
  };
  tags: string[];
  folder?: string;
}
```

### UI Features

- Folder structure for organization
- Thumbnail previews for images
- Document viewer (PDF, DOCX)
- Version history with rollback
- Commenting system on resources
- Bulk upload with drag-and-drop
- Share permissions matrix

## Critical Implementation Notes

- 10MB file size limit per file
- Automatic image optimization
- Virus scanning for uploads
- Supabase Storage integration
- Generate shareable links with expiry
- Mobile document scanner integration

## Storage Implementation

```
// Supabase Storage bucket structure
const uploadResource = async (file: File, metadata: ResourceMetadata) => {
  const path = `couples/${coupleId}/resources/${metadata.folder}/${[file.name](http://file.name)}`;
  
  const { data, error } = await [supabase.storage](http://supabase.storage)
    .from('shared-resources')
    .upload(path, file, {
      upsert: false,
      metadata
    });
    
  return data;
};
```