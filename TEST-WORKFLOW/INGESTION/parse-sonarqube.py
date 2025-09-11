#!/usr/bin/env python3
"""
Parse SonarQube results into TEST-WORKFLOW queue format
Each issue becomes an individual JSON file with full context
"""

import json
import os
from pathlib import Path
import sys

def parse_sonarqube_results(input_file, output_dir):
    """Parse SonarQube JSON into individual error files"""
    
    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"❌ Error: Input file not found: {input_file}")
        return None
    
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    # Handle both direct issues array and nested structure
    if isinstance(data, list):
        issues = data
    else:
        issues = data.get('issues', [])
    
    print(f"📊 Found {len(issues)} issues to process")
    
    if len(issues) == 0:
        print("⚠️ No issues found in input file")
        return None
    
    # Statistics
    stats = {
        'BLOCKER': 0,
        'CRITICAL': 0,
        'MAJOR': 0,
        'MINOR': 0,
        'INFO': 0
    }
    
    for idx, issue in enumerate(issues):
        # Extract issue details
        severity = issue.get('severity', 'INFO').upper()
        rule = issue.get('rule', 'unknown')
        file_path = issue.get('component', '').replace('WedSync:', '')
        line = issue.get('line', 0)
        message = issue.get('message', '')
        effort = issue.get('effort', '5min')
        
        # Skip if no file path
        if not file_path:
            continue
        
        # Create structured error object with all context
        error_obj = {
            'id': f"SQ-{idx:05d}",
            'source': 'SonarQube',
            'severity': severity,
            'category': classify_category(rule, message),
            'rule': rule,
            'file': file_path,
            'line': line,
            'message': message,
            'effort': effort,
            'fix_instructions': generate_fix_instructions(rule, message),
            'verification_requirements': generate_verification_requirements(severity, rule),
            'ref_mcp_queries': generate_ref_queries(rule, file_path),
            'required_agents': select_agents(severity, rule),
            'connected_features': identify_connected_features(file_path),
            'business_impact': assess_business_impact(severity, file_path),
            'fix_complexity': assess_complexity(rule, message),
            'rollback_instructions': f"git checkout -- {file_path}"
        }
        
        # Write to appropriate queue
        queue_dir = Path(output_dir) / 'BY-SEVERITY' / severity
        queue_dir.mkdir(parents=True, exist_ok=True)
        
        output_file = queue_dir / f"SQ-{idx:05d}.json"
        with open(output_file, 'w') as f:
            json.dump(error_obj, f, indent=2)
        
        # Update statistics
        if severity in stats:
            stats[severity] += 1
        
        if idx % 100 == 0 and idx > 0:
            print(f"  Processed {idx} issues...")
    
    # Print statistics
    print("\n📊 Ingestion Statistics:")
    print("-" * 30)
    for severity, count in stats.items():
        if count > 0:
            print(f"  {severity:10}: {count:5} issues")
    print("-" * 30)
    print(f"  TOTAL:      {sum(stats.values()):5} issues")
    
    return stats

def classify_category(rule, message):
    """Classify issue into category based on rule and message"""
    rule_lower = rule.lower()
    message_lower = message.lower()
    
    if 'S4123' in rule or 'await' in message_lower or 'async' in message_lower:
        return 'ASYNC-AWAIT'
    elif 'deprecated' in rule_lower or 'deprecated' in message_lower:
        return 'DEPRECATED-API'
    elif 'complexity' in rule_lower or 'complex' in message_lower:
        return 'COMPLEXITY'
    elif 'TS' in rule or 'type' in rule_lower or 'type' in message_lower:
        return 'TYPE-ERRORS'
    elif 'security' in rule_lower or 'auth' in rule_lower or 'password' in message_lower:
        return 'SECURITY'
    elif 'unused' in message_lower or 'S1128' in rule:
        return 'UNUSED-CODE'
    elif 'duplicate' in message_lower:
        return 'DUPLICATION'
    else:
        return 'GENERAL'

def generate_fix_instructions(rule, message):
    """Generate specific fix instructions based on rule"""
    instructions = {
        'typescript:S4123': 'Add or remove await keyword as appropriate. Check if the value is actually a Promise.',
        'typescript:S1128': 'Remove unused import statement',
        'typescript:S6582': 'Update deprecated API to new version',
        'typescript:S117': 'Rename variable to follow naming convention',
        'typescript:S1854': 'Remove dead code that is never executed',
        'typescript:S3776': 'Refactor to reduce cognitive complexity',
        'typescript:S2589': 'Remove redundant boolean literal in condition',
        'typescript:S1186': 'Add implementation or mark as abstract',
    }
    
    # Return specific instruction or generic based on message
    return instructions.get(rule, f"Fix issue: {message[:100]}")

def generate_verification_requirements(severity, rule):
    """Define what verification is needed based on severity"""
    if severity in ['BLOCKER', 'CRITICAL']:
        return [
            'Run full test suite',
            'Deploy all verification agents',
            'Check pattern compliance with Ref MCP',
            'Verify no regressions introduced',
            'Production guardian approval required',
            'Performance impact assessment',
            'Security audit if auth/payment related'
        ]
    elif severity == 'MAJOR':
        return [
            'Run related tests',
            'Pattern check with Ref MCP',
            'Performance verification',
            'Check connected features',
            'Verify business logic intact'
        ]
    elif severity == 'MINOR':
        return [
            'Basic verification',
            'Build must pass',
            'Type checking must pass',
            'Lint must pass'
        ]
    else:
        return [
            'Build verification',
            'Visual inspection'
        ]

