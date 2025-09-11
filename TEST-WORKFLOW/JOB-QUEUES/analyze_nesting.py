#!/usr/bin/env python3

import sys
import re

def analyze_nesting(file_path):
    """Analyze function nesting levels in a TypeScript test file"""
    
    try:
        with open(file_path, 'r') as file:
            lines = file.readlines()
    except FileNotFoundError:
        print(f"Error: File not found: {file_path}")
        return
    
    max_nesting = 0
    current_nesting = 0
    in_function = False
    violations = []
    
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        
        # Count opening braces that indicate function blocks
        if re.search(r'\{', stripped):
            # Check if this is a function/method definition
            if re.search(r'(function|=\s*\(|=>\s*{|it\(|describe\(|test\(|beforeEach|afterEach|beforeAll)', stripped):
                in_function = True
            
            if in_function:
                current_nesting += stripped.count('{') - stripped.count('}')
                if current_nesting > max_nesting:
                    max_nesting = current_nesting
                
                if current_nesting > 4:
                    violations.append({
                        'line': i,
                        'level': current_nesting,
                        'content': stripped[:100] + ('...' if len(stripped) > 100 else '')
                    })
        
        # Count closing braces
        if re.search(r'\}', stripped):
            if in_function:
                current_nesting -= stripped.count('}') - stripped.count('{')
                if current_nesting <= 0:
                    in_function = False
                    current_nesting = 0
    
    print(f"Analysis for: {file_path}")
    print(f"Maximum nesting level found: {max_nesting}")
    print(f"Target maximum: 4")
    print(f"Violations found: {len(violations)}")
    
    if violations:
        print("\nNesting violations (> 4 levels):")
        for violation in violations[:10]:  # Show first 10 violations
            print(f"  Line {violation['line']}: Level {violation['level']} - {violation['content']}")
        
        if len(violations) > 10:
            print(f"  ... and {len(violations) - 10} more violations")
    else:
        print("✅ No nesting violations found - file meets requirements")
    
    return len(violations) == 0

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 analyze_nesting.py <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    meets_requirements = analyze_nesting(file_path)
    sys.exit(0 if meets_requirements else 1)