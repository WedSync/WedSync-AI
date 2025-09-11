# 01-vercel-deployment.md

# Vercel Deployment Configuration

## Purpose

Deploy Next.js application with optimal performance, automatic scaling, and preview deployments.

## Deployment Strategy

### Project Structure

```
- wedsync-app (supplier platform)
- wedme-app (couple platform)
- Shared monorepo with packages/
```

### Environment Configuration

```
# Production
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
RESEND_API_KEY
UPSTASH_REDIS_URL

# Staging (preview deployments)
NEXT_PUBLIC_APP_ENV=staging
```

## Build Configuration

### Build Settings

```json
{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install",
  "nodeVersion": "20.x"
}
```

### Function Configuration

- **Region**: us-east-1 (primary), eu-west-1 (secondary)
- **Max Duration**: 60 seconds (Pro plan)
- **Memory**: 1024 MB for API routes
- **Edge Functions**: For auth middleware

## Performance Optimization

### Image Optimization

- Use Vercel Image Optimization
- WebP format with fallbacks
- Responsive image sizing
- CDN caching for 31 days

### Caching Strategy

- Static pages: 31 days CDN cache
- API routes: Cache-Control headers
- ISR: Revalidate every 60 seconds for dynamic content
- Edge caching for geographic distribution

## Domain Configuration

### Production Domains

- [wedsync.app](http://wedsync.app) (supplier platform)
- [wedme.app](http://wedme.app) (couple platform)
- [api.wedsync.app](http://api.wedsync.app) (API endpoints)

### SSL/Security

- Automatic SSL certificates
- Force HTTPS redirect
- HSTS headers enabled
- Security headers via next.config.js

## Deployment Pipeline

### Branch Strategy

- main → production
- staging → preview environment
- feature/* → preview deployments

### Preview Deployments

- Automatic for all PRs
- Unique URLs per deployment
- Comments on GitHub with preview links
- Automatic cleanup after merge

## Monitoring Integration

### Analytics

- Vercel Analytics for Web Vitals
- Real User Monitoring (RUM)
- Custom events for conversion tracking

### Error Tracking

- Sentry integration for error monitoring
- Source maps for debugging
- User session replay for errors

## Critical Considerations

- Set spending limits to prevent overages
- Configure DDoS protection
- Enable Web Application Firewall (WAF)
- Set up alerting for function errors
- Regular review of function logs for optimization