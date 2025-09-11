/**
 * PDF Analysis Repository
 * Handles database operations for PDF analysis data
 */

import { createClient } from '@supabase/supabase-js';

export interface PdfAnalysisResult {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  analysisType: 'contract' | 'invoice' | 'quote' | 'other';
  extractedText: string;
  extractedData: Record<string, any>;
  confidence: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface PdfAnalysisMetrics {
  totalAnalyses: number;
  successfulAnalyses: number;
  failedAnalyses: number;
  averageConfidence: number;
  analysisTypeBreakdown: Record<string, number>;
  processingTimeStats: {
    average: number;
    min: number;
    max: number;
  };
}

export interface CreatePdfAnalysisRequest {
  userId: string;
  fileName: string;
  fileSize: number;
  analysisType: 'contract' | 'invoice' | 'quote' | 'other';
  extractedText?: string;
  extractedData?: Record<string, any>;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface UpdatePdfAnalysisRequest {
  extractedText?: string;
  extractedData?: Record<string, any>;
  confidence?: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: Record<string, any>;
}

export class PdfAnalysisRepository {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async create(data: CreatePdfAnalysisRequest): Promise<PdfAnalysisResult> {
    const { data: result, error } = await this.supabase
      .from('pdf_analyses')
      .insert({
        user_id: data.userId,
        file_name: data.fileName,
        file_size: data.fileSize,
        analysis_type: data.analysisType,
        extracted_text: data.extractedText || '',
        extracted_data: data.extractedData || {},
        confidence: data.confidence || 0,
        status: 'pending',
        metadata: data.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create PDF analysis: ${error.message}`);
    }

    return this.mapFromDatabase(result);
  }

  async findById(id: string): Promise<PdfAnalysisResult | null> {
    const { data, error } = await this.supabase
      .from('pdf_analyses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to find PDF analysis: ${error.message}`);
    }

    return this.mapFromDatabase(data);
  }

  async findByUserId(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<PdfAnalysisResult[]> {
    const { data, error } = await this.supabase
      .from('pdf_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to find PDF analyses: ${error.message}`);
    }

    return data.map(this.mapFromDatabase);
  }

  async update(
    id: string,
    updates: UpdatePdfAnalysisRequest,
  ): Promise<PdfAnalysisResult> {
    const { data, error } = await this.supabase
      .from('pdf_analyses')
      .update({
        extracted_text: updates.extractedText,
        extracted_data: updates.extractedData,
        confidence: updates.confidence,
        status: updates.status,
        metadata: updates.metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update PDF analysis: ${error.message}`);
    }

    return this.mapFromDatabase(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('pdf_analyses')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete PDF analysis: ${error.message}`);
    }
  }

  async getMetrics(
    userId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<PdfAnalysisMetrics> {
    let query = this.supabase.from('pdf_analyses').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get PDF analysis metrics: ${error.message}`);
    }

    // Calculate metrics
    const totalAnalyses = data.length;
    const successfulAnalyses = data.filter(
      (item) => item.status === 'completed',
    ).length;
    const failedAnalyses = data.filter(
      (item) => item.status === 'failed',
    ).length;

    const confidenceValues = data
      .filter((item) => item.confidence > 0)
      .map((item) => item.confidence);
    const averageConfidence =
      confidenceValues.length > 0
        ? confidenceValues.reduce((sum, val) => sum + val, 0) /
          confidenceValues.length
        : 0;

    const analysisTypeBreakdown = data.reduce(
      (acc, item) => {
        acc[item.analysis_type] = (acc[item.analysis_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalAnalyses,
      successfulAnalyses,
      failedAnalyses,
      averageConfidence,
      analysisTypeBreakdown,
      processingTimeStats: {
        average: 0, // TODO: Calculate from actual processing times
        min: 0,
        max: 0,
      },
    };
  }

  private mapFromDatabase(data: any): PdfAnalysisResult {
    return {
      id: data.id,
      userId: data.user_id,
      fileName: data.file_name,
      fileSize: data.file_size,
      analysisType: data.analysis_type,
      extractedText: data.extracted_text,
      extractedData: data.extracted_data,
      confidence: data.confidence,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      metadata: data.metadata,
    };
  }
}

export const pdfAnalysisRepository = new PdfAnalysisRepository();
