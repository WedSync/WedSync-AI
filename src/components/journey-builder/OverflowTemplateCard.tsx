'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Sparkles,
  ChevronRight,
  Eye,
  Copy,
  Lock,
  TrendingUp,
  Star,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { JourneyTemplate } from '@/lib/journey/templates/types';

interface OverflowTemplateCardProps {
  template: JourneyTemplate;
  isLocked: boolean;
  isPopular?: boolean;
  onPreview: () => void;
  onUse: () => void;
  index: number;
}

const tierGradients: Record<string, string> = {
  free: 'from-gray-500 to-gray-600',
  starter: 'from-green-500 to-emerald-500',
  professional: 'from-blue-500 to-indigo-500',
  scale: 'from-purple-500 to-violet-500',
  enterprise: 'from-red-500 to-rose-500',
};

const categoryColors: Record<string, string> = {
  photography: 'bg-blue-500/10 text-blue-500',
  videography: 'bg-purple-500/10 text-purple-500',
  venue: 'bg-amber-500/10 text-amber-500',
  catering: 'bg-green-500/10 text-green-500',
  dj: 'bg-pink-500/10 text-pink-500',
  band: 'bg-indigo-500/10 text-indigo-500',
  florist: 'bg-rose-500/10 text-rose-500',
  planner: 'bg-violet-500/10 text-violet-500',
  hair_makeup: 'bg-orange-500/10 text-orange-500',
  transportation: 'bg-cyan-500/10 text-cyan-500',
  cake: 'bg-yellow-500/10 text-yellow-500',
  rentals: 'bg-teal-500/10 text-teal-500',
};

export function OverflowTemplateCard({
  template,
  isLocked,
  isPopular,
  onPreview,
  onUse,
  index,
}: OverflowTemplateCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -5 }}
      className="relative group"
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20 
                      rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      />

      <div
        className="relative bg-card border border-gray-300/50 rounded-2xl overflow-hidden 
                      hover:border-primary/50 transition-all duration-300"
      >
        {/* Gradient Header */}
        <div
          className={`h-2 bg-gradient-to-r ${tierGradients[template.tier]}`}
        />

        {/* Badges */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          {isPopular && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full 
                         flex items-center gap-1 shadow-lg"
            >
              <TrendingUp className="h-3 w-3" />
              Popular
            </motion.div>
          )}
          {template.popularity > 80 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold 
                         px-2 py-1 rounded-full flex items-center gap-1 shadow-lg"
            >
              <Sparkles className="h-3 w-3" />
              Hot
            </motion.div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Category & Tier */}
          <div className="flex items-center gap-2 mb-4">
            <Badge
              className={categoryColors[template.category]}
              variant="secondary"
            >
              {template.category.replace(/_/g, ' ')}
            </Badge>
            <Badge
              className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700"
              variant="secondary"
            >
              {template.tier}
            </Badge>
          </div>

          {/* Title & Description */}
          <h3
            className="text-xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 
                         bg-clip-text text-transparent"
          >
            {template.name}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {template.description}
          </p>

          {/* Stats */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground font-medium">
                {template.estimatedDuration}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-foreground font-medium">
                {template.popularity}%
              </span>
            </div>
          </div>

          {/* Features */}
          {template.features && template.features.length > 0 && (
            <div className="space-y-2 mb-4">
              {template.features.slice(0, 3).map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 + idx * 0.02 }}
                  className="flex items-center gap-2 text-sm"
                >
                  <ChevronRight className="h-3 w-3 text-primary" />
                  <span className="text-muted-foreground">{feature}</span>
                </motion.div>
              ))}
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {template.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-secondary/50 text-xs rounded-full text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 group/btn"
              onClick={onPreview}
              disabled={isLocked}
            >
              <Eye className="h-4 w-4 mr-1 group-hover/btn:scale-110 transition-transform" />
              Preview
            </Button>
            <Button
              size="sm"
              className={`flex-1 group/btn ${
                isLocked
                  ? 'bg-gradient-to-r from-gray-400 to-gray-500'
                  : 'bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90'
              }`}
              onClick={onUse}
              disabled={isLocked}
            >
              {isLocked ? (
                <>
                  <Lock className="h-4 w-4 mr-1" />
                  Upgrade
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1 group-hover/btn:scale-110 transition-transform" />
                  Use Template
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Hover Effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent" />
        </motion.div>
      </div>
    </motion.div>
  );
}
