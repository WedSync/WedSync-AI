import { Node, Edge } from '@xyflow/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { canvasTransformer } from './canvas-to-execution';

describe('CanvasTransformer', () => {
  describe('validateCanvas', () => {
    it('should validate a valid journey canvas', () => {
      const nodes: Node[] = [
        {
          id: 'start-1',
          type: 'start',
          position: { x: 100, y: 100 },
          data: { label: 'Start' }
        },
          id: 'email-1',
          type: 'email',
          position: { x: 300, y: 100 },
          data: { 
            label: 'Welcome Email',
            config: {
              template: 'welcome',
              subject: 'Welcome!'
            }
          }
          id: 'end-1',
          type: 'end',
          position: { x: 500, y: 100 },
          data: { label: 'End' }
        }
      ];
      const edges: Edge[] = [
        { id: 'e1', source: 'start-1', target: 'email-1' },
        { id: 'e2', source: 'email-1', target: 'end-1' }
      const result = canvasTransformer.validateCanvas(nodes, edges);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    it('should detect missing start node', () => {
            config: { template: 'welcome' }
      const edges: Edge[] = [];
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Journey must have at least one Start node');
    it('should detect disconnected nodes', () => {
            label: 'Orphan Email',
      expect(result.warnings).toContain('Node "Orphan Email" is not connected to any other nodes');
  });
  describe('transformToExecution', () => {
    it('should transform canvas to execution format', () => {
              subject: 'Welcome to WedSync!'
          id: 'delay-1',
          type: 'timeline',
            label: '3 Days Before Wedding',
              offset: {
                value: 3,
                unit: 'days',
                direction: 'before',
                referencePoint: 'wedding_date'
              }
          position: { x: 700, y: 100 },
        { id: 'e2', source: 'email-1', target: 'delay-1' },
        { id: 'e3', source: 'delay-1', target: 'end-1' }
      const definition = canvasTransformer.transformToExecution(nodes, edges, 'Test Journey');
      expect(definition.name).toBe('Test Journey');
      expect(definition.executionPlan.nodes).toHaveLength(4);
      expect(definition.executionPlan.startNodeId).toBe('start-1');
      expect(definition.executionPlan.endNodeIds).toContain('end-1');
      // Check email node transformation
      const emailNode = definition.executionPlan.nodes.find(n => n.id === 'email-1');
      expect(emailNode?.type).toBe('email');
      expect(emailNode?.data.actionType).toBe('send_email');
      expect(emailNode?.data.template).toBe('welcome');
      expect(emailNode?.connections).toContain('delay-1');
      // Check delay node transformation
      const delayNode = definition.executionPlan.nodes.find(n => n.id === 'delay-1');
      expect(delayNode?.type).toBe('wait');
      expect(delayNode?.data.actionType).toBe('wait');
      expect(delayNode?.data.delay).toBe(259200); // 3 days in seconds
    it('should handle condition nodes', () => {
          id: 'condition-1',
          type: 'condition',
            label: 'Check Package',
              conditions: [
                {
                  field: 'package',
                  operator: 'equals',
                  value: 'premium'
                }
              ]
        { id: 'e1', source: 'start-1', target: 'condition-1' },
        { id: 'e2', source: 'condition-1', target: 'end-1' }
      const definition = canvasTransformer.transformToExecution(nodes, edges, 'Conditional Journey');
      const conditionNode = definition.executionPlan.nodes.find(n => n.id === 'condition-1');
      expect(conditionNode?.type).toBe('condition');
      expect(conditionNode?.data.actionType).toBe('evaluate_condition');
      expect(conditionNode?.data.conditions).toHaveLength(1);
      expect(conditionNode?.data.conditions[0]).toEqual({
        field: 'package',
        operator: 'equals',
        value: 'premium',
        logicalOperator: 'AND'
      });
});
// Run a quick validation test
const testValidation = () => {
  const nodes: Node[] = [
    {
      id: 'start-1',
      type: 'start',
      position: { x: 100, y: 100 },
      data: { label: 'Journey Start' }
    },
      id: 'email-1',
      type: 'email',
      position: { x: 300, y: 100 },
      data: { 
        label: 'Welcome Email',
        config: {
          template: 'welcome',
          subject: 'Welcome to Your Wedding Journey!'
      }
      id: 'form-1',
      type: 'form',
      position: { x: 500, y: 100 },
        label: 'Details Form',
          formId: 'wedding-details'
      id: 'end-1',
      type: 'end',
      position: { x: 700, y: 100 },
      data: { label: 'Journey Complete' }
    }
  ];
  const edges: Edge[] = [
    { id: 'e1', source: 'start-1', target: 'email-1' },
    { id: 'e2', source: 'email-1', target: 'form-1' },
    { id: 'e3', source: 'form-1', target: 'end-1' }
  console.log('Testing Canvas Validation...');
  const validation = canvasTransformer.validateCanvas(nodes, edges);
  console.log('Validation Result:', validation);
  if (validation.isValid) {
    console.log('Testing Canvas Transformation...');
    const definition = canvasTransformer.transformToExecution(nodes, edges, 'Test Wedding Journey');
    console.log('Transformation Successful!');
    console.log('Journey ID:', definition.id);
    console.log('Nodes:', definition.executionPlan.nodes.length);
    console.log('Start Node:', definition.executionPlan.startNodeId);
    
    // Test node execution format
    const emailNode = definition.executionPlan.nodes.find(n => n.id === 'email-1');
    console.log('Email Node Data:', emailNode?.data);
  }
};
// Export test function for verification
export { testValidation };
