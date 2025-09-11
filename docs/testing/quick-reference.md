# WedSync Testing Quick Reference
*Essential commands and troubleshooting for daily development*

## 🚀 Quick Commands

### Essential Test Commands
```bash
# Basic test suite
npm run test                    # All unit tests
npm run test:watch             # Watch mode
npm run test:coverage          # With coverage report

# Specific test types
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests
npm run test:e2e              # End-to-end tests
npm run test:visual           # Visual regression
npm run test:performance      # Performance tests
npm run test:security         # Security tests
npm run test:accessibility    # Accessibility tests

# Advanced testing
npm run test:ai-generate      # AI test generation
npm run test:cross-platform   # Cross-platform testing
npm run test:all              # Complete test suite
```

### Development Workflow
```bash
# Before starting work
npm run health:check          # System health
npm run test:quick           # Quick validation

# During development  
npm run test:watch           # Live testing
npm run test:debug          # Debug mode

# Before committing
npm run test:pre-commit     # Pre-commit validation
npm run lint                # Code linting
npm run typecheck          # TypeScript validation

# Before deployment
npm run test:ci             # CI simulation
npm run test:production     # Production readiness
```

## 🧪 Wedding-Specific Commands

### Wedding Scenario Testing
```bash
# Test specific wedding types
npm run test:scenario -- --type=classic
npm run test:scenario -- --type=intimate  
npm run test:scenario -- --type=destination

# Test wedding phases
npm run test:phase -- --phase=planning
npm run test:phase -- --phase=preparation
npm run test:phase -- --phase=day-of
npm run test:phase -- --phase=post-wedding

# Test critical workflows
npm run test:workflow -- --workflow=rsvp
npm run test:workflow -- --workflow=vendor-booking
npm run test:workflow -- --workflow=timeline
```

### Wedding Day Testing
```bash
# Wedding day simulation
npm run test:wedding-day     # Full wedding day test
npm run test:load-spike     # Guest traffic spike
npm run test:vendor-coord   # Vendor coordination
npm run test:real-time     # Real-time features
```

## 📊 Monitoring & Quality

### Quality Metrics
```bash
# Quality dashboard
npm run monitor:dashboard    # Start dashboard
npm run monitor:status      # Current status
npm run monitor:alerts     # Active alerts

# Quality reports
npm run report:quality      # Generate quality report
npm run report:coverage     # Coverage report
npm run report:performance  # Performance report
npm run report:security     # Security report
```

### Health Checks
```bash
# System health
npm run health:full         # Complete health check
npm run health:db          # Database connectivity
npm run health:services    # External services
npm run health:wedding     # Wedding-specific systems
```

## 🔧 Troubleshooting

### Common Issues & Solutions

#### Test Failures
```bash
# Flaky tests
npm run test:stability      # Stability testing
npm run test:retry         # Retry failed tests
npm run test:isolate       # Run in isolation

# Performance issues
npm run test:perf-debug    # Performance debugging
npm run test:memory        # Memory usage analysis
npm run test:profile       # Performance profiling
```

#### Visual Test Issues
```bash
# Visual regression failures
npm run test:visual -- --update-snapshots  # Update baselines
npm run test:visual -- --debug             # Debug mode
npm run test:visual -- --threshold=0.1     # Adjust threshold
```

#### Cross-Platform Issues
```bash
# BrowserStack problems
npm run test:browserstack-check    # Check connection
npm run test:local-browsers       # Use local browsers
npm run test:device-specific      # Test specific device
```

#### AI Test Generation Issues
```bash
# AI test problems
npm run test:ai -- --verbose      # Verbose output
npm run test:ai -- --retrain      # Retrain models
npm run test:ai -- --manual       # Manual review mode
```

## 🎯 Debugging Commands

### Debug Modes
```bash
# Interactive debugging
npm run test:debug -- --inspect      # Node inspector
npm run test:debug -- --headed       # Show browser
npm run test:debug -- --slow-mo      # Slow motion

# Verbose output
npm run test -- --verbose           # Detailed output
npm run test -- --reporter=verbose  # Verbose reporter
npm run test -- --bail             # Stop on first failure
```

### Log Analysis
```bash
# View logs
npm run logs:test          # Test logs
npm run logs:monitor       # Monitor logs
npm run logs:error         # Error logs only

# Log analysis
npm run analyze:logs       # Analyze log patterns
npm run analyze:errors     # Error analysis
npm run analyze:performance # Performance analysis
```

## ⚡ Performance Shortcuts

### Fast Testing
```bash
# Quick validation (< 2 minutes)
npm run test:quick

# Changed files only
npm run test:changed

# Specific file
npm run test -- path/to/test.spec.ts

# Specific test pattern
npm run test -- --grep "RSVP"
```

### Parallel Testing
```bash
# Run tests in parallel
npm run test:parallel      # Parallel execution
npm run test:workers=4     # Specific worker count
npm run test:max-parallel  # Maximum parallelization
```

## 🚨 Emergency Commands

