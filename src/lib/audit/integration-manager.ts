interface Integration {
  id: string;
  name: string;
  type: 'webhook' | 'api' | 'database';
  status: 'active' | 'inactive' | 'error';
  lastSync: Date;
  config: Record<string, any>;
}

class IntegrationManager {
  private integrations: Map<string, Integration> = new Map();

  register(integration: Integration): void {
    this.integrations.set(integration.id, integration);
  }

  get(id: string): Integration | undefined {
    return this.integrations.get(id);
  }

  getAll(): Integration[] {
    return Array.from(this.integrations.values());
  }

  updateStatus(id: string, status: Integration['status']): void {
    const integration = this.integrations.get(id);
    if (integration) {
      integration.status = status;
      integration.lastSync = new Date();
    }
  }

  async testConnection(id: string): Promise<boolean> {
    const integration = this.integrations.get(id);
    if (!integration) return false;

    try {
      // Simulate connection test
      await new Promise((resolve) => setTimeout(resolve, 100));
      this.updateStatus(id, 'active');
      return true;
    } catch (error) {
      this.updateStatus(id, 'error');
      return false;
    }
  }

  getHealthStatus(): { healthy: number; total: number } {
    const integrations = this.getAll();
    const healthy = integrations.filter((i) => i.status === 'active').length;
    return { healthy, total: integrations.length };
  }
}

export const integrationManager = new IntegrationManager();
