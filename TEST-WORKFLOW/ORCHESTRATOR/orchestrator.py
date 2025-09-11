#!/usr/bin/env python3
"""
WedSync TEST-WORKFLOW Orchestrator
==================================

Central intelligence system that:
1. Ingests ALL errors from various sources (SonarQube, TypeScript, etc)
2. Pre-analyzes and categorizes by complexity
3. Creates optimized job queues for Speed vs Deep agents
4. Prevents duplicate work and unnecessary verification

Usage:
    python3 orchestrator.py --ingest sonarqube-results.json
    python3 orchestrator.py --ingest typescript-errors.txt  
    python3 orchestrator.py --process-all
    python3 orchestrator.py --status
"""

import json
import os
import sys
import argparse
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import hashlib

@dataclass
class Issue:
    id: str
    source: str  # sonarqube, typescript, eslint
    severity: str
    rule_id: str
    file_path: str
    line: int
    message: str
    category: str
    raw_data: Dict[str, Any]

@dataclass  
class Job:
    id: str
    issue: Issue
    job_type: str  # SPEED, DEEP, SKIP
    complexity_score: int
    estimated_minutes: int
    pattern: Optional[str]
    requires_agents: List[str]
    verification_level: str
    similar_fixes: List[str]
    created_at: str

class WedSyncOrchestrator:
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.job_queues_path = self.base_path / "JOB-QUEUES"
        self.patterns_file = self.base_path / "ORCHESTRATOR" / "pattern-library.json"
        
        # Create directories
        self.setup_directories()
        
        # Load pattern library
        self.patterns = self.load_patterns()
        
        # Stats
        self.stats = {
            'total_issues': 0,
            'speed_jobs': 0,
            'deep_jobs': 0,
            'skip_jobs': 0,
            'failed_routing': 0
        }

    def setup_directories(self):
        """Create the job queue directory structure"""
        dirs = [
            "JOB-QUEUES/SPEED-JOBS/pattern-single-return",
            "JOB-QUEUES/SPEED-JOBS/pattern-async-await", 
            "JOB-QUEUES/SPEED-JOBS/pattern-switch-cases",
            "JOB-QUEUES/SPEED-JOBS/pattern-import-fixes",
            "JOB-QUEUES/SPEED-JOBS/pattern-type-assertions",
            "JOB-QUEUES/DEEP-JOBS/security-sensitive",
            "JOB-QUEUES/DEEP-JOBS/architecture-changes",
            "JOB-QUEUES/DEEP-JOBS/new-patterns",
            "JOB-QUEUES/DEEP-JOBS/performance-critical",
            "JOB-QUEUES/SKIP-JOBS",
            "JOB-QUEUES/FAILED-ROUTING",
            "ORCHESTRATOR"
        ]
        
        for dir_path in dirs:
            (self.base_path / dir_path).mkdir(parents=True, exist_ok=True)

    def load_patterns(self) -> Dict[str, Any]:
        """Load known fix patterns from library"""
        if self.patterns_file.exists():
            with open(self.patterns_file, 'r') as f:
                return json.load(f)
        
        # Default patterns based on WedSync session experience
        default_patterns = {
            "sonar-S3516": {
                "name": "single-return-refactor",
                "complexity": 2,
                "pattern": "Multiple early returns -> Single return point",
                "verification": "BASIC",
                "estimated_minutes": 5,
                "success_rate": 0.95
            },
            "sonar-S128": {
                "name": "switch-case-breaks", 
                "complexity": 1,
                "pattern": "Add break statements to switch cases",
                "verification": "BASIC",
                "estimated_minutes": 3,
                "success_rate": 0.98
            },
            "typescript-missing-await": {
                "name": "async-await-fix",
                "complexity": 3,
                "pattern": "Add await to async function calls",
                "verification": "MEDIUM",
                "estimated_minutes": 8,
                "success_rate": 0.90
            }
        }
        
        # Save default patterns
        with open(self.patterns_file, 'w') as f:
            json.dump(default_patterns, f, indent=2)
            
        return default_patterns

    def ingest_sonarqube(self, file_path: str) -> List[Issue]:
        """Ingest SonarQube JSON results (handles both standard and WedSync custom format)"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except UnicodeDecodeError:
            print(f"   ⚠️  Encoding error in {file_path} (skipping)")
            return []
        except json.JSONDecodeError:
            print(f"   ⚠️  Invalid JSON in {file_path} (skipping)")
            return []
        
        issues = []
        
        # Check if it's WedSync custom format
        if 'error_categories' in data:
            # WedSync custom format
            for severity, category_data in data['error_categories'].items():
                for item in category_data.get('issues', []):
                    file_line_key = f"{item.get('file')}{item.get('line')}"
                    hash_suffix = hashlib.md5(file_line_key.encode()).hexdigest()[:8]
                    
                    issue = Issue(
                        id=item.get('id', f"sonar-{item.get('rule')}-{hash_suffix}"),
                        source='sonarqube',
                        severity=item.get('severity', severity).upper(),
                        rule_id=item.get('rule', ''),
                        file_path=item.get('file', ''),
                        line=item.get('line', 0),
                        message=item.get('message', ''),
                        category=self.categorize_sonar_rule(item.get('rule', '')),
                        raw_data=item
                    )
                    issues.append(issue)
        else:
            # Standard SonarQube format
            for item in data.get('issues', []):
                component_line = f"{item.get('component')}{item.get('line')}"
                hash_suffix = hashlib.md5(component_line.encode()).hexdigest()[:8]
                issue = Issue(
                    id=f"sonar-{item.get('rule')}-{hash_suffix}",
                    source='sonarqube',
                    severity=item.get('severity', 'UNKNOWN').upper(),
                    rule_id=item.get('rule', ''),
                    file_path=item.get('component', ''),
                    line=item.get('line', 0),
                    message=item.get('message', ''),
                    category=self.categorize_sonar_rule(item.get('rule', '')),
                    raw_data=item
                )
                issues.append(issue)
            
        return issues

    def ingest_coderabbit(self, file_path: str) -> List[Issue]:
        """Ingest CodeRabbit JSON results"""
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        issues = []
        for item in data:
            file_line_key = f"{item.get('file')}{item.get('line')}"
            hash_suffix = hashlib.md5(file_line_key.encode()).hexdigest()[:8]
            
            issue = Issue(
                id=f"cr-{item.get('pr')}-{hash_suffix}",
                source='coderabbit',
                severity=self.map_coderabbit_severity(item.get('severity', 'minor')),
                rule_id=f"CR-{item.get('severity', 'refactor')}",
                file_path=item.get('file', ''),
                line=item.get('line', 0),
                message=item.get('summary', ''),
                category='refactor',
                raw_data=item
            )
            issues.append(issue)
            
        return issues

    def map_coderabbit_severity(self, severity: str) -> str:
        """Map CodeRabbit severity to standard levels"""
        severity_map = {
            'critical': 'CRITICAL',
            'major': 'MAJOR', 
            'minor': 'MINOR',
            'refactor': 'MINOR',
            'style': 'INFO'
        }
        return severity_map.get(severity.lower(), 'MINOR')

    def ingest_typescript(self, file_path: str) -> List[Issue]:
        """Ingest TypeScript error output"""
        issues = []
        with open(file_path, 'r') as f:
            for line_num, line in enumerate(f):
                if 'error TS' in line:
                    # Parse: file.ts(123,45): error TS2345: Message
                    parts = line.strip().split(': error TS')
                    if len(parts) >= 2:
                        file_info = parts[0]
                        error_info = parts[1]
                        
                        file_path = file_info.split('(')[0]
                        line_info = file_info.split('(')[1].split(')')[0] if '(' in file_info else '0,0'
                        line_number = int(line_info.split(',')[0]) if line_info else 0
                        
                        error_code = error_info.split(':')[0]
                        message = ':'.join(error_info.split(':')[1:]).strip()
                        
                        file_line_key = f"{file_path}{line_number}"
                        hash_suffix = hashlib.md5(file_line_key.encode()).hexdigest()[:8]
                        
                        issue = Issue(
                            id=f"ts-{error_code}-{hash_suffix}",
                            source='typescript',
                            severity=self.map_ts_severity(error_code),
                            rule_id=f"TS{error_code}",
                            file_path=file_path,
                            line=line_number,
                            message=message,
                            category=self.categorize_ts_error(error_code),
                            raw_data={'original_line': line.strip()}
                        )
                        issues.append(issue)
        
        return issues

    def categorize_sonar_rule(self, rule: str) -> str:
        """Categorize SonarQube rules"""
        security_rules = ['S2068', 'S2070', 'S3649', 'S4502', 'S5122']
        performance_rules = ['S1854', 'S1481', 'S3776']
        maintainability_rules = ['S3516', 'S128', 'S1172']
        
        if any(r in rule for r in security_rules):
            return 'security'
        elif any(r in rule for r in performance_rules):
            return 'performance'
        elif any(r in rule for r in maintainability_rules):
            return 'maintainability'
        else:
            return 'general'

    def categorize_ts_error(self, error_code: str) -> str:
        """Categorize TypeScript errors"""
        type_errors = ['2345', '2322', '2339', '2304']
        async_errors = ['1308', '2335', '2794']
        import_errors = ['2307', '2306', '2305']
        
        if error_code in type_errors:
            return 'types'
        elif error_code in async_errors:
            return 'async'
        elif error_code in import_errors:
            return 'imports'
        else:
            return 'syntax'

    def map_ts_severity(self, error_code: str) -> str:
        """Map TypeScript error codes to severity levels"""
        critical_errors = ['1005', '1109', '1128']  # Syntax errors
        major_errors = ['2345', '2322', '2339']     # Type errors
        
        if error_code in critical_errors:
            return 'CRITICAL'
        elif error_code in major_errors:
            return 'MAJOR'
        else:
            return 'MINOR'

    def check_already_resolved(self, issue: Issue) -> bool:
        """Check if issue is already resolved via git blame/status"""
        # For realistic demo issues, check if they have status=NEW
        if hasattr(issue, 'raw_data') and issue.raw_data.get('status') == 'NEW':
            return False
            
        # For existing issues, use git checking
        try:
            # Check if file still exists
            full_path = Path(issue.file_path)
            if not full_path.exists():
                return True
                
            # Check git blame on the specific line
            result = subprocess.run([
                'git', 'blame', '-L', f'{issue.line},{issue.line}', str(full_path)
            ], capture_output=True, text=True, cwd=self.base_path.parent)
            
            if result.returncode != 0:
                return False
                
            # Check if the line was modified recently (after known fix commits)
            blame_output = result.stdout.strip()
            if 'b0b8db54' in blame_output:  # Known fix commit from session report
                return True
                
        except Exception as e:
            print(f"Warning: Could not check git status for {issue.file_path}: {e}")
            
        return False

    def calculate_complexity(self, issue: Issue) -> int:
        """Score issue complexity (1-10, 1=simple, 10=complex)"""
        score = 0
        
        # Base score by severity
        severity_scores = {
            'BLOCKER': 8,
            'CRITICAL': 6, 
            'MAJOR': 4,
            'MINOR': 2,
            'INFO': 1
        }
        score += severity_scores.get(issue.severity, 3)
        
        # Pattern complexity from library
        pattern_key = issue.rule_id.lower().replace('ts', 'typescript-')
        if pattern_key in self.patterns:
            score = self.patterns[pattern_key].get('complexity', score)
        
        # File path complexity (security-sensitive areas)
        sensitive_paths = ['/api/', '/auth/', '/payment/', '/marketplace/']
        if any(path in issue.file_path.lower() for path in sensitive_paths):
            score += 3
            
        # Category complexity  
        if issue.category == 'security':
            score += 4
        elif issue.category == 'performance':
            score += 2
            
        return min(score, 10)

    def find_similar_fixes(self, issue: Issue) -> List[str]:
        """Find similar fixes from git history"""
        try:
            # Search for commits that fixed similar rule violations
            result = subprocess.run([
                'git', 'log', '--grep', issue.rule_id, '--oneline', '-n', '5'
            ], capture_output=True, text=True, cwd=self.base_path.parent)
            
            if result.returncode == 0:
                return [line.split()[0] for line in result.stdout.strip().split('\n') if line]
                
        except Exception:
            pass
            
        return []

    def route_issue(self, issue: Issue) -> Job:
        """Route issue to appropriate job queue"""
        # Check if already resolved
        if self.check_already_resolved(issue):
            return Job(
                id=f"job-{issue.id}",
                issue=issue,
                job_type="SKIP",
                complexity_score=0,
                estimated_minutes=1,
                pattern="already-resolved",
                requires_agents=[],
                verification_level="NONE",
                similar_fixes=[],
                created_at=datetime.now().isoformat()
            )
        
        # Calculate complexity
        complexity = self.calculate_complexity(issue)
        similar_fixes = self.find_similar_fixes(issue)
        
        # Route based on complexity
        if complexity <= 3:
            # SPEED JOB
            pattern = self.get_pattern_name(issue)
            return Job(
                id=f"job-{issue.id}",
                issue=issue,
                job_type="SPEED",
                complexity_score=complexity,
                estimated_minutes=5,
                pattern=pattern,
                requires_agents=[],
                verification_level="BASIC",
                similar_fixes=similar_fixes,
                created_at=datetime.now().isoformat()
            )
        else:
            # DEEP JOB
            agents_needed = []
            if issue.category == 'security' or 'auth' in issue.file_path.lower():
                agents_needed.append('security-officer')
            if complexity >= 8:
                agents_needed.append('architecture-reviewer')
                
            return Job(
                id=f"job-{issue.id}",
                issue=issue,
                job_type="DEEP", 
                complexity_score=complexity,
                estimated_minutes=complexity * 3,
                pattern=None,
                requires_agents=agents_needed,
                verification_level="COMPREHENSIVE",
                similar_fixes=similar_fixes,
                created_at=datetime.now().isoformat()
            )

    def get_pattern_name(self, issue: Issue) -> str:
        """Get pattern name for speed job routing"""
        rule_patterns = {
            'S3516': 'pattern-single-return',
            'S128': 'pattern-switch-cases',
            '2794': 'pattern-async-await',
            '2307': 'pattern-import-fixes',
            '2345': 'pattern-type-assertions'
        }
        
        for rule_fragment, pattern in rule_patterns.items():
            if rule_fragment in issue.rule_id:
                return pattern
                
        return 'pattern-general'

    def save_job(self, job: Job):
        """Save job to appropriate queue"""
        if job.job_type == "SPEED":
            if job.pattern:
                queue_dir = self.job_queues_path / "SPEED-JOBS" / job.pattern
            else:
                queue_dir = self.job_queues_path / "SPEED-JOBS" / "pattern-general"
        elif job.job_type == "DEEP":
            if job.issue.category == 'security':
                queue_dir = self.job_queues_path / "DEEP-JOBS" / "security-sensitive"
            elif job.complexity_score >= 8:
                queue_dir = self.job_queues_path / "DEEP-JOBS" / "architecture-changes"
            else:
                queue_dir = self.job_queues_path / "DEEP-JOBS" / "new-patterns"
        elif job.job_type == "SKIP":
            queue_dir = self.job_queues_path / "SKIP-JOBS"
        else:
            queue_dir = self.job_queues_path / "FAILED-ROUTING"
            
        queue_dir.mkdir(parents=True, exist_ok=True)
        
        # Save job file
        job_file = queue_dir / f"{job.id}.json"
        with open(job_file, 'w') as f:
            json.dump(asdict(job), f, indent=2)
            
        # Update stats
        self.stats[f'{job.job_type.lower()}_jobs'] += 1

    def process_issues(self, issues: List[Issue]):
        """Process all issues and create job queues"""
        print(f"\n🏗️  Processing {len(issues)} issues...")
        
        for i, issue in enumerate(issues):
            if i % 100 == 0:
                print(f"   Processed {i}/{len(issues)} issues...")
                
            job = self.route_issue(issue)
            self.save_job(job)
            
        self.stats['total_issues'] = len(issues)
        print(f"✅ Completed processing {len(issues)} issues")

    def generate_summary(self):
        """Generate orchestrator summary"""
        summary = {
            'timestamp': datetime.now().isoformat(),
            'stats': self.stats,
            'queue_status': self.get_queue_status(),
            'recommendations': self.get_recommendations()
        }
        
        summary_file = self.base_path / "ORCHESTRATOR" / "orchestration-summary.json"
        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2)
            
        return summary

    def get_queue_status(self) -> Dict[str, int]:
        """Get count of jobs in each queue"""
        status = {}
        
        for queue_type in ['SPEED-JOBS', 'DEEP-JOBS', 'SKIP-JOBS']:
            queue_path = self.job_queues_path / queue_type
            if queue_path.exists():
                total = 0
                for subdir in queue_path.iterdir():
                    if subdir.is_dir():
                        total += len(list(subdir.glob('*.json')))
                status[queue_type] = total
            else:
                status[queue_type] = 0
                
        return status

    def get_recommendations(self) -> List[str]:
        """Generate recommendations based on job distribution"""
        recommendations = []
        
        if self.stats['speed_jobs'] > self.stats['deep_jobs'] * 3:
            recommendations.append("Consider starting with 2-3 speed agents and 1 deep agent")
        elif self.stats['deep_jobs'] > self.stats['speed_jobs']:
            recommendations.append("Consider starting with 1-2 speed agents and 2-3 deep agents") 
        else:
            recommendations.append("Balanced workload - start with 2 speed agents and 2 deep agents")
            
        if self.stats['skip_jobs'] > self.stats['total_issues'] * 0.3:
            recommendations.append(f"High skip rate ({self.stats['skip_jobs']} issues already resolved)")
            
        return recommendations

def main():
    parser = argparse.ArgumentParser(description='WedSync TEST-WORKFLOW Orchestrator')
    parser.add_argument('--ingest-sonarqube', help='Ingest SonarQube JSON file')
    parser.add_argument('--ingest-coderabbit', help='Ingest CodeRabbit JSON file')
    parser.add_argument('--ingest-typescript', help='Ingest TypeScript error file')
    parser.add_argument('--process-all', action='store_true', help='Process all ingested issues')
    parser.add_argument('--process-everything', action='store_true', help='Process all available files in INCOMING/')
    parser.add_argument('--status', action='store_true', help='Show orchestrator status')
    parser.add_argument('--base-path', default='.', help='Base path for TEST-WORKFLOW')
    
    args = parser.parse_args()
    
    orchestrator = WedSyncOrchestrator(args.base_path)
    
    all_issues = []
    
    if args.process_everything:
        print(f"📥 Processing all available files in INCOMING/...")
        incoming_dir = Path(args.base_path) / "QUEUES" / "INCOMING"
        
        for file_path in incoming_dir.glob("*.json"):
            # Skip Mac OS hidden files
            if file_path.name.startswith('._'):
                continue
                
            if "sonarqube" in file_path.name.lower():
                print(f"   📊 Processing SonarQube: {file_path.name}")
                issues = orchestrator.ingest_sonarqube(str(file_path))
                print(f"      Found {len(issues)} SonarQube issues")
                all_issues.extend(issues)
            elif "coderabbit" in file_path.name.lower():
                print(f"   🐰 Processing CodeRabbit: {file_path.name}")
                issues = orchestrator.ingest_coderabbit(str(file_path))
                print(f"      Found {len(issues)} CodeRabbit issues")
                all_issues.extend(issues)
            elif "performance" in file_path.name.lower():
                print(f"   ⚡ Processing Performance Audit: {file_path.name}")
                issues = orchestrator.ingest_coderabbit(str(file_path))  # Same format as CodeRabbit
                print(f"      Found {len(issues)} Performance issues")
                all_issues.extend(issues)
            elif "synthetic" in file_path.name.lower():
                print(f"   🧪 Processing Synthetic Test Data: {file_path.name}")
                issues = orchestrator.ingest_sonarqube(str(file_path))  # Same format as SonarQube
                print(f"      Found {len(issues)} Synthetic issues")
                all_issues.extend(issues)
            elif "production" in file_path.name.lower():
                print(f"   🏭 Processing Production Scale Data: {file_path.name}")
                issues = orchestrator.ingest_sonarqube(str(file_path))  # Same format as SonarQube
                print(f"      Found {len(issues)} Production issues")
                all_issues.extend(issues)
            elif "realistic" in file_path.name.lower():
                print(f"   🎯 Processing Realistic Test Data: {file_path.name}")
                issues = orchestrator.ingest_sonarqube(str(file_path))  # Same format as SonarQube
                print(f"      Found {len(issues)} Realistic issues")
                all_issues.extend(issues)
            else:
                print(f"   ⚠️  Unknown format: {file_path.name} (skipping)")
                
        for file_path in incoming_dir.glob("typescript*.txt"):
            print(f"   📝 Processing TypeScript: {file_path.name}")
            issues = orchestrator.ingest_typescript(str(file_path))
            print(f"      Found {len(issues)} TypeScript issues")
            all_issues.extend(issues)
    
    if args.ingest_sonarqube:
        print(f"📥 Ingesting SonarQube results from {args.ingest_sonarqube}")
        issues = orchestrator.ingest_sonarqube(args.ingest_sonarqube)
        print(f"   Found {len(issues)} SonarQube issues")
        all_issues.extend(issues)
        
    if args.ingest_coderabbit:
        print(f"📥 Ingesting CodeRabbit results from {args.ingest_coderabbit}")
        issues = orchestrator.ingest_coderabbit(args.ingest_coderabbit)
        print(f"   Found {len(issues)} CodeRabbit issues")
        all_issues.extend(issues)
        
    if args.ingest_typescript:
        print(f"📥 Ingesting TypeScript errors from {args.ingest_typescript}")
        issues = orchestrator.ingest_typescript(args.ingest_typescript)
        print(f"   Found {len(issues)} TypeScript issues")
        all_issues.extend(issues)
        
    if (args.process_all or args.process_everything) and all_issues:
        orchestrator.process_issues(all_issues)
        summary = orchestrator.generate_summary()
        
        print(f"\n📊 ORCHESTRATION COMPLETE")
        print(f"════════════════════════")
        print(f"Total Issues Processed: {summary['stats']['total_issues']}")
        print(f"Speed Jobs Created: {summary['stats']['speed_jobs']}")
        print(f"Deep Jobs Created: {summary['stats']['deep_jobs']}")
        print(f"Skip Jobs (Already Resolved): {summary['stats']['skip_jobs']}")
        print(f"\n💡 Recommendations:")
        for rec in summary['recommendations']:
            print(f"   • {rec}")
            
        print(f"\n🚀 Next Steps:")
        print(f"   1. Start speed agents: cd JOB-QUEUES/SPEED-JOBS && ./claim-speed-job.sh")
        print(f"   2. Start deep agents: cd JOB-QUEUES/DEEP-JOBS && ./claim-deep-job.sh")
    elif args.process_everything and not all_issues:
        print(f"   No issues found in INCOMING/ directory")
        
    elif args.status:
        summary = orchestrator.generate_summary()
        queue_status = summary['queue_status']
        
        print(f"\n📊 ORCHESTRATOR STATUS")
        print(f"═══════════════════════")
        for queue, count in queue_status.items():
            print(f"{queue}: {count} jobs")
            
    else:
        parser.print_help()

if __name__ == "__main__":
    main()