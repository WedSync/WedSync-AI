#!/usr/bin/env python3
"""
Convert 500+ real issues from sonarqube-reports/issues-by-file.txt 
into individual job files for the 5-agent parallel army.
NO SYNTHETIC DATA - REAL ISSUES ONLY!
"""

import json
import uuid
import os
import re
from datetime import datetime

def parse_issue_line(line):
    """Parse a line from issues-by-file.txt into structured data."""
    # Format: wedsync-2025:file:line - SEVERITY TYPE: Description
    match = re.match(r'wedsync-2025:([^:]+):(\d+) - (\w+) (\w+): (.+)', line.strip())
    if not match:
        return None
    
    file_path, line_num, severity, issue_type, description = match.groups()
    
    return {
        "file_path": file_path,
        "line": int(line_num),
        "severity": severity,
        "type": issue_type,
        "message": description,
        "project": "wedsync-2025"
    }

def calculate_complexity(issue):
    """Calculate complexity score (1-10) to route to Speed vs Deep agents."""
    message = issue["message"].lower()
    severity = issue["severity"]
    
    # Deep job indicators (6-10 complexity)
    if "cognitive complexity" in message:
        return 9
    elif "refactor this function" in message:
        return 8
    elif severity == "CRITICAL":
        return 8
    elif severity == "MAJOR":
        return 7
    elif "security" in message or "vulnerability" in message:
        return 7
    
    # Speed job indicators (1-5 complexity)  
    elif "unused import" in message:
        return 2
    elif "pascalcase" in message or "camelcase" in message:
        return 3
    elif severity == "MINOR":
        return 3
    elif "remove this" in message:
        return 2
    
    return 4  # Default to speed

def create_job_file(issue, job_id, output_dir):
    """Create a job file for the parallel agents."""
    complexity = calculate_complexity(issue)
    
    job_data = {
        "job_id": job_id,
        "issue": {
            "id": job_id,
            "file_path": issue["file_path"],
            "line": issue["line"],
            "severity": issue["severity"],
            "type": issue["type"],
            "message": issue["message"],
            "project": issue["project"]
        },
        "complexity_score": complexity,
        "estimated_time_minutes": 5 if complexity <= 5 else 20,
        "requires_agents": ["security-officer"] if complexity >= 7 else [],
        "source": "real-sonarqube-issues",
        "created_at": datetime.now().isoformat()
    }
    
    # Route to appropriate queue
    if complexity <= 5:
        job_file = os.path.join(output_dir, "REAL-SPEED-JOBS", f"{job_id}.json")
    else:
        job_file = os.path.join(output_dir, "REAL-DEEP-JOBS", f"{job_id}.json")
    
    os.makedirs(os.path.dirname(job_file), exist_ok=True)
    
    with open(job_file, 'w') as f:
        json.dump(job_data, f, indent=2)
    
    return "SPEED" if complexity <= 5 else "DEEP"

def main():
    print("🚀 CONVERTING 500+ REAL ISSUES TO PARALLEL AGENT JOBS...")
    print("=" * 60)
    
    # Read real issues
    issues_file = "../../../sonarqube-reports/issues-by-file.txt"
    if not os.path.exists(issues_file):
        print(f"❌ Could not find {issues_file}")
        return
    
    speed_jobs = 0
    deep_jobs = 0
    
    with open(issues_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            if not line.strip():
                continue
                
            issue = parse_issue_line(line)
            if not issue:
                print(f"⚠️  Could not parse line {line_num}: {line.strip()[:50]}...")
                continue
            
            job_id = f"real-{str(uuid.uuid4())[:8]}"
            job_type = create_job_file(issue, job_id, ".")
            
            if job_type == "SPEED":
                speed_jobs += 1
            else:
                deep_jobs += 1
            
            if (speed_jobs + deep_jobs) % 50 == 0:
                print(f"   Processed {speed_jobs + deep_jobs} real issues...")
    
    print(f"\n✅ REAL ISSUE CONVERSION COMPLETE!")
    print(f"   📊 Speed Jobs Created: {speed_jobs}")
    print(f"   🧠 Deep Jobs Created: {deep_jobs}")
    print(f"   📋 Total Real Issues: {speed_jobs + deep_jobs}")
    print(f"\n🚀 Your 5-agent army now has {speed_jobs + deep_jobs} REAL jobs to process!")

if __name__ == "__main__":
    main()