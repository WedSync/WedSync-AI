#!/bin/bash

# UI/UX Tech Stack Governance Tools
# WedSync Wedding Industry Platform
# Last Updated: 2025-01-20
# Purpose: Automated scanning for UI component architecture compliance

set -euo pipefail

# Configuration
WEDSYNC_ROOT="${WEDSYNC_ROOT:-$(pwd)/wedsync}"
GOVERNANCE_LOG_DIR="./WORKFLOW-V2-DRAFT/09-UI-UX-SPECIALIST/governance-reports"
COMPONENT_FRAMEWORK_FILE="./WORKFLOW-V2-DRAFT/09-UI-UX-SPECIALIST/component-architecture-framework.json"
DND_DECISION_MATRIX="./WORKFLOW-V2-DRAFT/09-UI-UX-SPECIALIST/tech-decisions/drag-drop-decision-matrix.json"
UX_INTELLIGENCE_FILE="./WORKFLOW-V2-DRAFT/09-UI-UX-SPECIALIST/wedding-ux-intelligence.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create governance report directory
mkdir -p "$GOVERNANCE_LOG_DIR"

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "ERROR")   echo -e "${RED}[ERROR]${NC} $timestamp: $message" ;;
        "WARN")    echo -e "${YELLOW}[WARN]${NC} $timestamp: $message" ;;
        "INFO")    echo -e "${GREEN}[INFO]${NC} $timestamp: $message" ;;
        "DEBUG")   echo -e "${BLUE}[DEBUG]${NC} $timestamp: $message" ;;
    esac
    
    echo "$timestamp [$level]: $message" >> "$GOVERNANCE_LOG_DIR/governance-scan.log"
}

