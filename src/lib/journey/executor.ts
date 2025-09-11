import { JourneyDefinition, JourneyExecution } from '@/lib/journey/types';
import { createClient } from '@/lib/supabase/server';

export class JourneyExecutor {
  private journey: JourneyDefinition;
  private execution: JourneyExecution;
  private supabase: any;

  constructor(journey: JourneyDefinition, execution: JourneyExecution) {
    this.journey = journey;
    this.execution = execution;
    this.supabase = createClient();
  }

  async start() {
    try {
      await this.updateExecutionStatus('running');

      const startNode = this.journey.nodes.find((n) => n.type === 'trigger');
      if (!startNode) {
        throw new Error('No trigger node found in journey');
      }

      await this.executeNode(startNode.id);

      await this.updateExecutionStatus('completed');
      return { success: true, executionId: this.execution.id };
    } catch (error) {
      await this.updateExecutionStatus('failed');
      throw error;
    }
  }

  async pause() {
    await this.updateExecutionStatus('paused');
    return { success: true };
  }

  async resume() {
    await this.updateExecutionStatus('running');
    const currentNodeId = this.execution.current_node_id;
    if (currentNodeId) {
      await this.executeNode(currentNodeId);
    }
    return { success: true };
  }

  async stop() {
    await this.updateExecutionStatus('stopped');
    return { success: true };
  }

  private async executeNode(nodeId: string) {
    const node = this.journey.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    await this.updateCurrentNode(nodeId);

    switch (node.type) {
      case 'trigger':
        await this.executeTriggerNode(node);
        break;
      case 'action':
        await this.executeActionNode(node);
        break;
      case 'condition':
        await this.executeConditionNode(node);
        break;
      case 'delay':
        await this.executeDelayNode(node);
        break;
      case 'end':
        await this.executeEndNode(node);
        break;
    }

    const nextEdge = this.journey.edges.find((e) => e.source === nodeId);
    if (nextEdge) {
      await this.executeNode(nextEdge.target);
    }
  }

  private async executeTriggerNode(node: any) {
    console.log('Executing trigger node:', node.id);
  }

  private async executeActionNode(node: any) {
    const actionType = node.data?.actionType;

    switch (actionType) {
      case 'send_email':
        await this.sendEmail(node.data);
        break;
      case 'send_sms':
        await this.sendSMS(node.data);
        break;
      case 'assign_form':
        await this.assignForm(node.data);
        break;
      case 'update_status':
        await this.updateStatus(node.data);
        break;
    }
  }

  private async executeConditionNode(node: any) {
    const condition = node.data?.condition;
    const result = await this.evaluateCondition(condition);

    const edge = this.journey.edges.find(
      (e) => e.source === node.id && e.sourceHandle === (result ? 'yes' : 'no'),
    );

    if (edge) {
      await this.executeNode(edge.target);
    }
  }

  private async executeDelayNode(node: any) {
    const delay = node.data?.delay || 0;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private async executeEndNode(node: any) {
    await this.updateExecutionStatus('completed');
  }

  private async sendEmail(data: any) {
    console.log('Sending email:', data);
    // TODO: Implement email sending
  }

  private async sendSMS(data: any) {
    console.log('Sending SMS:', data);
    // TODO: Implement SMS sending
  }

  private async assignForm(data: any) {
    console.log('Assigning form:', data);
    // TODO: Implement form assignment
  }

  private async updateStatus(data: any) {
    console.log('Updating status:', data);
    // TODO: Implement status update
  }

  private async evaluateCondition(condition: any): Promise<boolean> {
    // TODO: Implement condition evaluation
    return true;
  }

  private async updateExecutionStatus(status: string) {
    await this.supabase
      .from('journey_executions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', this.execution.id);
  }

  private async updateCurrentNode(nodeId: string) {
    await this.supabase
      .from('journey_executions')
      .update({
        current_node_id: nodeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.execution.id);
  }
}
