// Review management system
export class ReviewManager {
  private reviewPromptTriggers = {
    minSessionCount: 5,
    minDaysInstalled: 7,
    mustHaveCompletedAction: true,
    noRecentPromptDays: 60,
    positiveSignalsRequired: 3,
  };

  async evaluateReviewPrompt(): Promise<boolean> {
    const userState = await this.getUserState();

    // Check all trigger conditions
    const meetsRequirements =
      userState.sessionCount >= this.reviewPromptTriggers.minSessionCount &&
      userState.daysInstalled >= this.reviewPromptTriggers.minDaysInstalled &&
      userState.hasCompletedAction &&
      userState.daysSinceLastPrompt >=
        this.reviewPromptTriggers.noRecentPromptDays;

    if (!meetsRequirements) return false;

    // Check for positive signals
    const positiveSignals = this.detectPositiveSignals(userState);

    return positiveSignals >= this.reviewPromptTriggers.positiveSignalsRequired;
  }

  private detectPositiveSignals(userState: any): number {
    let signals = 0;

    // Just completed a wedding successfully
    if (userState.recentWeddingCompleted) signals++;

    // High client engagement
    if (userState.clientResponseRate > 0.8) signals++;

    // Using advanced features
    if (userState.automationUsage > 0) signals++;

    // Repeat usage pattern
    if (userState.consecutiveDaysActive >= 3) signals++;

    return signals;
  }

  async showReviewPrompt(): Promise<void> {
    // First ask for feedback
    const feedbackResponse = await this.showFeedbackDialog();

    if (feedbackResponse === 'positive') {
      // Direct to app store
      this.showAppStoreReview();
    } else if (feedbackResponse === 'negative') {
      // Direct to feedback form
      this.showFeedbackForm();
    }

    // Record that we showed the prompt
    localStorage.setItem('last_review_prompt', new Date().toISOString());
  }