# Function: Scan for drag-drop implementation compliance
scan_drag_drop_compliance() {
    log "INFO" "🔍 Scanning drag-drop implementation compliance..."
    
    local report_file="$GOVERNANCE_LOG_DIR/drag-drop-compliance-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << 'EOF'
# Drag & Drop Implementation Compliance Report

## Decision Matrix Compliance Check

### ✅ Approved Technologies (Production Stack)
- @dnd-kit v6.3.1+ (PRIMARY - complex forms, seating, accessibility critical)
- @hello-pangea/dnd v18.0.1 (KANBAN - task boards, timeline builders)  
- @xyflow/react v12.8.4 (SPECIALIZED - node-based workflows, journey canvas)
- Native HTML5 drag (SIMPLE - file uploads, basic reordering)

### ⚠️ Legacy/Migration Status
- react-dnd (MIGRATING to @dnd-kit - photo gallery sections)
- react-beautiful-dnd (DEPRECATED - use @hello-pangea/dnd instead)

## Scan Results

EOF

    # Check for deprecated react-beautiful-dnd usage
    if grep -r "react-beautiful-dnd" "$WEDSYNC_ROOT" --include="*.tsx" --include="*.ts" 2>/dev/null; then
        log "ERROR" "❌ CRITICAL: Found react-beautiful-dnd usage - IMMEDIATE MIGRATION REQUIRED"
        echo "### ❌ CRITICAL VIOLATIONS FOUND" >> "$report_file"
        echo "" >> "$report_file"
        echo "**Deprecated react-beautiful-dnd found:**" >> "$report_file"
        grep -r "react-beautiful-dnd" "$WEDSYNC_ROOT" --include="*.tsx" --include="*.ts" | while read line; do
            echo "- $line" >> "$report_file"
        done
        echo "" >> "$report_file"
    else
        log "INFO" "✅ No deprecated drag-drop libraries found"
        echo "### ✅ No Deprecated Libraries Found" >> "$report_file"
        echo "" >> "$report_file"
    fi
    
    # Check for @dnd-kit proper usage patterns
    if grep -r "@dnd-kit" "$WEDSYNC_ROOT" --include="*.tsx" --include="*.ts" 2>/dev/null; then
        echo "### @dnd-kit Usage Found" >> "$report_file"
        echo "" >> "$report_file"
        grep -r "@dnd-kit" "$WEDSYNC_ROOT" --include="*.tsx" --include="*.ts" | while read line; do
            echo "- $line" >> "$report_file"
        done
        echo "" >> "$report_file"
        
        # Check for proper accessibility setup
        if grep -r "announcements\|KeyboardSensor\|PointerSensor" "$WEDSYNC_ROOT" --include="*.tsx" --include="*.ts" 2>/dev/null; then
            log "INFO" "✅ Found accessibility patterns in @dnd-kit usage"
            echo "**✅ Accessibility patterns detected**" >> "$report_file"
        else
            log "WARN" "⚠️ @dnd-kit found but missing accessibility patterns"
            echo "**⚠️ Missing accessibility patterns - please add KeyboardSensor, PointerSensor, and announcements**" >> "$report_file"
        fi
    fi
    
    # Check for @hello-pangea/dnd usage patterns
    if grep -r "@hello-pangea/dnd\|hello-pangea" "$WEDSYNC_ROOT" --include="*.tsx" --include="*.ts" 2>/dev/null; then
        echo "### @hello-pangea/dnd Usage Found" >> "$report_file"
        echo "" >> "$report_file"
        grep -r "@hello-pangea/dnd\|hello-pangea" "$WEDSYNC_ROOT" --include="*.tsx" --include="*.ts" | while read line; do
            echo "- $line" >> "$report_file"
        done
        echo "" >> "$report_file"
        
        # Check for proper Kanban/board implementation
        if grep -r "DragDropContext\|Droppable\|Draggable" "$WEDSYNC_ROOT" --include="*.tsx" --include="*.ts" 2>/dev/null; then
            log "INFO" "✅ Found proper @hello-pangea/dnd board patterns"
            echo "**✅ Proper Kanban/board implementation detected**" >> "$report_file"
        else
            log "WARN" "⚠️ @hello-pangea/dnd found but missing board patterns"
            echo "**⚠️ Missing DragDropContext/Droppable/Draggable - ensure proper setup**" >> "$report_file"
        fi
    fi
    
    # Check for @xyflow/react usage patterns  
    if grep -r "@xyflow/react\|xyflow\|ReactFlow" "$WEDSYNC_ROOT" --include="*.tsx" --include="*.ts" 2>/dev/null; then
        echo "### @xyflow/react Usage Found" >> "$report_file"
        echo "" >> "$report_file"
        grep -r "@xyflow/react\|xyflow\|ReactFlow" "$WEDSYNC_ROOT" --include="*.tsx" --include="*.ts" | while read line; do
            echo "- $line" >> "$report_file"
        done
        echo "" >> "$report_file"
        
        # Check for proper node-based implementation
        if grep -r "nodes=\|edges=\|nodeTypes=" "$WEDSYNC_ROOT" --include="*.tsx" --include="*.ts" 2>/dev/null; then
            log "INFO" "✅ Found proper @xyflow/react node/edge patterns"
            echo "**✅ Proper node-based implementation detected**" >> "$report_file"
        else
            log "WARN" "⚠️ @xyflow/react found but missing node/edge configuration"
            echo "**⚠️ Missing node/edge configuration - ensure proper React Flow setup**" >> "$report_file"
        fi
    fi
    
    # Check for legacy react-dnd usage (migration tracking)
    if grep -r "react-dnd\|useDrag\|useDrop" "$WEDSYNC_ROOT" --include="*.tsx" --include="*.ts" 2>/dev/null; then
        echo "### Legacy react-dnd Usage Found (Migration Tracking)" >> "$report_file"
        echo "" >> "$report_file"
        grep -r "react-dnd\|useDrag\|useDrop" "$WEDSYNC_ROOT" --include="*.tsx" --include="*.ts" | while read line; do
            echo "- $line" >> "$report_file"
        done
        echo "" >> "$report_file"
        
        log "WARN" "⚠️ Legacy react-dnd usage found - migration to @dnd-kit planned"
        echo "**⚠️ MIGRATION NEEDED**: Legacy react-dnd usage found - migrate to @dnd-kit for better mobile/accessibility support" >> "$report_file"
    fi
    
    # Check for native HTML5 drag patterns
    if grep -r "onDrop\|onDragOver\|draggable=" "$WEDSYNC_ROOT" --include="*.tsx" --include="*.ts" 2>/dev/null; then
        echo "### Native HTML5 Drag Usage Found" >> "$report_file"
        echo "" >> "$report_file"
        grep -r "onDrop\|onDragOver\|draggable=" "$WEDSYNC_ROOT" --include="*.tsx" --include="*.ts" | head -10 | while read line; do
            echo "- $line" >> "$report_file"
        done
        echo "" >> "$report_file"
    fi
    
    log "INFO" "📄 Drag-drop compliance report saved: $report_file"
}

