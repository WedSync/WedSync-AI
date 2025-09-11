#!/bin/bash

# 🚨 PROJECT ORCHESTRATOR ASSIGNMENT VALIDATION SCRIPT
# Prevents assignment of non-existent features

set -e

ASSIGNMENT_FILE=$1
CORE_SPECS_DIR="/Users/skyphotography/CODE/WedSync-2.0/WedSync2/CORE-SPECIFICATIONS"

if [ -z "$ASSIGNMENT_FILE" ]; then
    echo "Usage: ./validate-assignments.sh [assignment-file.md]"
    exit 1
fi

if [ ! -f "$ASSIGNMENT_FILE" ]; then
    echo "❌ Assignment file not found: $ASSIGNMENT_FILE"
    exit 1
fi

echo "🔍 Validating assignment file: $ASSIGNMENT_FILE"
echo "📁 Core specifications directory: $CORE_SPECS_DIR"
echo ""

# Extract all specification paths from assignment
SPEC_PATHS=$(grep "Specification:" "$ASSIGNMENT_FILE" | sed 's/.*Specification:\*\* //' | awk '{print $1}')

if [ -z "$SPEC_PATHS" ]; then
    echo "❌ No specifications found in assignment file!"
    exit 1
fi

VALIDATION_FAILED=0
FEATURE_COUNT=0

while IFS= read -r spec_path; do
    FEATURE_COUNT=$((FEATURE_COUNT + 1))
    
    if [ -f "$spec_path" ]; then
        echo "✅ Feature $FEATURE_COUNT: Specification exists - $spec_path"
    else
        echo "❌ Feature $FEATURE_COUNT: SPECIFICATION NOT FOUND - $spec_path"
        echo "🛑 THIS IS A CRITICAL ERROR - FEATURE WAS INVENTED!"
        VALIDATION_FAILED=1
    fi
done <<< "$SPEC_PATHS"

echo ""
echo "📊 VALIDATION SUMMARY:"
echo "   Features checked: $FEATURE_COUNT"

if [ $VALIDATION_FAILED -eq 1 ]; then
    echo "   Status: ❌ VALIDATION FAILED"
    echo ""
    echo "🚨 ASSIGNMENT CONTAINS NON-EXISTENT FEATURES!"
    echo "🛑 DO NOT USE THIS ASSIGNMENT"
    echo "🔧 CREATE NEW ASSIGNMENT WITH VERIFIED FEATURES ONLY"
    exit 1
else
    echo "   Status: ✅ ALL SPECIFICATIONS VERIFIED"
    echo ""
    echo "🎉 ASSIGNMENT IS SAFE TO USE!"
    echo "✅ All features have confirmed specification files"
fi