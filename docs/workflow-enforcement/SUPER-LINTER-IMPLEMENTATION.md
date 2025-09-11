# Super-Linter Implementation Guide for WedSync

## Overview

Super-Linter has been configured for the WedSync project to ensure code quality, consistency, and security across all codebases. This comprehensive linting solution validates over 50 programming languages and formats.

## Quick Start

### Running Locally

```bash
# Pull the Super-Linter Docker image
docker pull ghcr.io/super-linter/super-linter:latest

# Run Super-Linter locally (from project root)
docker run -e DEFAULT_BRANCH=main \
  -e RUN_LOCAL=true \
  -e VALIDATE_ALL_CODEBASE=false \
  -e FILTER_REGEX_EXCLUDE="(node_modules|\.next|coverage|build|dist)" \
  -v $(pwd):/tmp/lint \
  ghcr.io/super-linter/super-linter
```

### GitHub Actions Workflow

The Super-Linter runs automatically on:
- Push to `main`, `develop`, or `daily/*` branches
- Pull requests to `main`
- Manual workflow dispatch

## Enabled Linters

### Languages & Frameworks
- **TypeScript/JavaScript**: ESLint for .ts, .tsx, .js, .jsx files
- **CSS**: Stylelint for styling consistency
- **SQL**: SQLFluff for database queries
- **Markdown**: markdownlint for documentation
- **YAML**: yamllint for configuration files
- **JSON**: jsonlint for data files
- **Bash/Shell**: ShellCheck for script validation
- **Docker**: Hadolint for Dockerfile best practices

### Security & Quality
- **Gitleaks**: Detects secrets and credentials
- **Prettier**: Code formatting consistency
- **EditorConfig**: Coding style enforcement
- **GitHub Actions**: Workflow validation

## Configuration Files

All linter configurations are stored in `.github/linters/`:

```
.github/linters/
├── .eslintrc.json       # JavaScript/TypeScript rules
├── .markdown-lint.yml   # Markdown formatting
├── .prettierrc.json     # Code formatting
├── .stylelintrc.json    # CSS/SCSS rules
├── .sqlfluff            # SQL formatting
├── .gitleaks.toml       # Secret detection
├── .hadolint.yaml       # Docker best practices
├── .yamllint.yml        # YAML validation
└── .shellcheckrc        # Shell script checks
```

Root configuration:
```
.editorconfig            # Universal editor settings
```

## Key Configuration Details

### TypeScript/JavaScript (ESLint)
- Strict type checking enabled
- No explicit `any` types
- Unused variables must be prefixed with `_`
- Console statements limited to warnings/errors
- React 19 and Next.js 15 compatible

### Code Formatting (Prettier)
- 2-space indentation
- Single quotes for strings
- No semicolons
- Trailing commas (ES5)
- 100-character line width

### CSS (Stylelint)
- Tailwind CSS directives supported
- 2-space indentation
- Maximum nesting depth: 3 levels
- No ID selectors
- Lowercase hex colors

### SQL (SQLFluff)
- PostgreSQL dialect
- UPPERCASE keywords
- lowercase identifiers
- 2-space indentation
- 120-character line limit

### Security (Gitleaks)
Custom rules for:
- Stripe API keys
- Supabase keys
- OpenAI tokens
- Twilio credentials
- Database URLs
- JWT secrets

### Docker (Hadolint)
- No root user
- Specific version tags required
- Health checks recommended
- Multi-stage builds supported

## Exclusions & Filters

The following are excluded from linting:
- `node_modules/`
- `.next/`
- `coverage/`
- `build/`, `dist/`, `out/`
- `playwright-report/`
- `test-results/`
- `.git/`, `.husky/`

## Workflow Behavior

### On Pull Requests
- Validates only changed files
- Posts individual status for each linter
- Uploads results as artifacts
- Comments on PR with issues

### On Main Branch Push
- Validates entire codebase
- Ensures production quality

### Manual Trigger
- Available via GitHub Actions UI
- Useful for testing configuration changes

## Local Development

### Pre-commit Hook Setup (Optional)

```bash
# Install pre-commit
npm install -g @commitlint/cli husky

# Initialize husky
npx husky init

# Add pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
npm run lint
npm run typecheck
EOF

chmod +x .husky/pre-commit
```

### VS Code Integration

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.fixAll.stylelint": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "css.validate": false,
  "stylelint.enable": true,
  "stylelint.validate": ["css", "scss"]
}
```

## Testing the Configuration

### 1. Test Workflow Locally

```bash
# Use act to test GitHub Actions locally
brew install act  # macOS
act -j lint --secret-file .env.local
```

### 2. Validate Individual Linters

```bash
# ESLint
npm run lint

# TypeScript
npm run typecheck

# Prettier check
npx prettier --check .

# Stylelint
npx stylelint "**/*.css"

# Markdown
npx markdownlint "**/*.md"

# SQL
sqlfluff lint wedsync/supabase/migrations/

# Secrets scan
docker run --rm -v $(pwd):/path zricethezav/gitleaks:latest detect --source="/path" --verbose
```

### 3. Fix Issues Automatically

```bash
# ESLint fix
npm run lint -- --fix

# Prettier format
npx prettier --write .

# Stylelint fix
npx stylelint "**/*.css" --fix

# SQL format
sqlfluff fix wedsync/supabase/migrations/
```

## Common Issues & Solutions

### Issue: Linter fails on generated files
**Solution**: Add path to `FILTER_REGEX_EXCLUDE` in workflow

### Issue: False positive secret detection
**Solution**: Add pattern to allowlist in `.gitleaks.toml`

### Issue: Conflicting formatting rules
**Solution**: Ensure Prettier runs last in the chain

### Issue: Workflow takes too long
**Solution**: Increase `PARALLEL_JOBS` or use the slim variant

## Performance Optimization

1. **Use Slim Variant** for faster runs:
   ```yaml
   uses: super-linter/super-linter/slim@v8.0.0
   ```

2. **Validate Only Changed Files** on PRs:
   ```yaml
   VALIDATE_ALL_CODEBASE: false
   VALIDATE_NEW_FILES: true
   ```

3. **Increase Parallel Jobs**:
   ```yaml
   PARALLEL_JOBS: 8
   ```

## Monitoring & Metrics

- **GitHub Actions**: Check workflow runs at Actions tab
- **Status Badges**: Add to README for visibility
- **Artifacts**: Download linter logs from workflow runs
- **PR Comments**: Review inline feedback on pull requests

## Gradual Adoption Strategy

1. **Phase 1** (Current): Error reporting only
2. **Phase 2**: Enable auto-fixing on PRs
3. **Phase 3**: Block merges on linting failures
4. **Phase 4**: Enable advanced checks (JSCPD, spell check)

## Maintenance

### Updating Linter Versions

```yaml
# In .github/workflows/super-linter.yml
uses: super-linter/super-linter@v8.0.0  # Update version here
```

### Adding New Linters

1. Add configuration file to `.github/linters/`
2. Enable in workflow with `VALIDATE_<LANGUAGE>: true`
3. Test locally before pushing
4. Document in this guide

## Resources

- [Super-Linter Documentation](https://github.com/super-linter/super-linter)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [Stylelint Rules](https://stylelint.io/user-guide/rules/)
- [SQLFluff Rules](https://docs.sqlfluff.com/en/stable/rules.html)
- [Gitleaks Configuration](https://github.com/zricethezav/gitleaks)

## Support

For issues or questions:
1. Check workflow logs in GitHub Actions
2. Review linter-specific documentation
3. Create an issue with the `linting` label
4. Tag @devops-team for urgent issues