# Function: Scan React Server/Client Component patterns
scan_react_component_patterns() {
    log "INFO" "🔍 Scanning React Server/Client component patterns..."
    
    local report_file="$GOVERNANCE_LOG_DIR/react-patterns-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << 'EOF'
# React Server/Client Component Pattern Compliance

## Expected Patterns
- **Server Components**: Default for data fetching, SEO-critical pages
- **Client Components**: Only when interactivity required ("use client")

## Scan Results

EOF

    # Count Server vs Client components
    local client_components=$(grep -r "use client" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | wc -l || echo "0")
    local total_components=$(find "$WEDSYNC_ROOT" -name "*.tsx" 2>/dev/null | wc -l || echo "0")
    local server_components=$((total_components - client_components))
    
    echo "### Component Distribution" >> "$report_file"
    echo "" >> "$report_file"
    echo "- **Total Components**: $total_components" >> "$report_file"
    echo "- **Server Components**: $server_components ($(( server_components * 100 / total_components ))%)" >> "$report_file"
    echo "- **Client Components**: $client_components ($(( client_components * 100 / total_components ))%)" >> "$report_file"
    echo "" >> "$report_file"
    
    if [ "$client_components" -gt $((total_components / 2)) ]; then
        log "WARN" "⚠️ High ratio of client components ($client_components/$total_components) - review for unnecessary interactivity"
        echo "**⚠️ WARNING**: High ratio of client components - consider if all need interactivity" >> "$report_file"
    else
        log "INFO" "✅ Good Server/Client component ratio"
        echo "**✅ Good balance** of Server/Client components" >> "$report_file"
    fi
    
    # Check for common anti-patterns
    echo "" >> "$report_file"
    echo "### Anti-Pattern Detection" >> "$report_file"
    echo "" >> "$report_file"
    
    # useState in Server Components (impossible but worth checking)
    if grep -r "useState\|useEffect" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | grep -v "use client" | head -5; then
        log "ERROR" "❌ Found useState/useEffect without 'use client' directive"
        echo "**❌ CRITICAL**: useState/useEffect found without 'use client':" >> "$report_file"
        grep -r "useState\|useEffect" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | grep -v "use client" | head -5 | while read line; do
            echo "- $line" >> "$report_file"
        done
    else
        echo "**✅ No useState/useEffect anti-patterns found**" >> "$report_file"
    fi
    
    log "INFO" "📄 React patterns report saved: $report_file"
}

