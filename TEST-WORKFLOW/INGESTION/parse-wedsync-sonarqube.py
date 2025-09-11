#!/usr/bin/env python3
"""
Parse WedSync SonarQube results (custom format) into TEST-WORKFLOW queue
"""

import json
import os
from pathlib import Path
import sys

def parse_wedsync_sonarqube(input_file, output_dir):
    """Parse WedSync's custom SonarQube format"""
    
    print(f"📥 Parsing WedSync SonarQube Results")
    print(f"Input: {input_file}")
    
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    total_processed = 0
    stats = {
        'BLOCKER': 0,
        'CRITICAL': 0,
        'MAJOR': 0,
        'MINOR': 0,
        'INFO': 0
    }
    
    # Process each severity category
    for severity_key, severity_data in data.get('error_categories', {}).items():
        if isinstance(severity_data, dict) and 'issues' in severity_data:
            issues = severity_data['issues']
            severity = severity_key.upper()
            
            print(f"\n📊 Processing {severity} issues: {len(issues)} found")
            
            for issue in issues:
                # Create structured error object
                error_obj = {
                    'id': issue.get('id', f"SQ-{total_processed:05d}"),
                    'source': 'SonarQube',
                    'severity': severity,
                    'rule': issue.get('rule', 'unknown'),
                    'type': issue.get('type', 'BUG'),
                    'file': issue.get('file', ''),
                    'line': issue.get('line', 0),
                    'message': issue.get('message', ''),
                    'effort': issue.get('effort', '5min'),
                    'auto_fixable': issue.get('auto_fixable', False),
                    'fix_strategy': issue.get('fix_strategy', ''),
                    'fix_instructions': generate_fix_instructions(issue),
                    'verification_requirements': generate_verification_requirements(severity),
                    'ref_mcp_queries': generate_ref_queries(issue),
                    'required_agents': select_agents(severity, issue.get('rule', '')),
                    'rollback_instructions': f"git checkout -- {issue.get('file', '')}"
                }
                
                # Write to queue
                queue_dir = Path(output_dir) / 'BY-SEVERITY' / severity
                queue_dir.mkdir(parents=True, exist_ok=True)
                
                output_file = queue_dir / f"{error_obj['id']}.json"
                with open(output_file, 'w') as f:
                    json.dump(error_obj, f, indent=2)
                
                total_processed += 1
                stats[severity] = stats.get(severity, 0) + 1
    
    # Also check for flat issue list (if present)
    if 'issues' in data:
        print(f"\n📊 Processing additional issues list")
        for issue in data['issues']:
            severity = issue.get('severity', 'INFO').upper()
            
            error_obj = {
                'id': f"SQ-{total_processed:05d}",
                'source': 'SonarQube',
                'severity': severity,
                'rule': issue.get('rule', 'unknown'),
                'file': issue.get('file', issue.get('component', '')),
                'line': issue.get('line', 0),
                'message': issue.get('message', ''),
                'fix_instructions': issue.get('message', ''),
                'verification_requirements': generate_verification_requirements(severity),
                'ref_mcp_queries': generate_ref_queries(issue),
                'required_agents': select_agents(severity, issue.get('rule', '')),
            }
            
            queue_dir = Path(output_dir) / 'BY-SEVERITY' / severity
            queue_dir.mkdir(parents=True, exist_ok=True)
            
            output_file = queue_dir / f"{error_obj['id']}.json"
            with open(output_file, 'w') as f:
                json.dump(error_obj, f, indent=2)
            
            total_processed += 1
            stats[severity] = stats.get(severity, 0) + 1
    
    print(f"\n📊 Parsing Complete!")
    print("-" * 40)
    for severity, count in stats.items():
        if count > 0:
            print(f"  {severity:10}: {count:5} issues")
    print("-" * 40)
    print(f"  TOTAL:      {total_processed:5} issues")
    
    return stats

def generate_fix_instructions(issue):
    """Generate fix instructions from issue data"""
    if issue.get('fix_strategy'):
        return issue['fix_strategy']
    
    message = issue.get('message', '')
    rule = issue.get('rule', '')
    
    if 'await' in message.lower():
        return 'Add or remove await keyword as appropriate'
    elif 'unused' in message.lower():
        return 'Remove unused code'
    elif 'break' in message.lower() or 'fall through' in message.lower():
        return 'Add break statement to switch case'
    else:
        return f"Fix: {message[:100]}"

def generate_verification_requirements(severity):
    """Generate verification requirements based on severity"""
    if severity in ['BLOCKER', 'CRITICAL']:
        return [
            'Run full test suite',
            'Deploy all verification agents',
            'Check pattern compliance with Ref MCP',
            'Verify no regressions',
            'Production guardian approval'
        ]
    elif severity == 'MAJOR':
        return [
            'Run related tests',
            'Pattern check with Ref MCP',
            'Performance verification'
        ]
    else:
        return [
            'Basic verification',
            'Build must pass'
        ]

def generate_ref_queries(issue):
    """Generate Ref MCP queries"""
    file_path = issue.get('file', '')
    rule = issue.get('rule', '')
    
    return [
        f"site:wedsync {os.path.basename(file_path)} patterns",
        f"WedSync {rule} best practice",
        f"{rule} TypeScript fix"
    ]

def select_agents(severity, rule):
    """Select verification agents"""
    agents = []
    
    if severity in ['BLOCKER', 'CRITICAL']:
        agents.extend([
            'pre-code-knowledge-gatherer',
            'security-compliance-officer',
            'test-automation-architect',
            'production-guardian'
        ])
    elif severity == 'MAJOR':
        agents.extend([
            'pre-code-knowledge-gatherer',
            'specification-compliance-overseer'
        ])
    
    if 'security' in rule.lower() or 'auth' in rule.lower():
        agents.append('security-compliance-officer')
    
    return list(set(agents))

if __name__ == "__main__":
    input_file = sys.argv[1] if len(sys.argv) > 1 else '../QUEUES/INCOMING/SONARQUBE-TYPESCRIPT-ISSUES-20250909.json'
    output_dir = sys.argv[2] if len(sys.argv) > 2 else '../QUEUES'
    
    parse_wedsync_sonarqube(input_file, output_dir)