#!/bin/bash

# WedSync Demo Mode Setup Script
# Comprehensive setup, validation, and testing for demo mode

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Demo configuration
DEMO_PERSONAS=(
  "photographer-everlight"
  "videographer-silver-lining"
  "dj-sunset-sounds"
  "florist-petal-stem"
  "caterer-taste-thyme"
  "musicians-velvet-strings"
  "venue-old-barn"
  "hair-glow-hair"
  "makeup-bloom-makeup"
  "planner-plan-poise"
  "couple-sarah-michael"
  "admin-wedsync"
)

# Helper functions
print_header() {
  echo -e "${PURPLE}================================${NC}"
  echo -e "${PURPLE}  WedSync Demo Mode Setup${NC}"
  echo -e "${PURPLE}================================${NC}"
  echo ""
}

print_step() {
  echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
  print_step "Checking prerequisites..."
  
  # Check Node.js
  if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
  fi
  print_success "Node.js found: $(node --version)"
  
  # Check npm
  if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
  fi
  print_success "npm found: $(npm --version)"
  
  # Check Supabase CLI
  if ! command -v supabase &> /dev/null; then
    print_warning "Supabase CLI not found - some database operations may not work"
  else
    print_success "Supabase CLI found: $(supabase --version)"
  fi
  
  # Check if we're in the right directory
  if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
  fi
  
  # Check for demo mode environment
  if [ -z "$NEXT_PUBLIC_DEMO_MODE" ]; then
    print_warning "NEXT_PUBLIC_DEMO_MODE not set - setting it now"
    export NEXT_PUBLIC_DEMO_MODE=true
  fi
  
  echo ""
}

# Install dependencies
install_dependencies() {
  print_step "Installing dependencies..."
  
  if npm ci --silent; then
    print_success "Dependencies installed"
  else
    print_error "Failed to install dependencies"
    exit 1
  fi
  
  echo ""
}

# Setup database
setup_database() {
  print_step "Setting up demo database..."
  
  # Apply demo migrations
  if npm run db:migrate:demo --silent; then
    print_success "Demo migrations applied"
  else
    print_warning "Demo migrations may have failed - check Supabase connection"
  fi
  
  # Seed demo data
  if npm run db:seed:demo --silent; then
    print_success "Demo data seeded"
  else
    print_warning "Demo seeding may have failed - check database connection"
  fi
  
  echo ""
}

# Check demo assets
check_assets() {
  print_step "Checking demo assets..."
  
  # Check main directories exist
  if [ ! -d "public/demo" ]; then
    print_error "Demo assets directory not found"
    mkdir -p public/demo/{logos,avatars,portfolio}
    print_success "Created demo assets directories"
  fi
  
  # Check for main logo sprite
  if [ -f "public/demo/logos/supplier-logos.png" ]; then
    print_success "Supplier logos found"
  else
    print_error "Supplier logos not found at public/demo/logos/supplier-logos.png"
  fi
  
  # Check for couple avatars
  if [ -f "public/demo/avatars/couple-sarah-michael.png" ]; then
    print_success "Couple avatars found"
  else
    print_error "Couple avatars not found at public/demo/avatars/couple-sarah-michael.png"
  fi
  
  echo ""
}

# Validate demo configuration
validate_config() {
  print_step "Validating demo configuration..."
  
  # Check if demo files exist
  local demo_files=(
    "src/lib/demo/config.ts"
    "src/lib/demo/auth-provider.tsx"
    "src/lib/demo/brand-assets.ts"
    "src/lib/demo/screenshot-helpers.ts"
    "src/app/demo/page.tsx"
  )
  
  for file in "${demo_files[@]}"; do
    if [ -f "$file" ]; then
      print_success "Found: $file"
    else
      print_error "Missing: $file"
    fi
  done
  
  echo ""
}

# Run tests
run_tests() {
  print_step "Running demo tests..."
  
  # TypeScript compilation check
  if npm run demo:typecheck --silent; then
    print_success "TypeScript compilation passed"
  else
    print_error "TypeScript compilation failed"
  fi
  
  # Linting check
  if npm run demo:lint --silent; then
    print_success "Linting passed"
  else
    print_warning "Linting issues found"
  fi
  
  # Unit tests (if they exist)
  if [ -d "src/__tests__/demo" ]; then
    if npm run demo:test --silent; then
      print_success "Demo tests passed"
    else
      print_warning "Some demo tests failed"
    fi
  else
    print_warning "No demo tests found - consider creating them"
  fi
  
  echo ""
}

