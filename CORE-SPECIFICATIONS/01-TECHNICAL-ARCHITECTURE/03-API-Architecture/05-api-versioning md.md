# 05-api-versioning.md

## Purpose

Ensure backward compatibility while allowing API evolution without breaking existing integrations.

## Versioning Approach

### URL Path Versioning

- Pattern: `/api/v1/`, `/api/v2/`
- Major versions only in URL
- Minor changes via feature flags

### Version Lifecycle

- **Current**: v1 (stable)
- **Deprecation notice**: 6 months minimum
- **Sunset period**: 12 months after deprecation
- **Legacy support**: Critical security fixes only

## Implementation Strategy

### Folder Structure

```
app/api/
├── v1/
│   ├── suppliers/
│   ├── forms/
│   └── clients/
└── v2/
    └── [future endpoints]
```

### Breaking Changes Definition

- Removing fields from responses
- Changing field types
- Modifying authentication requirements
- Altering rate limits significantly

### Non-Breaking Changes

- Adding new optional fields
- Adding new endpoints
- Increasing rate limits
- Performance improvements

## Migration Support

### Version Headers

- Accept: application/vnd.wedsync.v1+json
- Deprecation warnings in headers
- Sunset dates in documentation

### Client SDKs

- Maintain SDK versions aligned with API
- Auto-update notifications
- Migration guides with code examples

## Critical Considerations

- Always maintain v1 during initial growth phase
- Document all changes meticulously
- Provide migration tools for major versions
- Monitor version usage analytics
- Never break production without 6+ months notice