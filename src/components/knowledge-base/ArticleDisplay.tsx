'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  StarIcon,
  ClockIcon,
  EyeIcon,
  ShareIcon,
  BookmarkIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import {
  StarIcon as StarIconSolid,
  BookmarkIcon as BookmarkIconSolid,
} from '@heroicons/react/24/solid';
import { ArticleRating } from './ArticleRating';

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  categoryId: string;
  categoryName?: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number;
  lastUpdated: string;
  author: string;
  authorAvatar?: string;
  rating: number;
  viewCount: number;
  helpfulVotes: number;
  totalVotes: number;
  relatedArticles?: RelatedArticle[];
}

interface RelatedArticle {
  id: string;
  title: string;
  excerpt: string;
  estimatedReadTime: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface ArticleDisplayProps {
  article: Article;
  onBackClick: () => void;
  onRelatedArticleClick: (article: RelatedArticle) => void;
  onBookmarkToggle?: (articleId: string, isBookmarked: boolean) => void;
  onHelpfulVote?: (articleId: string, isHelpful: boolean) => void;
  onRatingSubmit?: (
    articleId: string,
    rating: number,
    feedback: string,
  ) => void;
  isBookmarked?: boolean;
  hasVoted?: boolean;
  userVote?: boolean; // true = helpful, false = not helpful
  className?: string;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const getDifficultyColor = (difficulty: Article['difficulty']) => {
  switch (difficulty) {
    case 'beginner':
      return 'bg-green-100 text-green-800';
    case 'intermediate':
      return 'bg-yellow-100 text-yellow-800';
    case 'advanced':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
};

export function ArticleDisplay({
  article,
  onBackClick,
  onRelatedArticleClick,
  onBookmarkToggle,
  onHelpfulVote,
  onRatingSubmit,
  isBookmarked = false,
  hasVoted = false,
  userVote,
  className = '',
}: ArticleDisplayProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);

  const handleBookmarkToggle = useCallback(() => {
    onBookmarkToggle?.(article.id, !isBookmarked);
  }, [article.id, isBookmarked, onBookmarkToggle]);

  const handleHelpfulVote = useCallback(
    (isHelpful: boolean) => {
      if (hasVoted) return;
      onHelpfulVote?.(article.id, isHelpful);
    },
    [article.id, hasVoted, onHelpfulVote],
  );

  const handleShare = useCallback(
    async (method: 'link' | 'twitter' | 'linkedin' | 'email') => {
      const url = window.location.href;
      const title = `${article.title} - WedSync Knowledge Base`;
      const text = article.excerpt;

      switch (method) {
        case 'link':
          try {
            await navigator.clipboard.writeText(url);
            // Show success toast
          } catch (err) {
            console.error('Failed to copy link:', err);
          }
          break;
        case 'twitter':
          window.open(
            `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
          );
          break;
        case 'linkedin':
          window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
          );
          break;
        case 'email':
          window.open(
            `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
          );
          break;
      }
      setShowShareMenu(false);
    },
    [article.title, article.excerpt],
  );

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Navigation */}
        <motion.div {...fadeInUp} className="mb-6">
          <button
            onClick={onBackClick}
            className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200"
            aria-label="Back to knowledge base"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" aria-hidden="true" />
            Back to Knowledge Base
          </button>
        </motion.div>

        <motion.article
          {...fadeInUp}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
        >
          {/* Article Header */}
          <header className="px-6 py-8 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {article.categoryName && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    {article.categoryName}
                  </span>
                )}
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(article.difficulty)}`}
                >
                  {article.difficulty}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {/* Bookmark Button */}
                <button
                  onClick={handleBookmarkToggle}
                  className="p-2 text-gray-400 hover:text-yellow-500 transition-colors duration-200"
                  aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                >
                  {isBookmarked ? (
                    <BookmarkIconSolid
                      className="w-5 h-5 text-yellow-500"
                      aria-hidden="true"
                    />
                  ) : (
                    <BookmarkIcon className="w-5 h-5" aria-hidden="true" />
                  )}
                </button>

                {/* Share Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    aria-label="Share article"
                  >
                    <ShareIcon className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>

                {/* Print Button */}
                <button
                  onClick={handlePrint}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  aria-label="Print article"
                >
                  <PrinterIcon className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {article.title}
            </h1>

            <p className="text-lg text-gray-600 mb-6">{article.excerpt}</p>

            {/* Article Meta */}
            <div className="flex flex-wrap items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-4 mb-2 sm:mb-0">
                <div className="flex items-center">
                  {article.authorAvatar ? (
                    <img
                      src={article.authorAvatar}
                      alt=""
                      className="w-6 h-6 rounded-full mr-2"
                    />
                  ) : (
                    <div className="w-6 h-6 bg-gray-300 rounded-full mr-2" />
                  )}
                  <span>{article.author}</span>
                </div>

                <div className="flex items-center">
                  <ClockIcon className="w-4 h-4 mr-1" aria-hidden="true" />
                  <span>{article.estimatedReadTime} min read</span>
                </div>

                <div className="flex items-center">
                  <EyeIcon className="w-4 h-4 mr-1" aria-hidden="true" />
                  <span>{article.viewCount.toLocaleString()} views</span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <StarIcon
                    className="w-4 h-4 mr-1 text-yellow-400"
                    aria-hidden="true"
                  />
                  <span>{article.rating.toFixed(1)} rating</span>
                </div>

                <span>Updated {formatDate(article.lastUpdated)}</span>
              </div>
            </div>

            {/* Tags */}
            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Article Content */}
          <div className="px-6 py-8">
            <div
              className="prose prose-lg max-w-none prose-primary"
              dangerouslySetInnerHTML={{ __html: article.content }}
              aria-label="Article content"
            />
          </div>

          {/* Article Footer */}
          <footer className="px-6 py-6 border-t border-gray-200 bg-gray-50">
            {/* Helpful Vote */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Was this article helpful?
                </h3>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleHelpfulVote(true)}
                    disabled={hasVoted}
                    className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md transition-colors duration-200 ${
                      hasVoted && userVote === true
                        ? 'bg-green-100 text-green-800 cursor-default'
                        : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                    }`}
                  >
                    <HandThumbUpIcon
                      className="w-4 h-4 mr-1"
                      aria-hidden="true"
                    />
                    Yes ({article.helpfulVotes})
                  </button>

                  <button
                    onClick={() => handleHelpfulVote(false)}
                    disabled={hasVoted}
                    className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md transition-colors duration-200 ${
                      hasVoted && userVote === false
                        ? 'bg-red-100 text-red-800 cursor-default'
                        : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                    }`}
                  >
                    <HandThumbDownIcon
                      className="w-4 h-4 mr-1"
                      aria-hidden="true"
                    />
                    No ({article.totalVotes - article.helpfulVotes})
                  </button>
                </div>
              </div>
            </div>

            {/* Article Rating */}
            <ArticleRating
              articleId={article.id}
              currentRating={article.rating}
              onRatingSubmit={onRatingSubmit}
            />
          </footer>
        </motion.article>
      </div>
    </div>
  );
}