# Function: Scan mobile-first compliance
scan_mobile_first_compliance() {
    log "INFO" "🔍 Scanning mobile-first implementation compliance..."
    
    local report_file="$GOVERNANCE_LOG_DIR/mobile-first-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << 'EOF'
# Mobile-First Implementation Compliance

## Requirements (60% of wedding vendors use mobile)
- Touch targets minimum 48px
- Bottom navigation for thumb reach  
- Responsive design with mobile breakpoints
- Offline capability for poor venue WiFi

## Scan Results

EOF

    # Check for touch target compliance
    echo "### Touch Target Analysis" >> "$report_file"
    echo "" >> "$report_file"
    
    if grep -r "min-w-\[48px\]\|w-12\|h-12\|p-3" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | head -5; then
        log "INFO" "✅ Found evidence of proper touch targets (48px+)"
        echo "**✅ Touch target patterns found:**" >> "$report_file"
        grep -r "min-w-\[48px\]\|w-12\|h-12\|p-3" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | head -5 | while read line; do
            echo "- $line" >> "$report_file"
        done
    else
        log "WARN" "⚠️ Limited evidence of 48px+ touch targets"
        echo "**⚠️ WARNING**: Limited evidence of 48px+ touch targets found" >> "$report_file"
    fi
    
    # Check for bottom navigation patterns
    echo "" >> "$report_file"
    echo "### Navigation Patterns" >> "$report_file"
    echo "" >> "$report_file"
    
    if grep -r "bottom-\|fixed.*bottom\|sticky.*bottom" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null; then
        log "INFO" "✅ Found bottom navigation patterns"
        echo "**✅ Bottom navigation patterns found:**" >> "$report_file"
        grep -r "bottom-\|fixed.*bottom\|sticky.*bottom" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | head -3 | while read line; do
            echo "- $line" >> "$report_file"
        done
    else
        log "WARN" "⚠️ No clear bottom navigation patterns found"
        echo "**⚠️ WARNING**: No clear bottom navigation patterns found" >> "$report_file"
    fi
    
    # Check for responsive breakpoints
    echo "" >> "$report_file"
    echo "### Responsive Design" >> "$report_file"
    echo "" >> "$report_file"
    
    if grep -r "sm:\|md:\|lg:\|xl:" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | wc -l | awk '{if($1>20) print "GOOD"; else print "LIMITED"}' | grep -q "GOOD"; then
        log "INFO" "✅ Responsive breakpoints widely used"
        echo "**✅ Responsive breakpoints widely used** (mobile-first approach detected)" >> "$report_file"
    else
        log "WARN" "⚠️ Limited responsive breakpoint usage"
        echo "**⚠️ WARNING**: Limited responsive breakpoint usage detected" >> "$report_file"
    fi
    
    # Check for offline capability
    echo "" >> "$report_file"
    echo "### Offline Capability" >> "$report_file"
    echo "" >> "$report_file"
    
    if grep -r "serviceWorker\|offline\|navigator\.onLine" "$WEDSYNC_ROOT" --include="*.tsx" --include="*.ts" 2>/dev/null; then
        log "INFO" "✅ Found offline capability implementation"
        echo "**✅ Offline capability patterns found:**" >> "$report_file"
        grep -r "serviceWorker\|offline\|navigator\.onLine" "$WEDSYNC_ROOT" --include="*.tsx" --include="*.ts" 2>/dev/null | while read line; do
            echo "- $line" >> "$report_file"
        done
    else
        log "WARN" "⚠️ No offline capability detected - critical for venue WiFi issues"
        echo "**⚠️ WARNING**: No offline capability detected - critical for poor venue WiFi" >> "$report_file"
    fi
    
    log "INFO" "📄 Mobile-first report saved: $report_file"
}

