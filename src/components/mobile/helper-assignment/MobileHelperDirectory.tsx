'use client';

// WS-157 Mobile Helper Directory with Search and Assignment
// Responsive helper directory with mobile-optimized search and assignment features

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  Search,
  Filter,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  Plus,
  UserPlus,
  Settings,
  Star,
  Badge,
  MessageCircle,
  ChevronRight,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { offlineHelperService } from '@/lib/offline/helper-sync/offline-helper-service';

interface Helper {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  location?: string;
  role: 'family' | 'friend' | 'vendor' | 'coordinator' | 'other';
  relationship?: string;
  availability: {
    dates: string[];
    timeSlots: string[];
    isFlexible: boolean;
  };
  skills: string[];
  experience: 'novice' | 'intermediate' | 'expert';
  rating: number;
  assignedTasks: number;
  completedTasks: number;
  lastActive: Date;
  isOnline: boolean;
  preferences: {
    maxTasksPerDay: number;
    preferredCategories: string[];
    communicationMethod: 'email' | 'sms' | 'phone' | 'app';
  };
}

interface FilterOptions {
  role?: string;
  availability?: 'available' | 'busy' | 'all';
  skills?: string[];
  experience?: string;
  location?: string;
  rating?: number;
}

export default function MobileHelperDirectory() {
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [filteredHelpers, setFilteredHelpers] = useState<Helper[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedHelper, setSelectedHelper] = useState<Helper | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAssignmentMode, setIsAssignmentMode] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const supabase = createClientComponentClient();

  // Load helpers data
  useEffect(() => {
    loadHelpers();
  }, []);

  // Filter helpers based on search and filters
  useEffect(() => {
    filterHelpers();
  }, [helpers, searchQuery, filters]);

  const loadHelpers = async () => {
    try {
      setLoading(true);

      // Mock data for demonstration - in real app would fetch from Supabase
      const mockHelpers: Helper[] = [
        {
          id: '1',
          name: 'Sarah Johnson',
          email: 'sarah@example.com',
          phone: '+1 (555) 123-4567',
          avatar: '/avatars/sarah.jpg',
          location: 'San Francisco, CA',
          role: 'family',
          relationship: 'Maid of Honor',
          availability: {
            dates: ['2024-06-15', '2024-06-16'],
            timeSlots: ['morning', 'afternoon'],
            isFlexible: true,
          },
          skills: ['Event Coordination', 'Photography', 'Decoration'],
          experience: 'expert',
          rating: 4.8,
          assignedTasks: 3,
          completedTasks: 12,
          lastActive: new Date('2024-01-20'),
          isOnline: true,
          preferences: {
            maxTasksPerDay: 3,
            preferredCategories: ['Decoration', 'Coordination'],
            communicationMethod: 'app',
          },
        },
        {
          id: '2',
          name: 'Mike Chen',
          email: 'mike@example.com',
          phone: '+1 (555) 987-6543',
          location: 'San Francisco, CA',
          role: 'friend',
          relationship: 'Best Friend',
          availability: {
            dates: ['2024-06-15'],
            timeSlots: ['evening'],
            isFlexible: false,
          },
          skills: ['Setup', 'Transportation', 'Audio/Visual'],
          experience: 'intermediate',
          rating: 4.5,
          assignedTasks: 2,
          completedTasks: 8,
          lastActive: new Date('2024-01-19'),
          isOnline: false,
          preferences: {
            maxTasksPerDay: 2,
            preferredCategories: ['Setup', 'Transportation'],
            communicationMethod: 'sms',
          },
        },
        {
          id: '3',
          name: 'Emma Rodriguez',
          email: 'emma@example.com',
          avatar: '/avatars/emma.jpg',
          location: 'Oakland, CA',
          role: 'vendor',
          relationship: 'Wedding Planner',
          availability: {
            dates: ['2024-06-15', '2024-06-16', '2024-06-17'],
            timeSlots: ['morning', 'afternoon', 'evening'],
            isFlexible: true,
          },
          skills: [
            'Event Planning',
            'Vendor Coordination',
            'Timeline Management',
          ],
          experience: 'expert',
          rating: 4.9,
          assignedTasks: 5,
          completedTasks: 25,
          lastActive: new Date('2024-01-20'),
          isOnline: true,
          preferences: {
            maxTasksPerDay: 5,
            preferredCategories: ['Planning', 'Coordination'],
            communicationMethod: 'email',
          },
        },
      ];

      setHelpers(mockHelpers);
    } catch (error) {
      console.error('Error loading helpers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterHelpers = useCallback(() => {
    let filtered = [...helpers];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (helper) =>
          helper.name.toLowerCase().includes(query) ||
          helper.email.toLowerCase().includes(query) ||
          helper.role.toLowerCase().includes(query) ||
          helper.relationship?.toLowerCase().includes(query) ||
          helper.skills.some((skill) => skill.toLowerCase().includes(query)),
      );
    }

    // Role filter
    if (filters.role && filters.role !== 'all') {
      filtered = filtered.filter((helper) => helper.role === filters.role);
    }

    // Availability filter
    if (filters.availability && filters.availability !== 'all') {
      if (filters.availability === 'available') {
        filtered = filtered.filter(
          (helper) => helper.assignedTasks < helper.preferences.maxTasksPerDay,
        );
      } else if (filters.availability === 'busy') {
        filtered = filtered.filter(
          (helper) => helper.assignedTasks >= helper.preferences.maxTasksPerDay,
        );
      }
    }

    // Skills filter
    if (filters.skills && filters.skills.length > 0) {
      filtered = filtered.filter((helper) =>
        filters.skills!.some((skill) => helper.skills.includes(skill)),
      );
    }

    // Experience filter
    if (filters.experience && filters.experience !== 'all') {
      filtered = filtered.filter(
        (helper) => helper.experience === filters.experience,
      );
    }

    // Rating filter
    if (filters.rating) {
      filtered = filtered.filter((helper) => helper.rating >= filters.rating!);
    }

    // Sort by rating and availability
    filtered.sort((a, b) => {
      // Online helpers first
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;

      // Available helpers first
      const aAvailable = a.assignedTasks < a.preferences.maxTasksPerDay;
      const bAvailable = b.assignedTasks < b.preferences.maxTasksPerDay;
      if (aAvailable && !bAvailable) return -1;
      if (!aAvailable && bAvailable) return 1;

      // Then by rating
      return b.rating - a.rating;
    });

    setFilteredHelpers(filtered);
  }, [helpers, searchQuery, filters]);

  const assignTaskToHelper = async (helperId: string, taskId: string) => {
    try {
      // In a real app, this would call Supabase API
      console.log(`Assigning task ${taskId} to helper ${helperId}`);

      // Update helper's assigned tasks count
      setHelpers((prevHelpers) =>
        prevHelpers.map((helper) =>
          helper.id === helperId
            ? { ...helper, assignedTasks: helper.assignedTasks + 1 }
            : helper,
        ),
      );

      // Reset assignment mode
      setIsAssignmentMode(false);
      setSelectedTaskId(null);

      // Show success feedback
      alert('Task assigned successfully!');
    } catch (error) {
      console.error('Error assigning task:', error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'family':
        return '👨‍👩‍👧‍👦';
      case 'friend':
        return '👥';
      case 'vendor':
        return '💼';
      case 'coordinator':
        return '📋';
      default:
        return '👤';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'family':
        return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'friend':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'vendor':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'coordinator':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getExperienceBadgeColor = (experience: string) => {
    switch (experience) {
      case 'expert':
        return 'bg-success-100 text-success-700 border-success-200';
      case 'intermediate':
        return 'bg-warning-100 text-warning-700 border-warning-200';
      case 'novice':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatLastActive = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 5) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading helpers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Helper Directory</h2>
        <button
          onClick={() => setIsAssignmentMode(!isAssignmentMode)}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            isAssignmentMode
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {isAssignmentMode ? 'Cancel Assignment' : 'Assign Tasks'}
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search helpers by name, role, or skills..."
          className="w-full pl-10 pr-12 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
            showFilters
              ? 'bg-primary-100 text-primary-600'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Filters</h3>
            <button
              onClick={() => {
                setFilters({});
                setShowFilters(false);
              }}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={filters.role || 'all'}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, role: e.target.value }))
                }
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
              >
                <option value="all">All Roles</option>
                <option value="family">Family</option>
                <option value="friend">Friends</option>
                <option value="vendor">Vendors</option>
                <option value="coordinator">Coordinators</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Availability Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Availability
              </label>
              <select
                value={filters.availability || 'all'}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    availability: e.target.value as any,
                  }))
                }
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
              >
                <option value="all">All</option>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
              </select>
            </div>

            {/* Experience Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Experience
              </label>
              <select
                value={filters.experience || 'all'}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    experience: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
              >
                <option value="all">All Levels</option>
                <option value="novice">Novice</option>
                <option value="intermediate">Intermediate</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            {/* Minimum Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Rating
              </label>
              <select
                value={filters.rating || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    rating: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
              >
                <option value="">Any Rating</option>
                <option value="4">4+ Stars</option>
                <option value="4.5">4.5+ Stars</option>
                <option value="4.8">4.8+ Stars</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {filteredHelpers.length} helper
          {filteredHelpers.length !== 1 ? 's' : ''} found
        </span>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-primary-600 hover:text-primary-700"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Helper List */}
      <div className="space-y-3">
        {filteredHelpers.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">
              No helpers found
            </h3>
            <p className="text-gray-600">
              {searchQuery
                ? 'Try adjusting your search terms or filters'
                : 'Add helpers to your wedding team to get started'}
            </p>
            <button className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              Add Helper
            </button>
          </div>
        ) : (
          filteredHelpers.map((helper) => (
            <div
              key={helper.id}
              onClick={() => setSelectedHelper(helper)}
              className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-sm transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {helper.avatar ? (
                    <img
                      src={helper.avatar}
                      alt={helper.name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center text-xl">
                      {getRoleIcon(helper.role)}
                    </div>
                  )}
                  {helper.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success-500 border-2 border-white rounded-full"></div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 truncate">
                        {helper.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {helper.relationship || helper.role}
                      </p>
                    </div>

                    {/* Assignment Button */}
                    {isAssignmentMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedTaskId) {
                            assignTaskToHelper(helper.id, selectedTaskId);
                          }
                        }}
                        className="px-3 py-1.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Assign
                      </button>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(helper.role)}`}
                    >
                      {helper.role}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${getExperienceBadgeColor(helper.experience)}`}
                    >
                      {helper.experience}
                    </span>
                    {helper.assignedTasks <
                      helper.preferences.maxTasksPerDay && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-700 border border-success-200">
                        Available
                      </span>
                    )}
                  </div>

                  {/* Skills */}
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">Skills:</p>
                    <div className="flex flex-wrap gap-1">
                      {helper.skills.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                      {helper.skills.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                          +{helper.skills.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-warning-500 fill-current" />
                        <span className="font-medium">{helper.rating}</span>
                      </div>
                      <div className="text-gray-600">
                        {helper.completedTasks} tasks completed
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{formatLastActive(helper.lastActive)}</span>
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Helper Detail Modal */}
      {selectedHelper && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  Helper Details
                </h2>
                <button
                  onClick={() => setSelectedHelper(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="text-center">
                {selectedHelper.avatar ? (
                  <img
                    src={selectedHelper.avatar}
                    alt={selectedHelper.name}
                    className="w-20 h-20 rounded-full object-cover mx-auto mb-3"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">
                    {getRoleIcon(selectedHelper.role)}
                  </div>
                )}

                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {selectedHelper.name}
                </h3>
                <p className="text-gray-600 mb-2">
                  {selectedHelper.relationship || selectedHelper.role}
                </p>

                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-warning-500 fill-current" />
                    <span className="font-medium">{selectedHelper.rating}</span>
                  </div>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-600">
                    {selectedHelper.completedTasks} tasks completed
                  </span>
                </div>

                <div className="flex justify-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeColor(selectedHelper.role)}`}
                  >
                    {selectedHelper.role}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getExperienceBadgeColor(selectedHelper.experience)}`}
                  >
                    {selectedHelper.experience}
                  </span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Contact Information
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-700">
                      {selectedHelper.email}
                    </span>
                  </div>
                  {selectedHelper.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-500" />
                      <span className="text-gray-700">
                        {selectedHelper.phone}
                      </span>
                    </div>
                  )}
                  {selectedHelper.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-gray-500" />
                      <span className="text-gray-700">
                        {selectedHelper.location}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Skills & Experience */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Skills & Experience
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedHelper.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full border border-blue-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Workload */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Current Workload
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Assigned Tasks</span>
                    <span className="font-medium">
                      {selectedHelper.assignedTasks} /{' '}
                      {selectedHelper.preferences.maxTasksPerDay}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        selectedHelper.assignedTasks >=
                        selectedHelper.preferences.maxTasksPerDay
                          ? 'bg-error-500'
                          : 'bg-success-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          (selectedHelper.assignedTasks /
                            selectedHelper.preferences.maxTasksPerDay) *
                            100,
                          100,
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {selectedHelper.assignedTasks <
                    selectedHelper.preferences.maxTasksPerDay
                      ? `Available for ${selectedHelper.preferences.maxTasksPerDay - selectedHelper.assignedTasks} more task${
                          selectedHelper.preferences.maxTasksPerDay -
                            selectedHelper.assignedTasks !==
                          1
                            ? 's'
                            : ''
                        }`
                      : 'At maximum capacity'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {isAssignmentMode && (
                  <button
                    onClick={() => {
                      if (selectedTaskId) {
                        assignTaskToHelper(selectedHelper.id, selectedTaskId);
                      }
                      setSelectedHelper(null);
                    }}
                    className="w-full px-6 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
                  >
                    Assign Task to {selectedHelper.name}
                  </button>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Message
                  </button>
                  <button className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                    <Phone className="w-5 h-5" />
                    Call
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
