#!/bin/bash
# WedSync Bulletproof Docker Setup Script
# Handles dependency issues and cross-platform compatibility

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to detect platform
detect_platform() {
    if command -v apk > /dev/null 2>&1; then
        echo "alpine"
    elif command -v apt-get > /dev/null 2>&1; then
        echo "debian"
    elif command -v yum > /dev/null 2>&1; then
        echo "rhel"
    else
        echo "unknown"
    fi
}

# Install system dependencies based on platform
install_system_deps() {
    local platform=$(detect_platform)
    log "Installing system dependencies for platform: $platform"
    
    case $platform in
        "alpine")
            apk update
            apk add --no-cache \
                python3 py3-pip make g++ \
                cairo-dev jpeg-dev pango-dev giflib-dev pixman-dev \
                curl git bash procps htop \
                pkgconfig libffi-dev \
                && success "Alpine dependencies installed"
            ;;
        "debian")
            apt-get update
            apt-get install -y \
                python3 python3-pip build-essential \
                libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev libpixman-1-dev \
                curl git bash procps htop \
                pkg-config libffi-dev \
                && success "Debian dependencies installed"
            ;;
        "rhel")
            yum update -y
            yum install -y \
                python3 python3-pip gcc gcc-c++ make \
                cairo-devel libjpeg-devel pango-devel giflib-devel pixman-devel \
                curl git bash procps-ng htop \
                pkgconfig libffi-devel \
                && success "RHEL dependencies installed"
            ;;
        *)
            warning "Unknown platform - skipping system dependency installation"
            ;;
    esac
}

# Clean problematic files and dependencies
clean_problematic_deps() {
    log "Cleaning problematic dependencies..."
    
    # Remove package-lock.json if it exists (prevents version conflicts)
    if [ -f package-lock.json ]; then
        rm -f package-lock.json
        success "Removed package-lock.json to prevent version conflicts"
    fi
    
    # Clean npm cache
    if command -v npm > /dev/null 2>&1; then
        npm cache clean --force 2>/dev/null || warning "Could not clean npm cache"
    fi
    
    # Remove problematic node_modules if they exist
    if [ -d node_modules ]; then
        log "Backing up and cleaning node_modules..."
        rm -rf node_modules.backup 2>/dev/null || true
        mv node_modules node_modules.backup 2>/dev/null || rm -rf node_modules
        success "Cleaned node_modules directory"
    fi
}

# Setup Next.js configuration
setup_nextjs_config() {
    log "Setting up Next.js configuration..."
    
    # Use bulletproof config if it exists, otherwise use simple config
    if [ -f next.config.bulletproof.js ]; then
        cp next.config.bulletproof.js next.config.js
        success "Using bulletproof Next.js config"
    elif [ -f next.config.simple.js ]; then
        cp next.config.simple.js next.config.js
        success "Using simple Next.js config"
    else
        warning "No bulletproof or simple config found - using existing config"
    fi
}

# Create package.json without problematic dependencies
create_clean_package_json() {
    log "Checking package.json for problematic dependencies..."
    
    # List of problematic packages that cause Docker build failures
    local problematic_packages=(
        "@tensorflow/tfjs"
        "@tensorflow/tfjs-node" 
        "bullmq"
        "ioredis"
        "hiredis"
        "canvas"
        "puppeteer"
        "playwright"
        "sharp"
    )
    
    # Check if any problematic packages exist
    local found_issues=false
    for package in "${problematic_packages[@]}"; do
        if grep -q "\"$package\"" package.json 2>/dev/null; then
            warning "Found problematic dependency: $package"
            found_issues=true
        fi
    done
    
    if [ "$found_issues" = true ]; then
        warning "Problematic dependencies detected. Consider removing them for stable Docker builds."
        log "You can create a package.json.docker without these dependencies"
    else
        success "No problematic dependencies detected"
    fi
}

# Install Node.js dependencies with error handling
install_node_deps() {
    log "Installing Node.js dependencies..."
    
    # Set npm configuration for better Docker compatibility
    npm config set audit false
    npm config set fund false
    npm config set optional false
    
    # Try different installation strategies
    local install_success=false
    
    # Strategy 1: Standard install with legacy peer deps
    log "Attempting standard npm install..."
    if npm install --legacy-peer-deps --no-audit --progress=true; then
        install_success=true
        success "Standard npm install succeeded"
    else
        warning "Standard npm install failed, trying alternative methods..."
    fi
    
    # Strategy 2: Install without optional dependencies
    if [ "$install_success" = false ]; then
        log "Attempting install without optional dependencies..."
        if npm install --legacy-peer-deps --no-optional --no-audit; then
            install_success=true
            success "Install without optional dependencies succeeded"
        fi
    fi
    
    # Strategy 3: Install with force flag
    if [ "$install_success" = false ]; then
        log "Attempting force install..."
        if npm install --force --legacy-peer-deps --no-audit; then
            install_success=true
            success "Force install succeeded"
        fi
    fi
    
    if [ "$install_success" = false ]; then
        error "All npm install strategies failed"
        exit 1
    fi
    
    # Audit fix (optional)
    log "Running npm audit fix..."
    npm audit fix --legacy-peer-deps || warning "npm audit fix failed (not critical)"
}

# Health check function
health_check() {
    log "Performing health checks..."
    
    # Check if node_modules exists
    if [ -d node_modules ]; then
        success "node_modules directory exists"
    else
        error "node_modules directory missing"
        return 1
    fi
    
    # Check if key packages are installed
    local key_packages=("next" "react" "react-dom")
    for package in "${key_packages[@]}"; do
        if [ -d "node_modules/$package" ]; then
            success "$package is installed"
        else
            error "$package is missing"
            return 1
        fi
    done
    
    # Check if Next.js config exists
    if [ -f next.config.js ]; then
        success "Next.js config exists"
    else
        warning "Next.js config missing"
    fi
    
    success "All health checks passed"
}

# Optimize for Docker performance
optimize_for_docker() {
    log "Optimizing for Docker performance..."
    
    # Set Node.js memory limits
    export NODE_OPTIONS="--max-old-space-size=6144 --max-semi-space-size=1024"
    
    # Create .dockerignore if it doesn't exist
    if [ ! -f .dockerignore ]; then
        cat > .dockerignore << EOF
node_modules
.next
.git
.env.local
.env.*.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
*.tsbuildinfo
Dockerfile*
docker-compose*
README.md
.gitignore
.eslintrc.json
.prettierrc
coverage
.nyc_output
test-results
playwright-report
EOF
        success "Created optimized .dockerignore"
    fi
    
    # Create logs directory
    mkdir -p logs
    success "Created logs directory"
}

# Main execution
main() {
    log "Starting WedSync Bulletproof Docker Setup"
    log "============================================"
    
    # Pre-flight checks
    log "Performing pre-flight checks..."
    if [ ! -f package.json ]; then
        error "package.json not found - are you in the right directory?"
        exit 1
    fi
    
    # Execute setup steps
    install_system_deps
    clean_problematic_deps
    setup_nextjs_config
    create_clean_package_json
    install_node_deps
    optimize_for_docker
    health_check
    
    log "============================================"
    success "WedSync Bulletproof Docker Setup Complete!"
    log "You can now start the development server with:"
    log "  npm run dev -- --hostname 0.0.0.0 --port 3000"
    log "Or use Docker Compose:"
    log "  docker-compose -f docker-compose.bulletproof.yml up"
}

# Run main function
main "$@"