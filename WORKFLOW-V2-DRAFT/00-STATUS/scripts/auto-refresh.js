// Auto-refresh Dashboard System
class DashboardUpdater {
    constructor() {
        this.updateInterval = 30000; // 30 seconds
        this.lastUpdate = null;
        this.isUpdating = false;
        this.init();
    }

    init() {
        this.loadLiveData();
        this.startAutoRefresh();
        this.addManualRefreshButton();
    }

    async loadLiveData() {
        if (this.isUpdating) return;
        
        this.isUpdating = true;
        try {
            // Load live status
            const response = await fetch('./data/live-status.json?t=' + Date.now());
            if (!response.ok) throw new Error('Failed to load live data');
            
            const data = await response.json();
            this.updateDashboard(data);
            this.lastUpdate = new Date();
            this.updateLastRefreshTime();
            
        } catch (error) {
            console.error('Error loading live data:', error);
            this.showError('Failed to update dashboard data');
        } finally {
            this.isUpdating = false;
        }
    }

    updateDashboard(data) {
        // Update main stats
        this.updateStats(data);
        
        // Update recent completions
        this.updateRecentCompletions(data.recent_completions);
        
        // Update team progress
        this.updateTeamProgress(data.team_progress);
        
        // Update testing pipeline
        this.updateTestingStatus(data.testing_pipeline);
        
        // Update feature cards if on delivered features page
        if (window.location.pathname.includes('delivered-features.html')) {
            this.updateFeatureCards(data.features);
        }
    }

    updateStats(data) {
        const statElements = {
            '.stat-number': [
                data.completed_features || '144+',
                data.total_features || '210',
                Math.round(data.overall_progress) + '%' || '68.6%',
                data.production_ready || '1'
            ]
        };

        document.querySelectorAll('.stat-number').forEach((el, index) => {
            if (statElements['.stat-number'][index]) {
                el.textContent = statElements['.stat-number'][index];
            }
        });
    }

    updateRecentCompletions(recentCompletions) {
        if (!recentCompletions) return;

        // Create or update recent completions section
        let recentSection = document.getElementById('recent-completions');
        if (!recentSection) {
            recentSection = this.createRecentCompletionsSection();
        }

        const html = recentCompletions.map(item => `
            <div class="recent-item">
                <div class="recent-feature">
                    <strong>${item.feature_id}</strong> - ${item.name}
                </div>
                <div class="recent-details">
                    ${item.team} • ${new Date(item.completed_date).toLocaleDateString()}
                </div>
            </div>
        `).join('');

        recentSection.innerHTML = `
            <h3>🎉 Recently Completed</h3>
            <div class="recent-list">${html}</div>
        `;
    }

    updateTeamProgress(teamProgress) {
        if (!teamProgress) return;

        // Update team progress cards
        Object.entries(teamProgress).forEach(([team, progress]) => {
            const teamCard = document.querySelector(`[data-team="${team}"]`);
            if (teamCard) {
                teamCard.querySelector('.completion-rate').textContent = 
                    progress.completion_rate.toFixed(1) + '%';
                teamCard.querySelector('.completed-count').textContent = 
                    progress.completed;
                teamCard.querySelector('.in-progress-count').textContent = 
                    progress.in_progress;
            }
        });
    }

    updateTestingStatus(testingPipeline) {
        if (!testingPipeline) return;

        const testingSection = document.getElementById('testing-status') || 
                              this.createTestingStatusSection();
        
        testingSection.innerHTML = `
            <h3>🧪 Testing Pipeline Status</h3>
            <div class="testing-grid">
                <div class="testing-stat">
                    <div class="testing-number">${testingPipeline.needs_testing}</div>
                    <div class="testing-label">Needs Testing</div>
                </div>
                <div class="testing-stat">
                    <div class="testing-number">${testingPipeline.in_testing}</div>
                    <div class="testing-label">In Testing</div>
                </div>
                <div class="testing-stat">
                    <div class="testing-number">${testingPipeline.testing_passed}</div>
                    <div class="testing-label">Tests Passed</div>
                </div>
                <div class="testing-stat">
                    <div class="testing-number">${testingPipeline.testing_failed}</div>
                    <div class="testing-label">Tests Failed</div>
                </div>
            </div>
        `;
    }