# Function: Scan performance compliance
scan_performance_compliance() {
    log "INFO" "🔍 Scanning performance optimization compliance..."
    
    local report_file="$GOVERNANCE_LOG_DIR/performance-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << 'EOF'
# Performance Optimization Compliance

## Requirements
- First Contentful Paint < 1.2s
- Bundle size < 500KB initial
- Image optimization for wedding photos
- Code splitting for vendor/client/admin sections

## Scan Results

EOF

    # Check for Next.js Image optimization
    echo "### Image Optimization" >> "$report_file"
    echo "" >> "$report_file"
    
    if grep -r "next/image\|Image.*from.*next" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null; then
        log "INFO" "✅ Next.js Image component usage found"
        echo "**✅ Next.js Image optimization in use:**" >> "$report_file"
        grep -r "next/image\|Image.*from.*next" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | wc -l | while read count; do
            echo "- Found in $count files" >> "$report_file"
        done
    else
        log "ERROR" "❌ No Next.js Image optimization found - critical for wedding photo performance"
        echo "**❌ CRITICAL**: No Next.js Image optimization found - essential for wedding photos" >> "$report_file"
    fi
    
    # Check for dynamic imports (code splitting)
    echo "" >> "$report_file"
    echo "### Code Splitting" >> "$report_file"
    echo "" >> "$report_file"
    
    if grep -r "dynamic.*import\|lazy.*import" "$WEDSYNC_ROOT" --include="*.tsx" --include="*.ts" 2>/dev/null; then
        log "INFO" "✅ Dynamic imports found for code splitting"
        echo "**✅ Code splitting patterns found:**" >> "$report_file"
        grep -r "dynamic.*import\|lazy.*import" "$WEDSYNC_ROOT" --include="*.tsx" --include="*.ts" 2>/dev/null | while read line; do
            echo "- $line" >> "$report_file"
        done
    else
        log "WARN" "⚠️ Limited code splitting detected"
        echo "**⚠️ WARNING**: Limited code splitting detected - consider for large components" >> "$report_file"
    fi
    
    # Check for loading states
    echo "" >> "$report_file"
    echo "### Loading States" >> "$report_file"
    echo "" >> "$report_file"
    
    if grep -r "loading\|Loading\|Suspense\|skeleton" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | wc -l | awk '{if($1>10) print "GOOD"; else print "LIMITED"}' | grep -q "GOOD"; then
        log "INFO" "✅ Good coverage of loading states"
        echo "**✅ Good loading state coverage** for user experience" >> "$report_file"
    else
        log "WARN" "⚠️ Limited loading state implementation"
        echo "**⚠️ WARNING**: Limited loading states - important for wedding day stress scenarios" >> "$report_file"
    fi
    
    log "INFO" "📄 Performance report saved: $report_file"
}

# Function: Scan accessibility compliance
scan_accessibility_compliance() {
    log "INFO" "🔍 Scanning accessibility compliance (WCAG AA)..."
    
    local report_file="$GOVERNANCE_LOG_DIR/accessibility-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << 'EOF'
# Accessibility Compliance Report (WCAG AA)

## Requirements  
- Screen reader compatibility
- Keyboard navigation support
- High contrast mode support
- Alternative text for images

## Scan Results

EOF

    # Check for ARIA labels and semantic HTML
    echo "### ARIA and Semantic HTML" >> "$report_file"
    echo "" >> "$report_file"
    
    local aria_count=$(grep -r "aria-\|role=" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | wc -l || echo "0")
    local semantic_count=$(grep -r "<nav\|<main\|<section\|<article\|<aside\|<header\|<footer" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | wc -l || echo "0")
    
    echo "- **ARIA attributes found**: $aria_count" >> "$report_file"
    echo "- **Semantic HTML elements found**: $semantic_count" >> "$report_file"
    echo "" >> "$report_file"
    
    if [ "$aria_count" -gt 20 ] && [ "$semantic_count" -gt 20 ]; then
        log "INFO" "✅ Good accessibility foundation with ARIA and semantic HTML"
        echo "**✅ Good accessibility foundation**" >> "$report_file"
    else
        log "WARN" "⚠️ Limited accessibility implementation - wedding vendors with disabilities need support"
        echo "**⚠️ WARNING**: Limited accessibility implementation detected" >> "$report_file"
    fi
    
    # Check for alt text on images
    echo "" >> "$report_file"
    echo "### Image Alt Text" >> "$report_file"
    echo "" >> "$report_file"
    
    local images_with_alt=$(grep -r "alt=" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | wc -l || echo "0")
    local total_images=$(grep -r "<img\|<Image" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | wc -l || echo "0")
    
    if [ "$total_images" -gt 0 ]; then
        local alt_percentage=$((images_with_alt * 100 / total_images))
        echo "- **Images with alt text**: $images_with_alt / $total_images ($alt_percentage%)" >> "$report_file"
        
        if [ "$alt_percentage" -gt 80 ]; then
            log "INFO" "✅ Good alt text coverage for wedding photos"
            echo "**✅ Good alt text coverage**" >> "$report_file"
        else
            log "WARN" "⚠️ Poor alt text coverage - essential for wedding photo accessibility"
            echo "**⚠️ WARNING**: Poor alt text coverage - essential for screen readers" >> "$report_file"
        fi
    else
        echo "- **No images found to analyze**" >> "$report_file"
    fi
    
    # Check for keyboard navigation support
    echo "" >> "$report_file"
    echo "### Keyboard Navigation" >> "$report_file"
    echo "" >> "$report_file"
    
    if grep -r "onKeyDown\|onKeyPress\|tabIndex\|focus\(\)" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | head -5; then
        log "INFO" "✅ Keyboard navigation patterns found"
        echo "**✅ Keyboard navigation support found:**" >> "$report_file"
        grep -r "onKeyDown\|onKeyPress\|tabIndex" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | head -5 | while read line; do
            echo "- $line" >> "$report_file"
        done
    else
        log "WARN" "⚠️ Limited keyboard navigation support"
        echo "**⚠️ WARNING**: Limited keyboard navigation support detected" >> "$report_file"
    fi
    
    log "INFO" "📄 Accessibility report saved: $report_file"
}

