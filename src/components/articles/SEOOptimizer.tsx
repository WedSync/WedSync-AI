'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Target,
  BarChart3,
  Lightbulb,
} from 'lucide-react';
import type {
  SEOAnalysis,
  SEOIssue,
  SEOSuggestion,
  MetaAnalysis,
  Article,
} from '@/types/articles';

interface SEOOptimizerProps {
  title: string;
  content: string;
  description: string;
  keywords: string[];
  onSEOUpdate: (seoData: {
    title: string;
    description: string;
    keywords: string[];
    score: number;
  }) => void;
  targetKeywords?: string[];
}

export function SEOOptimizer({
  title,
  content,
  description,
  keywords,
  onSEOUpdate,
  targetKeywords = [],
}: SEOOptimizerProps) {
  const [analysis, setAnalysis] = useState<SEOAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [optimizedTitle, setOptimizedTitle] = useState(title);
  const [optimizedDescription, setOptimizedDescription] = useState(description);
  const [optimizedKeywords, setOptimizedKeywords] =
    useState<string[]>(keywords);

  // SEO Analysis Service
  const performSEOAnalysis = useMemo(() => {
    return (
      title: string,
      content: string,
      description: string,
      keywords: string[],
    ): SEOAnalysis => {
      const issues: SEOIssue[] = [];
      const suggestions: SEOSuggestion[] = [];

      // Content analysis
      const wordCount = content
        .split(/\s+/)
        .filter((word) => word.length > 0).length;
      const headings = content.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi) || [];
      const images = content.match(/<img[^>]*>/gi) || [];
      const links = content.match(/<a[^>]*>.*?<\/a>/gi) || [];

      // Title analysis
      const titleLength = title.length;
      if (titleLength < 30) {
        issues.push({
          type: 'title_length',
          severity: 'medium',
          message: 'Title is too short',
          suggestion:
            'Consider expanding your title to 50-60 characters for better SEO',
        });
      } else if (titleLength > 60) {
        issues.push({
          type: 'title_length',
          severity: 'high',
          message: 'Title is too long',
          suggestion:
            'Shorten your title to under 60 characters to avoid truncation in search results',
        });
      }

      // Description analysis
      const descriptionLength = description.length;
      if (descriptionLength < 120) {
        issues.push({
          type: 'description_length',
          severity: 'medium',
          message: 'Meta description is too short',
          suggestion:
            'Expand your description to 150-160 characters for optimal results',
        });
      } else if (descriptionLength > 160) {
        issues.push({
          type: 'description_length',
          severity: 'high',
          message: 'Meta description is too long',
          suggestion: 'Shorten your description to under 160 characters',
        });
      }

      // Keyword density analysis
      const keywordDensity: { [keyword: string]: number } = {};
      keywords.forEach((keyword) => {
        const regex = new RegExp(keyword.toLowerCase(), 'gi');
        const matches = content.toLowerCase().match(regex) || [];
        keywordDensity[keyword] = (matches.length / wordCount) * 100;

        if (keywordDensity[keyword] > 3) {
          issues.push({
            type: 'keyword_density',
            severity: 'medium',
            message: `Keyword "${keyword}" appears too frequently`,
            suggestion: 'Reduce keyword density to 1-3% for natural content',
          });
        } else if (keywordDensity[keyword] < 0.5 && matches.length > 0) {
          suggestions.push({
            type: 'keyword_optimization',
            title: `Optimize "${keyword}" usage`,
            description:
              'Consider using this keyword more naturally throughout the content',
            impact: 'medium',
            effort: 'easy',
          });
        }
      });

      // Heading structure analysis
      const h1Count = (content.match(/<h1[^>]*>/gi) || []).length;
      if (h1Count === 0) {
        issues.push({
          type: 'heading_structure',
          severity: 'high',
          message: 'Missing H1 heading',
          suggestion: 'Add a main H1 heading to structure your content',
        });
      } else if (h1Count > 1) {
        issues.push({
          type: 'heading_structure',
          severity: 'medium',
          message: 'Multiple H1 headings found',
          suggestion: 'Use only one H1 heading per article',
        });
      }

      // Image alt text analysis
      const imagesWithoutAlt = images.filter(
        (img) => !img.includes('alt=') || img.includes('alt=""'),
      );
      if (imagesWithoutAlt.length > 0) {
        issues.push({
          type: 'image_alt_text',
          severity: 'medium',
          message: `${imagesWithoutAlt.length} image(s) missing alt text`,
          suggestion:
            'Add descriptive alt text to all images for accessibility and SEO',
        });
      }

      // Content length analysis
      if (wordCount < 300) {
        issues.push({
          type: 'readability',
          severity: 'high',
          message: 'Content is too short',
          suggestion:
            'Aim for at least 300 words for better search engine visibility',
        });
      }

      // Readability score (simplified)
      const sentences = content
        .split(/[.!?]+/)
        .filter((s) => s.trim().length > 0);
      const avgWordsPerSentence = wordCount / sentences.length;
      const readabilityScore = Math.max(
        0,
        Math.min(100, 100 - (avgWordsPerSentence - 15) * 2),
      );

      if (readabilityScore < 60) {
        suggestions.push({
          type: 'readability',
          title: 'Improve readability',
          description: 'Break up long sentences and use simpler language',
          impact: 'medium',
          effort: 'moderate',
        });
      }

      // Meta analysis
      const metaAnalysis: MetaAnalysis = {
        title_length: titleLength,
        description_length: descriptionLength,
        has_meta_image: false, // Would be set based on featured image
        structured_data_present: false, // Would require structured data analysis
      };

      // Generate suggestions
      if (keywords.length < 3) {
        suggestions.push({
          type: 'keyword_research',
          title: 'Add more target keywords',
          description:
            'Research and add 3-5 relevant keywords for better targeting',
          impact: 'high',
          effort: 'moderate',
        });
      }

      if (headings.length < 2) {
        suggestions.push({
          type: 'content_structure',
          title: 'Improve content structure',
          description:
            'Add more headings to break up content and improve readability',
          impact: 'medium',
          effort: 'easy',
        });
      }

      // Calculate overall score
      let score = 100;
      issues.forEach((issue) => {
        switch (issue.severity) {
          case 'high':
            score -= 15;
            break;
          case 'medium':
            score -= 10;
            break;
          case 'low':
            score -= 5;
            break;
        }
      });

      // Bonus points for good practices
      if (titleLength >= 50 && titleLength <= 60) score += 5;
      if (descriptionLength >= 150 && descriptionLength <= 160) score += 5;
      if (wordCount >= 500) score += 5;
      if (headings.length >= 3) score += 5;

      score = Math.max(0, Math.min(100, score));

      return {
        score,
        issues,
        suggestions,
        readability_score: readabilityScore,
        keyword_density: keywordDensity,
        meta_analysis: metaAnalysis,
      };
    };
  }, []);

  // Auto-generate optimized content
  const generateOptimizedMeta = () => {
    setIsAnalyzing(true);

    setTimeout(() => {
      // Generate optimized title
      let newTitle = title;
      if (
        targetKeywords.length > 0 &&
        !title.toLowerCase().includes(targetKeywords[0].toLowerCase())
      ) {
        newTitle = `${targetKeywords[0]} - ${title}`;
      }
      if (newTitle.length > 60) {
        newTitle = newTitle.substring(0, 57) + '...';
      }

      // Generate optimized description
      let newDescription = description;
      if (!newDescription) {
        const firstParagraph = content
          .replace(/<[^>]*>/g, '')
          .substring(0, 150);
        newDescription =
          firstParagraph + (firstParagraph.length === 150 ? '...' : '');
      }
      if (newDescription.length > 160) {
        newDescription = newDescription.substring(0, 157) + '...';
      }

      // Generate keyword suggestions
      const contentLower = content.toLowerCase();
      const suggestedKeywords = [
        'wedding planning',
        'bridal guide',
        'wedding tips',
        'event planning',
        'wedding vendors',
        'ceremony planning',
        'reception ideas',
        'wedding checklist',
      ]
        .filter(
          (keyword) =>
            contentLower.includes(keyword.toLowerCase()) &&
            !optimizedKeywords.includes(keyword),
        )
        .slice(0, 3);

      const newKeywords = [...optimizedKeywords, ...suggestedKeywords];

      setOptimizedTitle(newTitle);
      setOptimizedDescription(newDescription);
      setOptimizedKeywords(newKeywords);

      // Perform analysis
      const newAnalysis = performSEOAnalysis(
        newTitle,
        content,
        newDescription,
        newKeywords,
      );
      setAnalysis(newAnalysis);

      // Update parent component
      onSEOUpdate({
        title: newTitle,
        description: newDescription,
        keywords: newKeywords,
        score: newAnalysis.score,
      });

      setIsAnalyzing(false);
    }, 1500); // Simulate analysis time
  };

  // Run analysis when content changes
  useEffect(() => {
    if (title || content || description) {
      const newAnalysis = performSEOAnalysis(
        optimizedTitle,
        content,
        optimizedDescription,
        optimizedKeywords,
      );
      setAnalysis(newAnalysis);
    }
  }, [
    title,
    content,
    description,
    optimizedTitle,
    optimizedDescription,
    optimizedKeywords,
    performSEOAnalysis,
  ]);

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success-600 bg-success-50 border-success-200';
    if (score >= 60) return 'text-warning-600 bg-warning-50 border-warning-200';
    return 'text-error-600 bg-error-50 border-error-200';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return CheckCircle;
    if (score >= 60) return AlertTriangle;
    return AlertTriangle;
  };

  if (!analysis) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const ScoreIcon = getScoreIcon(analysis.score);

  return (
    <div className="space-y-6">
      {/* SEO Score Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getScoreColor(analysis.score)}`}>
              <ScoreIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">SEO Score</h3>
              <p className="text-sm text-gray-500">
                Content optimization analysis
              </p>
            </div>
          </div>

          <div className="text-right">
            <div
              className={`text-3xl font-bold ${getScoreColor(analysis.score).split(' ')[0]}`}
            >
              {analysis.score}
            </div>
            <div className="text-sm text-gray-500">/100</div>
          </div>
        </div>

        <button
          onClick={generateOptimizedMeta}
          disabled={isAnalyzing}
          className="w-full btn-md px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Analyzing & Optimizing...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Auto-Optimize SEO</span>
            </>
          )}
        </button>
      </div>

      {/* Optimized Meta Fields */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
          <Target className="h-4 w-4 mr-2 text-primary-600" />
          Optimized Meta Content
        </h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Optimized Title
            </label>
            <input
              type="text"
              value={optimizedTitle}
              onChange={(e) => setOptimizedTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
            />
            <div className="flex justify-between mt-1">
              <span
                className={`text-xs ${optimizedTitle.length > 60 ? 'text-error-600' : optimizedTitle.length >= 50 ? 'text-success-600' : 'text-warning-600'}`}
              >
                {optimizedTitle.length}/60 characters
              </span>
              <span className="text-xs text-gray-500">Optimal: 50-60</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Optimized Description
            </label>
            <textarea
              value={optimizedDescription}
              onChange={(e) => setOptimizedDescription(e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
            />
            <div className="flex justify-between mt-1">
              <span
                className={`text-xs ${optimizedDescription.length > 160 ? 'text-error-600' : optimizedDescription.length >= 150 ? 'text-success-600' : 'text-warning-600'}`}
              >
                {optimizedDescription.length}/160 characters
              </span>
              <span className="text-xs text-gray-500">Optimal: 150-160</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Keywords
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {optimizedKeywords.map((keyword, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200"
                >
                  {keyword}
                  <button
                    onClick={() =>
                      setOptimizedKeywords(
                        optimizedKeywords.filter((_, i) => i !== index),
                      )
                    }
                    className="ml-1.5 h-3 w-3 text-primary-500 hover:text-primary-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add keyword and press Enter"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const value = e.currentTarget.value.trim();
                  if (value && !optimizedKeywords.includes(value)) {
                    setOptimizedKeywords([...optimizedKeywords, value]);
                    e.currentTarget.value = '';
                  }
                }
              }}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
            />
          </div>
        </div>
      </div>

      {/* Issues and Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issues */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 text-error-600" />
            Issues Found ({analysis.issues.length})
          </h4>

          {analysis.issues.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success-500" />
              <p>No critical issues found!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analysis.issues.map((issue, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    issue.severity === 'high'
                      ? 'bg-error-50 border-error-200'
                      : issue.severity === 'medium'
                        ? 'bg-warning-50 border-warning-200'
                        : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start">
                    <AlertTriangle
                      className={`h-4 w-4 mt-0.5 mr-2 ${
                        issue.severity === 'high'
                          ? 'text-error-600'
                          : issue.severity === 'medium'
                            ? 'text-warning-600'
                            : 'text-blue-600'
                      }`}
                    />
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
                          issue.severity === 'high'
                            ? 'text-error-800'
                            : issue.severity === 'medium'
                              ? 'text-warning-800'
                              : 'text-blue-800'
                        }`}
                      >
                        {issue.message}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          issue.severity === 'high'
                            ? 'text-error-700'
                            : issue.severity === 'medium'
                              ? 'text-warning-700'
                              : 'text-blue-700'
                        }`}
                      >
                        {issue.suggestion}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suggestions */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <Lightbulb className="h-4 w-4 mr-2 text-blue-600" />
            Suggestions ({analysis.suggestions.length})
          </h4>

          {analysis.suggestions.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No suggestions at this time</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analysis.suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg border bg-blue-50 border-blue-200"
                >
                  <div className="flex items-start">
                    <Lightbulb className="h-4 w-4 mt-0.5 mr-2 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800">
                        {suggestion.title}
                      </p>
                      <p className="text-xs mt-1 text-blue-700">
                        {suggestion.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            suggestion.impact === 'high'
                              ? 'bg-green-100 text-green-700'
                              : suggestion.impact === 'medium'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {suggestion.impact} impact
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            suggestion.effort === 'easy'
                              ? 'bg-green-100 text-green-700'
                              : suggestion.effort === 'moderate'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {suggestion.effort} effort
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="h-4 w-4 mr-2 text-primary-600" />
          Content Analytics
        </h4>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(analysis.readability_score)}
            </div>
            <div className="text-sm text-gray-500">Readability</div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {Object.keys(analysis.keyword_density).length}
            </div>
            <div className="text-sm text-gray-500">Keywords</div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {analysis.meta_analysis.title_length}
            </div>
            <div className="text-sm text-gray-500">Title Length</div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {analysis.meta_analysis.description_length}
            </div>
            <div className="text-sm text-gray-500">Description</div>
          </div>
        </div>

        {/* Keyword Density */}
        {Object.keys(analysis.keyword_density).length > 0 && (
          <div className="mt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">
              Keyword Density
            </h5>
            <div className="space-y-2">
              {Object.entries(analysis.keyword_density).map(
                ([keyword, density]) => (
                  <div
                    key={keyword}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-600">{keyword}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            density > 3
                              ? 'bg-error-500'
                              : density > 1
                                ? 'bg-success-500'
                                : 'bg-warning-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (density / 5) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-500 w-8">
                        {density.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