    updateFeatureCards(features) {
        if (!features) return;

        // Update existing feature cards with latest data
        features.forEach(feature => {
            const featureCard = document.querySelector(`[data-feature-id="${feature.feature_id}"]`);
            if (featureCard) {
                // Update status badges
                const statusBadge = featureCard.querySelector('.completion-badge');
                if (statusBadge) {
                    statusBadge.textContent = feature.production_ready ? '✅ Production Ready' : 
                                            feature.testing_status === 'passed' ? '✅ Tests Passed' :
                                            '⚠️ Needs Testing';
                }

                // Update testing status
                const testingStatus = featureCard.querySelector('.testing-status');
                if (testingStatus) {
                    testingStatus.textContent = this.getTestingStatusText(feature.testing_status, feature.production_ready);
                }
            }
        });
    }

    getTestingStatusText(testingStatus, productionReady) {
        if (productionReady) return '✅ Production Ready';
        
        switch (testingStatus) {
            case 'passed': return '✅ Tests Passed';
            case 'in-testing': return '🧪 Testing in Progress';
            case 'failed': return '❌ Tests Failed';
            case 'needs-testing':
            default: return '⚠️ Needs Testing';
        }
    }

    createRecentCompletionsSection() {
        const section = document.createElement('div');
        section.id = 'recent-completions';
        section.className = 'progress-section';
        document.querySelector('.container').appendChild(section);
        return section;
    }

    createTestingStatusSection() {
        const section = document.createElement('div');
        section.id = 'testing-status';
        section.className = 'progress-section';
        document.querySelector('.container').appendChild(section);
        return section;
    }

    startAutoRefresh() {
        setInterval(() => {
            this.loadLiveData();
        }, this.updateInterval);
    }

    addManualRefreshButton() {
        const refreshButton = document.createElement('button');
        refreshButton.textContent = '🔄 Refresh Now';
        refreshButton.className = 'nav-btn';
        refreshButton.style.position = 'fixed';
        refreshButton.style.bottom = '20px';
        refreshButton.style.right = '20px';
        refreshButton.style.zIndex = '1000';
        
        refreshButton.addEventListener('click', () => {
            this.loadLiveData();
        });

        document.body.appendChild(refreshButton);
    }

    updateLastRefreshTime() {
        let timeIndicator = document.getElementById('last-update-time');
        if (!timeIndicator) {
            timeIndicator = document.createElement('div');
            timeIndicator.id = 'last-update-time';
            timeIndicator.style.position = 'fixed';
            timeIndicator.style.bottom = '20px';
            timeIndicator.style.left = '20px';
            timeIndicator.style.background = 'rgba(255, 255, 255, 0.9)';
            timeIndicator.style.padding = '10px';
            timeIndicator.style.borderRadius = '8px';
            timeIndicator.style.fontSize = '0.8em';
            timeIndicator.style.color = '#666';
            timeIndicator.style.zIndex = '999';
            document.body.appendChild(timeIndicator);
        }

        timeIndicator.textContent = `Last updated: ${this.lastUpdate.toLocaleTimeString()}`;
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.textContent = message;
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '20px';
        errorDiv.style.right = '20px';
        errorDiv.style.background = '#fee';
        errorDiv.style.color = '#c53030';
        errorDiv.style.padding = '15px';
        errorDiv.style.borderRadius = '8px';
        errorDiv.style.border = '1px solid #fc8181';
        errorDiv.style.zIndex = '1001';

        document.body.appendChild(errorDiv);

        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 5000);
    }
}

// Initialize dashboard updater when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardUpdater = new DashboardUpdater();
});

// Add CSS for new elements
const style = document.createElement('style');
style.textContent = `
    .recent-item {
        padding: 10px;
        border-bottom: 1px solid #e2e8f0;
        margin-bottom: 8px;
    }
    
    .recent-feature {
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 4px;
    }
    
    .recent-details {
        font-size: 0.9em;
        color: #718096;
    }
    
    .testing-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
        margin-top: 15px;
    }
    
    .testing-stat {
        text-align: center;
        padding: 15px;
        background: rgba(72, 187, 120, 0.1);
        border-radius: 8px;
    }
    
    .testing-number {
        font-size: 1.8em;
        font-weight: bold;
        color: #48bb78;
        margin-bottom: 5px;
    }
    
    .testing-label {
        font-size: 0.9em;
        color: #4a5568;
        font-weight: 600;
    }
`;
document.head.appendChild(style);