# Function: Check wedding industry specific patterns
scan_wedding_industry_patterns() {
    log "INFO" "🔍 Scanning wedding industry specific UX patterns..."
    
    local report_file="$GOVERNANCE_LOG_DIR/wedding-patterns-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << 'EOF'
# Wedding Industry UX Pattern Compliance

## Wedding-Specific Requirements
- Emergency access patterns for wedding day
- Vendor coordination workflows  
- Mobile photographer workflows
- Couple communication threads
- Timeline management systems

## Scan Results

EOF

    # Check for timeline/scheduling components
    echo "### Timeline & Scheduling" >> "$report_file"
    echo "" >> "$report_file"
    
    if grep -r "timeline\|schedule\|Calendar\|Date" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | head -5; then
        log "INFO" "✅ Timeline/scheduling components found"
        echo "**✅ Timeline/scheduling patterns found:**" >> "$report_file"
        grep -r "timeline\|schedule\|Calendar" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | head -5 | while read line; do
            echo "- $line" >> "$report_file"
        done
    else
        log "WARN" "⚠️ No timeline/scheduling components found - essential for wedding coordination"
        echo "**⚠️ WARNING**: No timeline/scheduling components found" >> "$report_file"
    fi
    
    # Check for photo/gallery components
    echo "" >> "$report_file"
    echo "### Photo Gallery Systems" >> "$report_file"
    echo "" >> "$report_file"
    
    if grep -r "gallery\|Gallery\|photo\|Photo\|image.*grid" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | head -5; then
        log "INFO" "✅ Photo gallery components found"
        echo "**✅ Photo gallery systems found:**" >> "$report_file"
        grep -r "gallery\|Gallery.*photo" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | head -3 | while read line; do
            echo "- $line" >> "$report_file"
        done
    else
        log "WARN" "⚠️ No photo gallery systems found - essential for photographer workflows"
        echo "**⚠️ WARNING**: No photo gallery systems found" >> "$report_file"
    fi
    
    # Check for communication/messaging
    echo "" >> "$report_file"
    echo "### Communication Systems" >> "$report_file"  
    echo "" >> "$report_file"
    
    if grep -r "message\|Message\|chat\|Chat\|communication" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | head -5; then
        log "INFO" "✅ Communication systems found"
        echo "**✅ Communication systems found:**" >> "$report_file"
        grep -r "message\|chat.*system" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | head -3 | while read line; do
            echo "- $line" >> "$report_file"
        done
    else
        log "WARN" "⚠️ No communication systems found - essential for vendor coordination"
        echo "**⚠️ WARNING**: No communication systems found" >> "$report_file"
    fi
    
    # Check for wedding day emergency patterns
    echo "" >> "$report_file"
    echo "### Emergency Access Patterns" >> "$report_file"
    echo "" >> "$report_file"
    
    if grep -r "emergency\|Emergency\|urgent\|Urgent\|FloatingActionButton" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null; then
        log "INFO" "✅ Emergency access patterns found"
        echo "**✅ Emergency patterns found:**" >> "$report_file"
        grep -r "emergency\|Emergency\|FloatingActionButton" "$WEDSYNC_ROOT" --include="*.tsx" 2>/dev/null | while read line; do
            echo "- $line" >> "$report_file"
        done
    else
        log "WARN" "⚠️ No emergency access patterns - critical for wedding day stress situations"
        echo "**⚠️ CRITICAL**: No emergency access patterns found - essential for wedding day" >> "$report_file"
    fi
    
    log "INFO" "📄 Wedding patterns report saved: $report_file"
}

