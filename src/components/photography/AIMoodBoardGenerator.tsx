/**
 * WS-130: AI-Powered Mood Board Generator Component
 * Interactive interface for creating visually cohesive wedding inspiration boards
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload,
  Download,
  Share2,
  Palette,
  Grid,
  Layout,
  Shuffle,
  Save,
  Trash2,
  Plus,
} from 'lucide-react';
import { analyzeImageColorHarmony } from '@/lib/ai/photography/color-harmony-analyzer';
import { moodBoardService } from '@/lib/ai/photography/mood-board-service';
import type { ColorHarmonyAnalysis } from '@/lib/ai/photography/color-harmony-analyzer';

export interface MoodBoardPhoto {
  id: string;
  url: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
  colorAnalysis?: ColorHarmonyAnalysis;
  aiScore?: number;
  metadata?: {
    photographer?: string;
    style?: string;
    tags?: string[];
  };
}

export interface MoodBoardTheme {
  id: string;
  name: string;
  description: string;
  primaryColors: string[];
  mood: string;
  style: string;
}

interface AIMoodBoardGeneratorProps {
  initialPhotos?: MoodBoardPhoto[];
  photographerId?: string;
  weddingTheme?: string;
  onSave?: (moodBoard: MoodBoardData) => void;
  collaborative?: boolean;
}

interface MoodBoardData {
  id: string;
  name: string;
  theme: MoodBoardTheme;
  photos: MoodBoardPhoto[];
  layout: 'grid' | 'masonry' | 'collage' | 'freeform';
  colorPalette: string[];
  aiScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export const AIMoodBoardGenerator: React.FC<AIMoodBoardGeneratorProps> = ({
  initialPhotos = [],
  photographerId,
  weddingTheme,
  onSave,
  collaborative = false,
}) => {
  const [photos, setPhotos] = useState<MoodBoardPhoto[]>(initialPhotos);
  const [selectedLayout, setSelectedLayout] = useState<
    'grid' | 'masonry' | 'collage' | 'freeform'
  >('grid');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [draggedPhoto, setDraggedPhoto] = useState<MoodBoardPhoto | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<MoodBoardPhoto | null>(
    null,
  );
  const [theme, setTheme] = useState<MoodBoardTheme | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
  const [colorPalette, setColorPalette] = useState<string[]>([]);
  const [consistencyScore, setConsistencyScore] = useState<number>(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analyze photos with AI when they change
  useEffect(() => {
    if (photos.length > 0) {
      analyzeBoard();
    }
  }, [photos]);

  const analyzeBoard = async () => {
    setIsAnalyzing(true);
    try {
      // Analyze theme coherence
      const analysis = await moodBoardService.analyzeBoardCoherence(photos);
      setTheme(analysis.theme);
      setColorPalette(analysis.colorPalette);
      setConsistencyScore(analysis.consistencyScore);
      setAiRecommendations(analysis.recommendations);

      // Update photo scores
      const updatedPhotos = await Promise.all(
        photos.map(async (photo) => {
          if (!photo.colorAnalysis) {
            const colorAnalysis = await analyzeImageColorHarmony(
              photo.url,
              photo.id,
            );
            return {
              ...photo,
              colorAnalysis,
              aiScore: colorAnalysis.mood_board_compatibility,
            };
          }
          return photo;
        }),
      );
      setPhotos(updatedPhotos);
    } catch (error) {
      console.error('Error analyzing mood board:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;

      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newPhoto: MoodBoardPhoto = {
            id: `photo_${Date.now()}_${Math.random()}`,
            url: e.target?.result as string,
            position: { x: Math.random() * 500, y: Math.random() * 500 },
            size: { width: 200, height: 200 },
            rotation: 0,
          };
          setPhotos((prev) => [...prev, newPhoto]);
        };
        reader.readAsDataURL(file);
      });
    },
    [],
  );

  const handleDragStart = (e: React.DragEvent, photo: MoodBoardPhoto) => {
    setDraggedPhoto(photo);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedPhoto || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPhotos((prev) =>
      prev.map((photo) =>
        photo.id === draggedPhoto.id ? { ...photo, position: { x, y } } : photo,
      ),
    );
    setDraggedPhoto(null);
  };

  const applyLayout = useCallback(
    async (layout: typeof selectedLayout) => {
      setSelectedLayout(layout);
      const arranged = await moodBoardService.autoArrangePhotos(photos, layout);
      setPhotos(arranged);
    },
    [photos],
  );

  const generateAISuggestions = async () => {
    setIsAnalyzing(true);
    try {
      const suggestions = await moodBoardService.generateAIRecommendations(
        photos,
        weddingTheme,
        photographerId,
      );
      setAiRecommendations(suggestions);
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportMoodBoard = async (format: 'pdf' | 'png' | 'link') => {
    const moodBoardData: MoodBoardData = {
      id: `mb_${Date.now()}`,
      name: `Mood Board - ${theme?.name || 'Untitled'}`,
      theme: theme || {
        id: 'default',
        name: 'Custom',
        description: 'Custom mood board',
        primaryColors: colorPalette,
        mood: 'creative',
        style: 'mixed',
      },
      photos,
      layout: selectedLayout,
      colorPalette,
      aiScore: consistencyScore,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const exportUrl = await moodBoardService.exportBoard(
        moodBoardData,
        format,
      );
      if (format === 'link') {
        navigator.clipboard.writeText(exportUrl);
        // Show toast notification
      } else {
        window.open(exportUrl, '_blank');
      }
    } catch (error) {
      console.error('Error exporting mood board:', error);
    }
  };

  const removePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const shufflePhotos = async () => {
    const shuffled = await moodBoardService.shuffleWithAI(
      photos,
      selectedLayout,
    );
    setPhotos(shuffled);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">
              AI Mood Board Generator
            </h1>
            {theme && (
              <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm font-medium">
                {theme.name}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {/* Layout Options */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => applyLayout('grid')}
                className={`p-2 rounded ${selectedLayout === 'grid' ? 'bg-white shadow-sm' : ''}`}
                title="Grid Layout"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => applyLayout('masonry')}
                className={`p-2 rounded ${selectedLayout === 'masonry' ? 'bg-white shadow-sm' : ''}`}
                title="Masonry Layout"
              >
                <Layout className="w-4 h-4" />
              </button>
              <button
                onClick={() => applyLayout('collage')}
                className={`p-2 rounded ${selectedLayout === 'collage' ? 'bg-white shadow-sm' : ''}`}
                title="Collage Layout"
              >
                <Grid className="w-4 h-4 rotate-45" />
              </button>
            </div>

            {/* Action Buttons */}
            <button
              onClick={shufflePhotos}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Shuffle with AI"
            >
              <Shuffle className="w-5 h-5 text-gray-600" />
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Photos</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Consistency Score Bar */}
        <div className="mt-4 flex items-center space-x-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Style Consistency</span>
              <span className="text-sm font-medium text-gray-900">
                {Math.round(consistencyScore * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-primary-400 to-primary-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${consistencyScore * 100}%` }}
              />
            </div>
          </div>

          {/* Export Options */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => exportMoodBoard('pdf')}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Export as PDF"
            >
              <Download className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => exportMoodBoard('link')}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Share Link"
            >
              <Share2 className="w-5 h-5 text-gray-600" />
            </button>
            {onSave && (
              <button
                onClick={() =>
                  onSave({
                    id: `mb_${Date.now()}`,
                    name: `Mood Board`,
                    theme: theme!,
                    photos,
                    layout: selectedLayout,
                    colorPalette,
                    aiScore: consistencyScore,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  })
                }
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Save"
              >
                <Save className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 p-6 overflow-auto">
          <div
            ref={canvasRef}
            className="relative w-full min-h-[600px] bg-white rounded-xl shadow-sm border border-gray-200"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {photos.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-gray-600 font-medium">
                  Drop photos here or click "Add Photos"
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  AI will help arrange them perfectly
                </p>
              </div>
            ) : (
              <div
                className={`relative w-full h-full ${selectedLayout === 'grid' ? 'grid grid-cols-3 gap-4 p-4' : ''}`}
              >
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`
                      ${selectedLayout === 'freeform' ? 'absolute' : ''}
                      ${selectedLayout === 'masonry' ? 'break-inside-avoid mb-4' : ''}
                      group cursor-move hover:shadow-lg transition-all duration-200
                    `}
                    style={
                      selectedLayout === 'freeform'
                        ? {
                            left: photo.position.x,
                            top: photo.position.y,
                            width: photo.size.width,
                            height: photo.size.height,
                            transform: `rotate(${photo.rotation}deg)`,
                          }
                        : {}
                    }
                    draggable
                    onDragStart={(e) => handleDragStart(e, photo)}
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <img
                      src={photo.url}
                      alt="Mood board photo"
                      className="w-full h-full object-cover rounded-lg"
                    />

                    {/* Photo Score Badge */}
                    {photo.aiScore && (
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-full">
                        <span className="text-xs font-medium text-gray-700">
                          {Math.round(photo.aiScore * 10)}/10
                        </span>
                      </div>
                    )}

                    {/* Remove Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(photo.id);
                      }}
                      className="absolute top-2 left-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
          {/* Color Palette */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <Palette className="w-4 h-4 mr-2" />
              Color Palette
            </h3>
            <div className="flex flex-wrap gap-2">
              {colorPalette.map((color, index) => (
                <div
                  key={index}
                  className="w-10 h-10 rounded-lg border-2 border-gray-200"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                AI Recommendations
              </h3>
              <button
                onClick={generateAISuggestions}
                className="text-xs text-primary-600 hover:text-primary-700"
                disabled={isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing...' : 'Refresh'}
              </button>
            </div>
            {aiRecommendations.length > 0 ? (
              <ul className="space-y-2">
                {aiRecommendations.map((rec, index) => (
                  <li
                    key={index}
                    className="text-sm text-gray-600 flex items-start"
                  >
                    <span className="text-primary-500 mr-2">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">
                Add more photos for AI suggestions
              </p>
            )}
          </div>

          {/* Selected Photo Details */}
          {selectedPhoto && selectedPhoto.colorAnalysis && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Photo Analysis
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Mood Score:</span>
                  <span className="font-medium">
                    {Math.round(
                      selectedPhoto.colorAnalysis.mood_board_compatibility * 10,
                    )}
                    /10
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Season:</span>
                  <span className="font-medium capitalize">
                    {selectedPhoto.colorAnalysis.seasonal_analysis.season}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Best Theme:</span>
                  <span className="font-medium capitalize">
                    {selectedPhoto.colorAnalysis.theme_matches[0]?.theme ||
                      'Mixed'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Collaborative Indicators */}
          {collaborative && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Collaborators
              </h3>
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white"
                  />
                ))}
                <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                  <span className="text-xs text-gray-600">+2</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIMoodBoardGenerator;
