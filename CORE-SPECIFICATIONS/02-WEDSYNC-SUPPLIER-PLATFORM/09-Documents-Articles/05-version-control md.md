# 05-version-control.md

## What to Build

Document versioning system that tracks changes, allows rollback, and maintains history.

## Key Technical Requirements

### Version Tracking

```
interface DocumentVersion {
  id: string
  documentId: string
  version: number
  content: string
  metadata: {
    title: string
    changedBy: string
    changeNote?: string
    fileSize: number
  }
  createdAt: Date
}

// Create new version on save
const saveDocumentVersion = async (doc: Document) => {
  const lastVersion = await getLatestVersion([doc.id](http://doc.id))
  
  await supabase.from('document_versions').insert({
    document_id: [doc.id](http://doc.id),
    version: lastVersion.version + 1,
    content: doc.content,
    metadata: doc.metadata
  })
  
  // Keep only last 10 versions
  await pruneOldVersions([doc.id](http://doc.id), 10)
}
```

### Diff Visualization

```
const compareVersions = (v1: string, v2: string) => {
  const diff = createDiff(v1, v2)
  return {
    additions: diff.added,
    deletions: diff.removed,
    changes: diff.changed
  }
}
```

## Critical Implementation Notes

- Implement soft delete with version retention
- Compress old versions to save space
- Track who made changes for audit
- Allow version comparison UI

## Database Structure

```
CREATE TABLE document_versions (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  version INTEGER NOT NULL,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, version)
);
```