# Build application
build_app() {
  print_step "Building application in demo mode..."
  
  if npm run demo:build --silent; then
    print_success "Demo build completed successfully"
  else
    print_error "Demo build failed"
    exit 1
  fi
  
  echo ""
}

# Generate demo URLs
generate_urls() {
  print_step "Generating demo URLs..."
  
  echo -e "${BLUE}Demo Personas:${NC}"
  for persona in "${DEMO_PERSONAS[@]}"; do
    echo "  - http://localhost:3000/demo?persona=$persona"
  done
  
  echo ""
  echo -e "${BLUE}Special URLs:${NC}"
  echo "  - Demo Selector: http://localhost:3000/demo"
  echo "  - Screenshot Mode: http://localhost:3000/demo?screenshot=1"
  echo "  - Auto Screenshot: http://localhost:3000/demo?persona=photographer-everlight&screenshot=1"
  
  echo ""
}

# Start development server
start_dev() {
  print_step "Starting development server..."
  
  echo -e "${GREEN}🚀 Starting WedSync in Demo Mode...${NC}"
  echo -e "${BLUE}   Visit: http://localhost:3000/demo${NC}"
  echo ""
  echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
  echo ""
  
  npm run demo:dev
}

# Print usage
print_usage() {
  echo "WedSync Demo Setup Script"
  echo ""
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  --full          Run complete setup (default)"
  echo "  --quick         Quick setup (skip tests and build)"
  echo "  --validate-only Validate configuration only"
  echo "  --urls-only     Generate demo URLs only"
  echo "  --build-only    Build in demo mode only"
  echo "  --dev           Start development server after setup"
  echo "  --reset         Reset demo data before setup"
  echo "  --help          Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0                    # Full setup"
  echo "  $0 --quick --dev      # Quick setup and start dev server"
  echo "  $0 --reset --dev      # Reset data and start fresh"
  echo "  $0 --urls-only        # Just show demo URLs"
}

# Main execution
main() {
  local mode="full"
  local start_dev_server=false
  local reset_data=false
  
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      --full)
        mode="full"
        shift
        ;;
      --quick)
        mode="quick"
        shift
        ;;
      --validate-only)
        mode="validate"
        shift
        ;;
      --urls-only)
        mode="urls"
        shift
        ;;
      --build-only)
        mode="build"
        shift
        ;;
      --dev)
        start_dev_server=true
        shift
        ;;
      --reset)
        reset_data=true
        shift
        ;;
      --help)
        print_usage
        exit 0
        ;;
      *)
        print_error "Unknown option: $1"
        print_usage
        exit 1
        ;;
    esac
  done
  
  print_header
  
  # Set demo mode
  export NEXT_PUBLIC_DEMO_MODE=true
  
  # Reset data if requested
  if [ "$reset_data" = true ]; then
    print_step "Resetting demo data..."
    npm run demo:reset --silent
    print_success "Demo data reset"
    echo ""
  fi
  
  # Execute based on mode
  case $mode in
    full)
      check_prerequisites
      install_dependencies
      setup_database
      check_assets
      validate_config
      run_tests
      build_app
      generate_urls
      ;;
    quick)
      check_prerequisites
      setup_database
      check_assets
      validate_config
      generate_urls
      ;;
    validate)
      check_prerequisites
      check_assets
      validate_config
      ;;
    urls)
      generate_urls
      exit 0
      ;;
    build)
      check_prerequisites
      build_app
      ;;
  esac
  
  # Start development server if requested
  if [ "$start_dev_server" = true ]; then
    start_dev
  else
    echo -e "${GREEN}🎉 Demo setup completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "  1. Run: npm run demo:dev"
    echo "  2. Visit: http://localhost:3000/demo"
    echo "  3. Choose a demo persona to explore"
    echo ""
    echo -e "${YELLOW}For screenshot mode, add &screenshot=1 to any demo URL${NC}"
  fi
}

# Run main function with all arguments
main "$@"