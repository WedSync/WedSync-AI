interface TouchPoint {
  id: string;
  userId: string;
  source: string;
  medium: string;
  campaign?: string;
  timestamp: Date;
  value: number;
}

interface AttributionModel {
  name: string;
  calculate: (touchPoints: TouchPoint[]) => Record<string, number>;
}

class MarketingAttributionPipeline {
  private models: Record<string, AttributionModel> = {
    'first-touch': {
      name: 'First Touch',
      calculate: (touchPoints: TouchPoint[]) => {
        if (touchPoints.length === 0) return {};
        const firstTouch = touchPoints.sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        )[0];
        return { [firstTouch.source]: 100 };
      },
    },
    'last-touch': {
      name: 'Last Touch',
      calculate: (touchPoints: TouchPoint[]) => {
        if (touchPoints.length === 0) return {};
        const lastTouch = touchPoints.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
        )[0];
        return { [lastTouch.source]: 100 };
      },
    },
    linear: {
      name: 'Linear',
      calculate: (touchPoints: TouchPoint[]) => {
        if (touchPoints.length === 0) return {};
        const attribution: Record<string, number> = {};
        const weight = 100 / touchPoints.length;

        touchPoints.forEach((tp) => {
          attribution[tp.source] = (attribution[tp.source] || 0) + weight;
        });

        return attribution;
      },
    },
  };

  async processUserJourney(
    userId: string,
    conversionValue: number,
  ): Promise<Record<string, number>> {
    // Simulate fetching user touch points
    const touchPoints: TouchPoint[] = [
      {
        id: '1',
        userId,
        source: 'Google',
        medium: 'organic',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        value: conversionValue,
      },
      {
        id: '2',
        userId,
        source: 'Facebook',
        medium: 'social',
        campaign: 'wedding-promo',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        value: conversionValue,
      },
    ];

    // Use linear attribution by default
    return this.models['linear'].calculate(touchPoints);
  }

  getAvailableModels(): string[] {
    return Object.keys(this.models);
  }

  calculateAttribution(
    touchPoints: TouchPoint[],
    model: string = 'linear',
  ): Record<string, number> {
    const attributionModel = this.models[model];
    if (!attributionModel) {
      throw new Error(`Unknown attribution model: ${model}`);
    }

    return attributionModel.calculate(touchPoints);
  }
}

export const marketingAttributionPipeline = new MarketingAttributionPipeline();