  private async showFeedbackDialog(): Promise<
    'positive' | 'negative' | 'dismissed'
  > {
    return new Promise((resolve) => {
      // Create modal dialog
      const modal = document.createElement('div');
      modal.className =
        'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md mx-4">
          <h3 class="text-lg font-semibold mb-4">How's your WedSync experience?</h3>
          <p class="text-gray-600 mb-6">We'd love to hear about your experience managing weddings with WedSync!</p>
          <div class="flex space-x-3">
            <button id="review-positive" class="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Great! 😊
            </button>
            <button id="review-negative" class="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300">
              Could be better
            </button>
            <button id="review-dismiss" class="px-4 py-2 text-gray-500 hover:text-gray-700">
              Not now
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Handle button clicks
      modal.querySelector('#review-positive')?.addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve('positive');
      });

      modal.querySelector('#review-negative')?.addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve('negative');
      });

      modal.querySelector('#review-dismiss')?.addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve('dismissed');
      });
    });
  }

  private showAppStoreReview(): void {
    // Show encouraging message before directing to app store
    const modal = document.createElement('div');
    modal.className =
      'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md mx-4">
        <h3 class="text-lg font-semibold mb-4">Thank you! 🎉</h3>
        <p class="text-gray-600 mb-6">We're so glad you're enjoying WedSync! Would you mind taking a moment to rate us in the app store? It really helps other wedding professionals discover our platform.</p>
        <div class="flex space-x-3">
          <button id="rate-now" class="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Rate WedSync ⭐
          </button>
          <button id="rate-later" class="px-4 py-2 text-gray-500 hover:text-gray-700">
            Maybe later
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#rate-now')?.addEventListener('click', () => {
      document.body.removeChild(modal);
      this.openAppStoreReview();
    });

    modal.querySelector('#rate-later')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  }

  private showFeedbackForm(): void {
    // Show feedback collection form
    const modal = document.createElement('div');
    modal.className =
      'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md mx-4">
        <h3 class="text-lg font-semibold mb-4">Help us improve 💡</h3>
        <p class="text-gray-600 mb-4">We'd love to hear how we can make WedSync better for you:</p>
        <textarea id="feedback-text" class="w-full p-3 border rounded-lg mb-4" rows="4" placeholder="Tell us what could be improved..."></textarea>
        <div class="flex space-x-3">
          <button id="send-feedback" class="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Send Feedback
          </button>
          <button id="cancel-feedback" class="px-4 py-2 text-gray-500 hover:text-gray-700">
            Cancel
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#send-feedback')?.addEventListener('click', () => {
      const feedback = (
        modal.querySelector('#feedback-text') as HTMLTextAreaElement
      ).value;
      this.sendFeedbackToTeam(feedback);
      document.body.removeChild(modal);
    });

    modal.querySelector('#cancel-feedback')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  }

  private openAppStoreReview(): void {
    const userAgent = navigator.userAgent;
    let reviewUrl = '';

    if (/iPad|iPhone|iPod/.test(userAgent)) {
      // iOS App Store
      reviewUrl =
        'https://apps.apple.com/app/wedsync/id1234567890?action=write-review';
    } else if (/Android/.test(userAgent)) {
      // Google Play Store
      reviewUrl =
        'https://play.google.com/store/apps/details?id=app.wedsync.supplier&showAllReviews=true';
    } else {
      // Microsoft Store
      reviewUrl = 'https://www.microsoft.com/store/apps/wedsync';
    }

    window.open(reviewUrl, '_blank');
  }

  private async sendFeedbackToTeam(feedback: string): Promise<void> {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          platform: this.getCurrentPlatform(),
        }),
      });

      // Show thank you message
      this.showThankYouMessage(
        'Thank you for your feedback! Our team will review it and work on improvements.',
      );
    } catch (error) {
      console.error('Failed to send feedback:', error);
      this.showThankYouMessage(
        "Thank you for your feedback! We'll work on getting these improvements implemented.",
      );
    }
  }

  private showThankYouMessage(message: string): void {
    const toast = document.createElement('div');
    toast.className =
      'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      document.body.removeChild(toast);
    }, 4000);
  }

  private async getUserState(): Promise<any> {
    // Get user state from localStorage and API
    const sessionCount = parseInt(localStorage.getItem('session_count') || '0');
    const installDate =
      localStorage.getItem('install_date') || new Date().toISOString();
    const lastPromptDate =
      localStorage.getItem('last_review_prompt') || '2020-01-01';
    const actionsCompleted = parseInt(
      localStorage.getItem('actions_completed') || '0',
    );
    const consecutiveDaysActive = parseInt(
      localStorage.getItem('consecutive_days_active') || '0',
    );

    // Calculate derived values
    const daysInstalled = Math.floor(
      (Date.now() - new Date(installDate).getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysSinceLastPrompt = Math.floor(
      (Date.now() - new Date(lastPromptDate).getTime()) / (1000 * 60 * 60 * 24),
    );

    // Get additional metrics from API or localStorage
    const recentWeddingCompleted =
      localStorage.getItem('recent_wedding_completed') === 'true';
    const clientResponseRate = parseFloat(
      localStorage.getItem('client_response_rate') || '0',
    );
    const automationUsage = parseInt(
      localStorage.getItem('automation_usage') || '0',
    );

    return {
      sessionCount,
      daysInstalled,
      daysSinceLastPrompt,
      hasCompletedAction: actionsCompleted > 0,
      recentWeddingCompleted,
      clientResponseRate,
      automationUsage,
      consecutiveDaysActive,
    };
  }

  private getCurrentPlatform(): string {
    if (typeof window !== 'undefined' && window.Capacitor) {
      return window.Capacitor.getPlatform();
    }
    return 'web';
  }

  // Initialize session tracking
  initializeSessionTracking(): void {
    // Track session count
    const sessionCount = parseInt(localStorage.getItem('session_count') || '0');
    localStorage.setItem('session_count', (sessionCount + 1).toString());

    // Track install date
    if (!localStorage.getItem('install_date')) {
      localStorage.setItem('install_date', new Date().toISOString());
    }

    // Track consecutive active days
    const lastActiveDate = localStorage.getItem('last_active_date');
    const today = new Date().toDateString();

    if (lastActiveDate === today) {
      // Same day, no change
    } else if (
      lastActiveDate ===
      new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()
    ) {
      // Yesterday, increment consecutive days
      const consecutiveDays = parseInt(
        localStorage.getItem('consecutive_days_active') || '0',
      );
      localStorage.setItem(
        'consecutive_days_active',
        (consecutiveDays + 1).toString(),
      );
    } else {
      // Gap in usage, reset consecutive days
      localStorage.setItem('consecutive_days_active', '1');
    }

    localStorage.setItem('last_active_date', today);
  }

  // Track user actions
  trackUserAction(actionType: string): void {
    const actionsCompleted = parseInt(
      localStorage.getItem('actions_completed') || '0',
    );
    localStorage.setItem(
      'actions_completed',
      (actionsCompleted + 1).toString(),
    );

    // Track specific action types
    if (actionType === 'wedding_completed') {
      localStorage.setItem('recent_wedding_completed', 'true');
    } else if (actionType === 'automation_used') {
      const automationUsage = parseInt(
        localStorage.getItem('automation_usage') || '0',
      );
      localStorage.setItem(
        'automation_usage',
        (automationUsage + 1).toString(),
      );
    }
  }

  // Check if we should show review prompt
  async checkReviewPrompt(): Promise<void> {
    const shouldShow = await this.evaluateReviewPrompt();
    if (shouldShow) {
      await this.showReviewPrompt();
    }
  }
}
