// Base types and interfaces for journey executors
// This file contains no imports from other executor files to break circular dependencies

export interface NodeExecutorContext {
  executionId: string;
  templateId: string;
  stepId: string;
  variables: Record<string, any>;
  clientData?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    weddingDate?: string;
  };
  vendorData?: {
    id: string;
    name: string;
    email: string;
    category?: string;
  };
}

export interface NodeExecutorResult {
  success: boolean;
  output?: Record<string, any>;
  error?: string;
  nextNodes?: string[];
  pauseExecution?: boolean;
  scheduleNextAt?: Date;
}