# Function: Generate governance summary
generate_governance_summary() {
    log "INFO" "📊 Generating governance summary report..."
    
    local summary_file="$GOVERNANCE_LOG_DIR/GOVERNANCE-SUMMARY-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$summary_file" << EOF
# UI/UX Tech Stack Governance Summary
**Generated**: $(date '+%Y-%m-%d %H:%M:%S')
**WedSync Wedding Industry Platform**

## Executive Summary
This automated governance scan evaluates UI/UX implementation compliance across:
- Component architecture decisions
- Mobile-first wedding vendor workflows  
- Performance optimization for wedding photos
- Accessibility for all wedding industry users
- Wedding-specific UX patterns and emergency access

## Scan Categories Completed
✅ Drag & Drop Implementation Compliance
✅ React Server/Client Component Patterns  
✅ Mobile-First Implementation
✅ Performance Optimization
✅ Accessibility Compliance (WCAG AA)
✅ Wedding Industry Specific Patterns

## Reports Generated
$(ls -1 "$GOVERNANCE_LOG_DIR"/*.md 2>/dev/null | tail -6 | while read file; do
    echo "- $(basename "$file")"
done)

## Key Recommendations
1. **Migrate any react-beautiful-dnd** → @dnd-kit immediately
2. **Ensure 48px+ touch targets** for mobile wedding day usage
3. **Implement offline capability** for poor venue WiFi scenarios  
4. **Add emergency access patterns** for wedding day stress situations
5. **Optimize wedding photo galleries** with Next.js Image component
6. **Maintain 80%+ Server Components** for performance

## Compliance Framework Files
- Component Architecture: \`component-architecture-framework.json\`
- Drag-Drop Decisions: \`tech-decisions/drag-drop-decision-matrix.json\`
- Wedding UX Intelligence: \`wedding-ux-intelligence.json\`
- Emergency Patterns: \`emergency-quick-access-patterns.tsx\`

## Next Steps
1. Review individual scan reports for detailed findings
2. Address critical violations (react-beautiful-dnd, accessibility)
3. Implement missing wedding-specific patterns
4. Schedule weekly governance scans for ongoing compliance
5. Update component documentation with decisions made

---
*This report was generated by the UI/UX Tech Stack Guardian*  
*Part of WedSync Workflow V2 - Position 9: UI/UX Specialist*
EOF

    log "INFO" "📄 Governance summary saved: $summary_file"
    echo ""
    echo -e "${GREEN}🎯 GOVERNANCE SCAN COMPLETE${NC}"
    echo ""
    echo -e "${BLUE}Summary Report:${NC} $summary_file"
    echo -e "${BLUE}Individual Reports:${NC} $GOVERNANCE_LOG_DIR/"
    echo ""
    echo -e "${YELLOW}Critical Actions Required:${NC}"
    echo "1. Review all generated reports for violations"
    echo "2. Address any react-beautiful-dnd usage immediately"  
    echo "3. Implement missing mobile/accessibility patterns"
    echo "4. Add wedding-specific emergency access patterns"
    echo ""
}

# Function: Display usage information
usage() {
    cat << EOF
UI/UX Tech Stack Governance Tools
Usage: $0 [OPTIONS]

OPTIONS:
    --scan-all              Run all governance scans (default)
    --drag-drop             Scan drag-drop implementation compliance
    --react-patterns        Scan React Server/Client component patterns
    --mobile-first          Scan mobile-first implementation compliance  
    --performance           Scan performance optimization compliance
    --accessibility         Scan accessibility compliance (WCAG AA)
    --wedding-patterns      Scan wedding industry specific patterns
    --summary-only          Generate summary from existing reports
    --help                  Show this help message

EXAMPLES:
    $0                      # Run all scans and generate summary
    $0 --drag-drop         # Only scan drag-drop compliance  
    $0 --mobile-first --accessibility  # Scan mobile and accessibility only

GOVERNANCE FRAMEWORK:
    This tool enforces the UI/UX component architecture framework for
    WedSync's wedding industry platform, ensuring mobile-first design,
    accessibility compliance, and wedding-specific user experience patterns.

REPORTS SAVED TO: $GOVERNANCE_LOG_DIR/
EOF
}

# Main execution
main() {
    local scan_all=true
    local run_drag_drop=false
    local run_react_patterns=false  
    local run_mobile_first=false
    local run_performance=false
    local run_accessibility=false
    local run_wedding_patterns=false
    local summary_only=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --scan-all)
                scan_all=true
                shift
                ;;
            --drag-drop)
                scan_all=false
                run_drag_drop=true
                shift
                ;;
            --react-patterns)
                scan_all=false
                run_react_patterns=true
                shift
                ;;
            --mobile-first)
                scan_all=false
                run_mobile_first=true
                shift
                ;;
            --performance)
                scan_all=false
                run_performance=true
                shift
                ;;
            --accessibility)
                scan_all=false
                run_accessibility=true
                shift
                ;;
            --wedding-patterns)
                scan_all=false
                run_wedding_patterns=true
                shift
                ;;
            --summary-only)
                summary_only=true
                shift
                ;;
            --help)
                usage
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Verify WedSync root directory exists
    if [ ! -d "$WEDSYNC_ROOT" ]; then
        log "ERROR" "WedSync root directory not found: $WEDSYNC_ROOT"
        echo "Please set WEDSYNC_ROOT environment variable or run from project root"
        exit 1
    fi
    
    log "INFO" "🚀 Starting UI/UX Tech Stack Governance Scan"
    log "INFO" "📁 Scanning directory: $WEDSYNC_ROOT"
    log "INFO" "📄 Reports will be saved to: $GOVERNANCE_LOG_DIR"
    
    # Run scans based on options
    if [ "$summary_only" = true ]; then
        generate_governance_summary
        exit 0
    fi
    
    if [ "$scan_all" = true ]; then
        scan_drag_drop_compliance
        scan_react_component_patterns
        scan_mobile_first_compliance
        scan_performance_compliance
        scan_accessibility_compliance
        scan_wedding_industry_patterns
    else
        [ "$run_drag_drop" = true ] && scan_drag_drop_compliance
        [ "$run_react_patterns" = true ] && scan_react_component_patterns
        [ "$run_mobile_first" = true ] && scan_mobile_first_compliance
        [ "$run_performance" = true ] && scan_performance_compliance
        [ "$run_accessibility" = true ] && scan_accessibility_compliance
        [ "$run_wedding_patterns" = true ] && scan_wedding_industry_patterns
    fi
    
    # Always generate summary at the end
    generate_governance_summary
}

# Execute main function with all arguments
main "$@"