### Production Issues
```bash
# Emergency health check
npm run emergency:check

# Quick validation
npm run emergency:test

# Performance emergency
npm run emergency:performance

# Security emergency
npm run emergency:security
```

### Rollback Testing
```bash
# Test rollback scenarios
npm run test:rollback      # Rollback validation
npm run test:backup        # Backup system test
npm run test:failover      # Failover testing
```

## 📱 Mobile & Cross-Platform

### Mobile Testing
```bash
# Mobile-specific tests
npm run test:mobile        # Mobile tests
npm run test:ios          # iOS specific
npm run test:android      # Android specific
npm run test:responsive   # Responsive design
```

### Browser Testing
```bash
# Browser-specific tests
npm run test:chrome       # Chrome only
npm run test:firefox      # Firefox only
npm run test:safari       # Safari only
npm run test:edge         # Edge only
```

## 🔍 Analysis & Reporting

### Coverage Analysis
```bash
# Coverage reports
npm run coverage:html      # HTML report
npm run coverage:json     # JSON report
npm run coverage:lcov     # LCOV format
npm run coverage:text     # Text summary
```

### Performance Analysis
```bash
# Performance metrics
npm run perf:vitals       # Core Web Vitals
npm run perf:lighthouse   # Lighthouse audit
npm run perf:bundle      # Bundle analysis
npm run perf:memory      # Memory profiling
```

## 🔐 Security Testing

### Security Commands
```bash
# Security scans
npm run security:scan     # Full security scan
npm run security:owasp    # OWASP Top 10
npm run security:deps     # Dependency scan
npm run security:secrets  # Secrets detection
```

### Vulnerability Testing
```bash
# Penetration testing
npm run security:pentest  # Automated pentest
npm run security:auth     # Authentication tests
npm run security:data     # Data protection tests
```

## 📈 Quality Gates

### Quality Validation
```bash
# Quality gate checks
npm run quality:check     # Overall quality check
npm run quality:score     # Quality score
npm run quality:report    # Detailed report
```

### Deployment Readiness
```bash
# Pre-deployment checks
npm run deploy:check      # Deployment readiness
npm run deploy:validate   # Validation suite
npm run deploy:simulate   # Deployment simulation
```

## ⚙️ Configuration

### Environment Setup
```bash
# Setup commands
npm run setup:test        # Test environment setup
npm run setup:db         # Database setup
npm run setup:services   # Services setup
```

### Reset & Cleanup
```bash
# Cleanup commands
npm run clean:test        # Clean test artifacts
npm run clean:coverage    # Clean coverage reports
npm run clean:cache      # Clean test cache
npm run reset:db         # Reset test database
```

## 🎉 Wedding Test Data

### Sample Wedding Data
```bash
# Generate test data
npm run data:generate -- --type=classic
npm run data:generate -- --type=intimate
npm run data:generate -- --type=destination

# Load test scenarios
npm run data:load -- --scenario=last-minute-changes
npm run data:load -- --scenario=vendor-delays
npm run data:load -- --scenario=weather-emergency
```

## 📞 Help & Support

### Documentation
```bash
# View documentation
npm run docs:serve        # Serve docs locally
npm run docs:test         # Test documentation
npm run docs:generate     # Generate fresh docs
```

### Help Commands
```bash
npm run help:test         # Test help
npm run help:commands     # Available commands
npm run help:wedding      # Wedding-specific help
```

---

## 🏷️ Test Tags & Filtering

Use these tags to run specific test categories:

```bash
# By priority
npm run test -- --grep "@critical"
npm run test -- --grep "@high"
npm run test -- --grep "@medium"

# By feature
npm run test -- --grep "@rsvp"
npm run test -- --grep "@timeline"
npm run test -- --grep "@vendor"
npm run test -- --grep "@photo"

# By user type
npm run test -- --grep "@couple"
npm run test -- --grep "@guest"
npm run test -- --grep "@vendor"
npm run test -- --grep "@admin"

# By wedding phase
npm run test -- --grep "@planning"
npm run test -- --grep "@preparation"
npm run test -- --grep "@day-of"
npm run test -- --grep "@post-wedding"
```

## ⌨️ Keyboard Shortcuts

When running interactive test modes:

- `a` - Run all tests
- `f` - Run only failed tests
- `o` - Run only tests related to changed files
- `p` - Filter by file name pattern
- `t` - Filter by test name pattern
- `q` - Quit watch mode
- `Enter` - Trigger a test run

## 🚀 Productivity Tips

1. **Use watch mode** during development: `npm run test:watch`
2. **Focus on specific tests** while debugging: `npm run test -- --grep "your test"`
3. **Run quick checks** before commits: `npm run test:quick`
4. **Use parallel execution** for full test suites: `npm run test:parallel`
5. **Generate coverage reports** regularly: `npm run test:coverage`
6. **Keep tests wedding-focused** with realistic scenarios
7. **Use AI generation** for comprehensive coverage: `npm run test:ai-generate`

---

**Quick Reference Version**: 2.0  
**Last Updated**: 2025-08-28  
**Next Update**: 2025-09-28