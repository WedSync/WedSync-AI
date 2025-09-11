'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TimelineMoment,
  WeddingFile,
  SocialSettings,
  FamilySettings,
} from '@/types/wedme/file-management';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  X,
  Heart,
  Share2,
  Download,
  Eye,
  Clock,
  MapPin,
  Users,
  Camera,
  Video,
  FileText,
  Sparkles,
  Star,
  MessageCircle,
  ThumbsUp,
  Send,
  Copy,
  Facebook,
  Instagram,
  Twitter,
} from 'lucide-react';

interface TimelineMomentDetailsProps {
  moment: TimelineMoment;
  files: WeddingFile[];
  onFileAction: (action: string, file: WeddingFile) => void;
  socialSharing: SocialSettings;
  familySharing: FamilySettings;
  onClose: () => void;
}

const TimelineMomentDetails: React.FC<TimelineMomentDetailsProps> = ({
  moment,
  files,
  onFileAction,
  socialSharing,
  familySharing,
  onClose,
}) => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedFile, setSelectedFile] = useState<WeddingFile | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(timestamp));
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video':
        return Video;
      case 'photo':
        return Camera;
      case 'document':
        return FileText;
      default:
        return Camera;
    }
  };

  const shareableText = `✨ ${moment.title} ✨\n\n${moment.description}\n\n#Wedding #LoveStory #WedMe`;

  return (
    <div className="h-screen max-h-96 bg-white">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 truncate">
            {moment.title}
          </h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            {formatTime(moment.timestamp)}
            {moment.location && (
              <>
                <MapPin className="w-4 h-4 ml-2" />
                {moment.location.venue || moment.location.city}
              </>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4">
        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              Files
              <Badge variant="secondary" className="text-xs px-2 py-0">
                {files.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="share">Share</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Description */}
            {moment.description && (
              <Card className="p-4">
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900">
                    About This Moment
                  </h3>
                  <p
                    className={`text-gray-700 leading-relaxed ${
                      !showFullDescription && moment.description.length > 200
                        ? 'line-clamp-3'
                        : ''
                    }`}
                  >
                    {moment.description}
                  </p>
                  {moment.description.length > 200 && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() =>
                        setShowFullDescription(!showFullDescription)
                      }
                      className="p-0 h-auto text-pink-600"
                    >
                      {showFullDescription ? 'Show less' : 'Show more'}
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Participants */}
            {moment.participants && moment.participants.length > 0 && (
              <Card className="p-4">
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    People in This Moment
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {moment.participants.map((participant, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1"
                      >
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {participant.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-700">
                          {participant}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* AI Insights */}
            {moment.aiInsights && moment.aiInsights.length > 0 && (
              <Card className="p-4">
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    AI Insights
                  </h3>
                  <div className="space-y-2">
                    {moment.aiInsights.slice(0, 3).map((insight, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 text-sm"
                      >
                        <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">
                          {insight.recommendation}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Viral Potential */}
            {moment.viralPotential && moment.viralPotential > 60 && (
              <Card className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <Star className="w-4 h-4 text-emerald-600" />
                    Viral Potential
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${moment.viralPotential}%` }}
                      />
                    </div>
                    <span className="font-bold text-emerald-600">
                      {Math.round(moment.viralPotential)}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    This moment has high viral potential! Consider sharing it on
                    social media.
                  </p>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="files" className="mt-4">
            {files.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {files.map((file) => {
                    const FileIcon = getFileIcon(file.type);
                    return (
                      <Card
                        key={file.id}
                        className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                          selectedFile?.id === file.id
                            ? 'ring-2 ring-pink-300 bg-pink-50'
                            : ''
                        }`}
                        onClick={() => setSelectedFile(file)}
                      >
                        <div className="space-y-3">
                          {/* File Preview */}
                          <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 relative">
                            {file.type === 'photo' ? (
                              <img
                                src={file.thumbnailUrl || file.url}
                                alt={
                                  file.metadata.description || 'Wedding photo'
                                }
                                className="w-full h-full object-cover"
                              />
                            ) : file.type === 'video' ? (
                              <div className="w-full h-full bg-gray-900 flex items-center justify-center relative">
                                <Video className="w-8 h-8 text-white" />
                                {file.thumbnailUrl && (
                                  <img
                                    src={file.thumbnailUrl}
                                    alt="Video thumbnail"
                                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FileIcon className="w-8 h-8 text-gray-500" />
                              </div>
                            )}

                            {/* Viral Badge */}
                            {file.viralPotential > 80 && (
                              <div className="absolute top-2 right-2">
                                <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs px-2 py-1">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  Viral
                                </Badge>
                              </div>
                            )}
                          </div>

                          {/* File Info */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {file.metadata.originalFilename}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {file.type}
                              </Badge>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>
                                {(file.fileSize / (1024 * 1024)).toFixed(1)} MB
                              </span>
                              {file.vendor && (
                                <span>by {file.vendor.name}</span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onFileAction('view', file);
                              }}
                              className="flex-1 text-xs"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onFileAction('download', file);
                              }}
                              className="flex-1 text-xs"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Save
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Camera className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No files in this moment yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="share" className="mt-4 space-y-4">
            {/* Quick Share Text */}
            <Card className="p-4">
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Share This Moment</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <textarea
                    value={shareableText}
                    readOnly
                    className="w-full bg-transparent text-sm text-gray-700 resize-none border-none focus:outline-none"
                    rows={4}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(shareableText)}
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Text
                </Button>
              </div>
            </Card>

            {/* Social Platforms */}
            <Card className="p-4">
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">
                  Share on Social Media
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-16 text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() =>
                      onFileAction('share_facebook', moment as any)
                    }
                  >
                    <Facebook className="w-5 h-5" />
                    <span className="text-xs">Facebook</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-16 text-pink-600 border-pink-200 hover:bg-pink-50"
                    onClick={() =>
                      onFileAction('share_instagram', moment as any)
                    }
                  >
                    <Instagram className="w-5 h-5" />
                    <span className="text-xs">Instagram</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-16 text-blue-400 border-blue-200 hover:bg-blue-50"
                    onClick={() => onFileAction('share_twitter', moment as any)}
                  >
                    <Twitter className="w-5 h-5" />
                    <span className="text-xs">Twitter</span>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Family Sharing */}
            <Card className="p-4">
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">
                  Share with Family & Friends
                </h3>
                <p className="text-sm text-gray-600">
                  Send this moment directly to your loved ones
                </p>
                <Button
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
                  onClick={() => onFileAction('share_family', moment as any)}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Share with Family
                </Button>
              </div>
            </Card>

            {/* Engagement Stats (if available) */}
            {moment.socialMetrics && (
              <Card className="p-4">
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900">Engagement</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-pink-600">
                        {moment.socialMetrics.likes || 0}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                        <Heart className="w-3 h-3" />
                        Likes
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {moment.socialMetrics.shares || 0}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                        <Share2 className="w-3 h-3" />
                        Shares
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-600">
                        {moment.socialMetrics.comments || 0}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        Comments
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TimelineMomentDetails;
