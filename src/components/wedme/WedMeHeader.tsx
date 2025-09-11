'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Menu,
  Bell,
  Settings,
  User,
  Heart,
  Share,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WedMeHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
  showProfileMenu?: boolean;
  notifications?: number;
  className?: string;
}

/**
 * WedMeHeader - WS-154 WedMe Platform Integration Header
 *
 * Mobile-optimized header for WedMe platform integration:
 * - Consistent WedMe branding and styling
 * - Touch-friendly navigation controls
 * - Profile and notification management
 * - Responsive design for mobile viewports
 * - Wedding context awareness
 */
export const WedMeHeader: React.FC<WedMeHeaderProps> = ({
  title,
  showBackButton = false,
  onBack,
  showProfileMenu = true,
  notifications = 0,
  className = '',
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Mock user data - in production, this would come from auth context
  const currentUser = {
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    avatar: '/avatars/sarah.jpg',
    weddingDate: '2024-06-15',
    partnerName: 'Michael',
    role: 'bride',
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${title} - WedMe`,
          text: `Check out our wedding planning progress!`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleNotifications = () => {
    // Navigate to notifications page
    window.location.href = '/wedme/notifications';
  };

  const handleProfile = () => {
    // Navigate to profile page
    window.location.href = '/wedme/profile';
  };

  const handleSettings = () => {
    // Navigate to settings page
    window.location.href = '/wedme/settings';
  };

  const formatWeddingCountdown = () => {
    const weddingDate = new Date(currentUser.weddingDate);
    const today = new Date();
    const diffTime = weddingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return `${diffDays} days to go!`;
    } else if (diffDays === 0) {
      return "It's your wedding day!";
    } else {
      return 'Married!';
    }
  };

  return (
    <header
      className={`
      bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg
      sticky top-0 z-50 border-b border-pink-600
      ${className}
    `}
    >
      <div className="px-4 py-3">
        {/* Main header row */}
        <div className="flex items-center justify-between">
          {/* Left section */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-2 hover:bg-pink-600/50 text-white touch-manipulation"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold truncate">{title}</h1>
              <div className="text-xs text-pink-100 truncate">
                {currentUser.name} & {currentUser.partnerName}
              </div>
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Share button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="p-2 hover:bg-pink-600/50 text-white touch-manipulation"
              aria-label="Share"
            >
              <Share className="w-4 h-4" />
            </Button>

            {/* Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNotifications}
                className="p-2 hover:bg-pink-600/50 text-white touch-manipulation"
                aria-label={`Notifications${notifications > 0 ? ` (${notifications})` : ''}`}
              >
                <Bell className="w-4 h-4" />
              </Button>
              {notifications > 0 && (
                <Badge
                  className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs"
                  variant="destructive"
                >
                  {notifications > 9 ? '9+' : notifications}
                </Badge>
              )}
            </div>

            {/* Profile menu */}
            {showProfileMenu && (
              <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 hover:bg-pink-600/50 touch-manipulation"
                    aria-label="Profile menu"
                  >
                    <Avatar className="w-8 h-8 border-2 border-pink-300">
                      <AvatarImage
                        src={currentUser.avatar}
                        alt={currentUser.name}
                      />
                      <AvatarFallback className="bg-pink-300 text-pink-800 text-xs">
                        {currentUser.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-64 bg-white border border-gray-200 shadow-lg rounded-lg"
                >
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="font-medium text-gray-900">
                      {currentUser.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {currentUser.email}
                    </div>
                    <div className="flex items-center mt-2 text-xs text-pink-600">
                      <Heart className="w-3 h-3 mr-1" />
                      {formatWeddingCountdown()}
                    </div>
                  </div>

                  {/* Menu items */}
                  <DropdownMenuItem
                    onClick={handleProfile}
                    className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <User className="w-4 h-4 mr-3 text-gray-500" />
                    View Profile
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={handleSettings}
                    className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <Settings className="w-4 h-4 mr-3 text-gray-500" />
                    Settings
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => (window.location.href = '/wedme/help')}
                    className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    Help & Support
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => (window.location.href = '/auth/logout')}
                    className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer text-red-600"
                  >
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Wedding progress indicator (optional) */}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between text-xs text-pink-100">
          <span>Wedding Planning Progress</span>
          <span>75% Complete</span>
        </div>
        <div className="w-full bg-pink-600/30 rounded-full h-1 mt-1">
          <div
            className="bg-pink-200 h-1 rounded-full transition-all duration-300"
            style={{ width: '75%' }}
          />
        </div>
      </div>
    </header>
  );
};
