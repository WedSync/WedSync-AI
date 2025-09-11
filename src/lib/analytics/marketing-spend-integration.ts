interface MarketingSpendData {
  source: string;
  campaign: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  date: string;
}

class MarketingSpendIntegration {
  async getSpendData(
    startDate: string,
    endDate: string,
  ): Promise<MarketingSpendData[]> {
    // Simulate API call to marketing platforms
    return [
      {
        source: 'Google Ads',
        campaign: 'Wedding Photography',
        spend: 1200.5,
        impressions: 45000,
        clicks: 890,
        conversions: 23,
        date: startDate,
      },
      {
        source: 'Facebook Ads',
        campaign: 'Venue Promotion',
        spend: 850.75,
        impressions: 32000,
        clicks: 650,
        conversions: 18,
        date: startDate,
      },
    ];
  }

  async calculateROI(
    spendData: MarketingSpendData[],
    revenueData: any[],
  ): Promise<number> {
    const totalSpend = spendData.reduce((sum, item) => sum + item.spend, 0);
    const totalRevenue = revenueData.reduce(
      (sum, item) => sum + (item.revenue || 0),
      0,
    );

    return totalSpend > 0 ? (totalRevenue - totalSpend) / totalSpend : 0;
  }
}

export const marketingSpendIntegration = new MarketingSpendIntegration();