def generate_ref_queries(rule, file_path):
    """Generate Ref MCP queries for pattern checking"""
    base_name = os.path.basename(file_path)
    dir_name = os.path.dirname(file_path)
    
    queries = [
        f"site:wedsync {base_name} implementation patterns",
        f"WedSync {rule} best practice fix",
        f"{rule} common solutions TypeScript"
    ]
    
    # Add context-specific queries
    if 'api' in dir_name:
        queries.append("WedSync API endpoint patterns")
    if 'components' in dir_name:
        queries.append("WedSync React component patterns")
    if 'lib' in dir_name or 'utils' in dir_name:
        queries.append("WedSync utility function patterns")
    
    return queries

def select_agents(severity, rule):
    """Select which sub-agents to deploy for verification"""
    agents = []
    
    # Base agents by severity
    if severity in ['BLOCKER', 'CRITICAL']:
        agents.extend([
            'pre-code-knowledge-gatherer',
            'security-compliance-officer',
            'performance-optimization-expert',
            'test-automation-architect',
            'production-guardian'
        ])
    elif severity == 'MAJOR':
        agents.extend([
            'pre-code-knowledge-gatherer',
            'specification-compliance-overseer',
            'test-automation-architect'
        ])
    elif severity == 'MINOR':
        agents.append('pre-code-knowledge-gatherer')
    
    # Add specific agents based on rule type
    rule_lower = rule.lower()
    if 'security' in rule_lower or 'auth' in rule_lower or 'S5659' in rule:
        agents.append('security-compliance-officer')
    if 'performance' in rule_lower or 'complexity' in rule_lower:
        agents.append('performance-optimization-expert')
    if 'test' in rule_lower:
        agents.append('test-automation-architect')
    
    return list(set(agents))  # Remove duplicates

def identify_connected_features(file_path):
    """Identify which features might be affected by this file"""
    features = []
    
    path_lower = file_path.lower()
    
    # Map file paths to features
    if 'payment' in path_lower or 'checkout' in path_lower:
        features.extend(['payments', 'checkout', 'invoicing'])
    if 'auth' in path_lower or 'login' in path_lower:
        features.extend(['authentication', 'user-management', 'session'])
    if 'timeline' in path_lower:
        features.extend(['timeline', 'scheduling', 'vendor-coordination'])
    if 'vendor' in path_lower:
        features.extend(['vendor-management', 'vendor-communication'])
    if 'client' in path_lower or 'customer' in path_lower:
        features.extend(['client-management', 'crm'])
    if 'photo' in path_lower or 'image' in path_lower or 'gallery' in path_lower:
        features.extend(['photo-management', 'gallery', 'media'])
    if 'notification' in path_lower or 'email' in path_lower:
        features.extend(['notifications', 'communication'])
    
    return list(set(features)) if features else ['general']

def assess_business_impact(severity, file_path):
    """Assess the business impact of this issue"""
    path_lower = file_path.lower()
    
    # Critical business areas
    if 'payment' in path_lower or 'billing' in path_lower:
        return 'HIGH - Payment processing affected'
    elif 'auth' in path_lower or 'security' in path_lower:
        return 'HIGH - Security and access control'
    elif 'timeline' in path_lower or 'schedule' in path_lower:
        return 'HIGH - Wedding day coordination'
    elif severity in ['BLOCKER', 'CRITICAL']:
        return 'HIGH - Critical functionality'
    elif 'vendor' in path_lower or 'client' in path_lower:
        return 'MEDIUM - User management affected'
    elif severity == 'MAJOR':
        return 'MEDIUM - Feature functionality'
    else:
        return 'LOW - Code quality improvement'

def assess_complexity(rule, message):
    """Assess how complex this fix will be"""
    message_lower = message.lower()
    
    # Simple fixes
    if 'unused' in message_lower or 'S1128' in rule:
        return 'low'
    elif 'rename' in message_lower or 'naming' in message_lower:
        return 'low'
    elif 'S4123' in rule:  # await issues
        return 'low'
    
    # Medium complexity
    elif 'deprecated' in message_lower:
        return 'medium'
    elif 'duplicate' in message_lower:
        return 'medium'
    
    # High complexity
    elif 'complexity' in message_lower or 'refactor' in message_lower:
        return 'high'
    elif 'security' in message_lower:
        return 'high'
    
    return 'medium'

if __name__ == "__main__":
    # Default paths
    input_file = sys.argv[1] if len(sys.argv) > 1 else 'sonarqube-results.json'
    output_dir = sys.argv[2] if len(sys.argv) > 2 else '/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/TEST-WORKFLOW/QUEUES'
    
    print(f"📥 SonarQube Parser for TEST-WORKFLOW")
    print(f"Input: {input_file}")
    print(f"Output: {output_dir}")
    print("")
    
    stats = parse_sonarqube_results(input_file, output_dir)
    
    if stats:
        print("\n✅ Parsing complete!")
        print(f"Files created in: {output_dir}/BY-SEVERITY/")
    else:
        print("\n❌ Parsing failed - check input file")