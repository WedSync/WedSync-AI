# WS-280 Thank You Management System - Team A Comprehensive Prompt
**Team A: Frontend/UI Specialists**

## 🎯 Your Mission: Beautiful Post-Wedding Gratitude Experience
You are the **Frontend/UI specialists** responsible for building an elegant and intuitive thank you management system that helps couples track gratitude during the overwhelming post-wedding period. Your focus: **A Pinterest-worthy gift registry combined with a wedding planner-style task tracker that makes sending thank you notes feel organized and meaningful**.

## 💝 The Post-Wedding Gratitude Challenge
**Context**: Sarah and Michael just returned from their honeymoon to find 150+ wedding gifts, vendor thank yous to send, and a growing sense of overwhelm. They need to track what they've received, who they've thanked, and ensure no one is forgotten while managing their new married life. **Your interface transforms the daunting thank you process into a beautiful, manageable experience**.

## 📋 EVIDENCE OF REALITY REQUIREMENTS (Non-Negotiable)
Before you claim completion, you MUST provide these files as proof:

### 🔍 Required Evidence Files:
1. **`/src/components/thank-you/ThankYouManager.tsx`** - Main thank you management dashboard
2. **`/src/components/thank-you/ThankYouTracker.tsx`** - Status tracking and progress interface
3. **`/src/components/thank-you/GiftRegistry.tsx`** - Gift tracking with photos and values
4. **`/src/components/thank-you/ThankYouComposer.tsx`** - Thank you note composition interface
5. **`/src/components/thank-you/ThankYouProgressBar.tsx`** - Visual progress tracking component

### 🎨 Design Requirements:
- **Visual Gift Registry**: Pinterest-style grid with gift photos and elegant cards
- **Progress Visualization**: Beautiful progress bars and completion celebrations
- **Mobile-First Design**: Perfect for updating while opening gifts or mailing notes
- **Emotional Connection**: Warm colors and typography that reflect gratitude
- **Batch Operations**: Efficient bulk status updates and organization tools
- **Wedding Context**: Integration with existing wedding theme and branding

Your interface makes post-wedding thank you management as delightful as opening the gifts themselves.

## 🎨 Core UI Components & Patterns

### Main Thank You Dashboard
```typescript
'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Gift, 
  Heart, 
  CheckCircle, 
  Clock, 
  Users, 
  Download,
  PlusCircle,
  Filter,
  Search,
  Mail
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ThankYouRecipient {
  id: string;
  recipientName: string;
  recipientType: 'vendor' | 'guest' | 'family' | 'friend';
  relationship: string;
  thankYouReason: string;
  status: 'pending' | 'drafted' | 'sent' | 'delivered' | 'acknowledged';
  gifts: WeddingGift[];
  lastContactDate: string | null;
  contactInfo: {
    email?: string;
    phone?: string;
    address?: string;
  };
}

interface WeddingGift {
  id: string;
  description: string;
  category: 'household' | 'experience' | 'monetary' | 'handmade';
  value: number;
  photoUrl?: string;
  notes?: string;
  receivedDate?: string;
}

interface ThankYouSummary {
  totalRecipients: number;
  pending: number;
  completed: number;
  totalGiftValue: number;
  averageGiftValue: number;
}

export function ThankYouManager({ weddingId, isPostWedding }: ThankYouManagerProps) {
  const [recipients, setRecipients] = useState<ThankYouRecipient[]>([]);
  const [summary, setSummary] = useState<ThankYouSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    loadThankYouData();
  }, [weddingId]);

  const loadThankYouData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/thank-you?weddingId=${weddingId}`);
      const data = await response.json();
      
      setRecipients(data.recipients || []);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error loading thank you data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecipients = recipients.filter(recipient => {
    const matchesSearch = recipient.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipient.relationship.toLowerCase().includes(searchTerm.toLowerCase());
    
    switch (filter) {
      case 'pending':
        return matchesSearch && !['sent', 'delivered', 'acknowledged'].includes(recipient.status);
      case 'completed':
        return matchesSearch && ['sent', 'delivered', 'acknowledged'].includes(recipient.status);
      default:
        return matchesSearch;
    }
  });

  const completionPercentage = summary ? 
    Math.round((summary.completed / summary.totalRecipients) * 100) : 0;

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-red-50 text-red-700 border-red-200',
      drafted: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      sent: 'bg-blue-50 text-blue-700 border-blue-200',
      delivered: 'bg-green-50 text-green-700 border-green-200',
      acknowledged: 'bg-purple-50 text-purple-700 border-purple-200'
    };
    return colors[status] || colors.pending;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'drafted': return <Mail className="w-4 h-4" />;
      case 'sent': return <Mail className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'acknowledged': return <Heart className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse p-8 space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Thank You Management
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Track your gratitude and ensure every special person who made your wedding day magical 
            receives the appreciation they deserve.
          </p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Recipients</p>
                  <p className="text-3xl font-bold text-gray-900">{summary?.totalRecipients || 0}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-orange-600">{summary?.pending || 0}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{summary?.completed || 0}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gift Value</p>
                  <p className="text-3xl font-bold text-purple-600">
                    ${summary?.totalGiftValue?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Gift className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Progress Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Heart className="w-5 h-5 text-rose-500" />
                  <span>Gratitude Progress</span>
                </span>
                <span className="text-2xl font-bold text-rose-600">
                  {completionPercentage}%
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress 
                  value={completionPercentage} 
                  className="h-4 bg-gray-100"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{summary?.completed || 0} thank yous sent</span>
                  <span>{summary?.pending || 0} remaining</span>
                </div>
                
                {completionPercentage === 100 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-center p-4 bg-green-50 rounded-lg border border-green-200"
                  >
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                    <p className="text-green-800 font-medium">
                      Congratulations! You've completed all your thank you notes! 🎉
                    </p>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/50 backdrop-blur">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="gifts" className="flex items-center space-x-2">
              <Gift className="w-4 h-4" />
              <span>Gift Registry</span>
            </TabsTrigger>
            <TabsTrigger value="tracker" className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>Tracker</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Actions */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    className="h-auto flex-col space-y-2 p-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    onClick={() => {/* Import guests logic */}}
                  >
                    <Users className="w-8 h-8" />
                    <span>Import Guests</span>
                  </Button>
                  
                  <Button 
                    className="h-auto flex-col space-y-2 p-6 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                    onClick={() => {/* Import vendors logic */}}
                  >
                    <Mail className="w-8 h-8" />
                    <span>Import Vendors</span>
                  </Button>
                  
                  <Button 
                    className="h-auto flex-col space-y-2 p-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                    onClick={() => {/* Add individual logic */}}
                  >
                    <PlusCircle className="w-8 h-8" />
                    <span>Add Individual</span>
                  </Button>
                  
                  <Button 
                    className="h-auto flex-col space-y-2 p-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                    onClick={() => {/* Export logic */}}
                  >
                    <Download className="w-8 h-8" />
                    <span>Export List</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recipients
                    .filter(r => r.lastContactDate)
                    .sort((a, b) => new Date(b.lastContactDate!).getTime() - new Date(a.lastContactDate!).getTime())
                    .slice(0, 5)
                    .map(recipient => (
                      <div key={recipient.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                        <div className={`p-2 rounded-full ${getStatusColor(recipient.status)}`}>
                          {getStatusIcon(recipient.status)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{recipient.recipientName}</p>
                          <p className="text-sm text-gray-600">
                            Thank you {recipient.status} • {recipient.relationship}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500">
                          {recipient.lastContactDate && 
                            new Date(recipient.lastContactDate).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gifts" className="space-y-6">
            <GiftRegistry 
              weddingId={weddingId}
              gifts={recipients.flatMap(r => r.gifts || [])}
              onAddGift={(gift) => {/* Add gift logic */}}
              onEditGift={(giftId, updates) => {/* Edit gift logic */}}
            />
          </TabsContent>

          <TabsContent value="tracker" className="space-y-6">
            {/* Search and Filters */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search recipients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    {['all', 'pending', 'completed'].map(filterOption => (
                      <Button
                        key={filterOption}
                        variant={filter === filterOption ? 'default' : 'outline'}
                        onClick={() => setFilter(filterOption as any)}
                        className="capitalize"
                      >
                        {filterOption}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recipients Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecipients.map((recipient, index) => (
                <motion.div
                  key={recipient.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-0 shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all duration-200 cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{recipient.recipientName}</CardTitle>
                          <p className="text-sm text-gray-600">{recipient.relationship}</p>
                        </div>
                        <Badge className={`${getStatusColor(recipient.status)} border`}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(recipient.status)}
                            <span>{recipient.status}</span>
                          </div>
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-sm text-gray-700">
                        <strong>Thank you for:</strong> {recipient.thankYouReason}
                      </p>
                      
                      {recipient.gifts && recipient.gifts.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Gifts:</p>
                          <div className="flex flex-wrap gap-1">
                            {recipient.gifts.slice(0, 2).map(gift => (
                              <span
                                key={gift.id}
                                className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded"
                              >
                                {gift.description}
                              </span>
                            ))}
                            {recipient.gifts.length > 2 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                +{recipient.gifts.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center pt-2">
                        <div className="text-xs text-gray-500">
                          {recipient.lastContactDate && (
                            <>Last contact: {new Date(recipient.lastContactDate).toLocaleDateString()}</>
                          )}
                        </div>
                        
                        <div className="flex space-x-1">
                          {recipient.status === 'pending' && (
                            <Button size="sm" className="bg-rose-500 hover:bg-rose-600">
                              Send Thank You
                            </Button>
                          )}
                          {recipient.status === 'sent' && (
                            <Button size="sm" variant="outline">
                              Mark Delivered
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {filteredRecipients.length === 0 && (
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
                <CardContent className="p-12 text-center">
                  <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    {filter === 'all' ? 'No recipients yet' : `No ${filter} recipients`}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {isPostWedding 
                      ? "Import your guests and vendors to start tracking thank you notes."
                      : "You can set up your thank you list now or wait until after the wedding."
                    }
                  </p>
                  {filter === 'all' && (
                    <div className="space-x-4">
                      <Button className="bg-gradient-to-r from-blue-500 to-blue-600">
                        Import from Guest List
                      </Button>
                      <Button variant="outline">
                        Import from Vendors
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
```

### Gift Registry Component
```typescript
'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Camera, DollarSign, Gift, Plus, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

interface GiftRegistryProps {
  weddingId: string;
  gifts: WeddingGift[];
  onAddGift: (gift: any) => void;
  onEditGift: (giftId: string, updates: any) => void;
}

export function GiftRegistry({ weddingId, gifts, onAddGift, onEditGift }: GiftRegistryProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingGift, setEditingGift] = useState<WeddingGift | null>(null);

  const categoryColors = {
    household: 'bg-blue-100 text-blue-800 border-blue-200',
    experience: 'bg-purple-100 text-purple-800 border-purple-200',
    monetary: 'bg-green-100 text-green-800 border-green-200',
    handmade: 'bg-orange-100 text-orange-800 border-orange-200'
  };

  const categoryIcons = {
    household: '🏠',
    experience: '✈️',
    monetary: '💰',
    handmade: '🎨'
  };

  const filteredGifts = gifts.filter(gift => {
    const matchesSearch = gift.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || gift.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalValue = gifts.reduce((sum, gift) => sum + (gift.value || 0), 0);
  const averageValue = gifts.length > 0 ? totalValue / gifts.length : 0;
  const giftsByCategory = gifts.reduce((acc, gift) => {
    acc[gift.category] = (acc[gift.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const GiftCard = ({ gift, index }: { gift: WeddingGift; index: number }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card 
        className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-200 cursor-pointer group"
        onClick={() => {
          setEditingGift(gift);
          setShowAddModal(true);
        }}
      >
        <div className="relative overflow-hidden rounded-t-lg">
          {gift.photoUrl ? (
            <img
              src={gift.photoUrl}
              alt={gift.description}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">
                  {categoryIcons[gift.category] || '🎁'}
                </div>
                <Camera className="w-6 h-6 text-gray-400 mx-auto" />
                <p className="text-xs text-gray-500 mt-1">Add Photo</p>
              </div>
            </div>
          )}
          
          <div className="absolute top-3 right-3">
            <Badge className={`${categoryColors[gift.category]} border shadow-sm`}>
              {gift.category}
            </Badge>
          </div>
          
          {gift.value && gift.value > 0 && (
            <div className="absolute bottom-3 left-3">
              <Badge className="bg-white/90 text-gray-900 border shadow-sm">
                ${gift.value.toLocaleString()}
              </Badge>
            </div>
          )}
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-2 group-hover:text-rose-600 transition-colors">
            {gift.description}
          </h3>
          
          {gift.notes && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {gift.notes}
            </p>
          )}
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {gift.receivedDate && new Date(gift.receivedDate).toLocaleDateString()}
            </span>
            <div className="flex items-center space-x-1">
              <Gift className="w-4 h-4" />
              <span>Gift #{gifts.indexOf(gift) + 1}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Gifts</p>
                <p className="text-3xl font-bold text-blue-900">{gifts.length}</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <Gift className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Value</p>
                <p className="text-3xl font-bold text-green-900">${totalValue.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <DollarSign className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Average Value</p>
                <p className="text-3xl font-bold text-purple-900">${Math.round(averageValue).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <DollarSign className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">With Photos</p>
                <p className="text-3xl font-bold text-orange-900">
                  {gifts.filter(g => g.photoUrl).length}
                </p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                <Camera className="w-6 h-6 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Gift className="w-5 h-5 text-rose-500" />
            <span>Gift Categories</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(giftsByCategory).map(([category, count]) => (
              <div
                key={category}
                className={`p-4 rounded-lg border-2 ${categoryColors[category]} text-center cursor-pointer hover:scale-105 transition-transform`}
                onClick={() => setCategoryFilter(categoryFilter === category ? 'all' : category)}
              >
                <div className="text-2xl mb-2">{categoryIcons[category]}</div>
                <p className="font-medium capitalize">{category}</p>
                <p className="text-lg font-bold">{count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search gifts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="Filter by category" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="household">🏠 Household</SelectItem>
                <SelectItem value="experience">✈️ Experience</SelectItem>
                <SelectItem value="monetary">💰 Monetary</SelectItem>
                <SelectItem value="handmade">🎨 Handmade</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Gift
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gifts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredGifts.map((gift, index) => (
          <GiftCard key={gift.id} gift={gift} index={index} />
        ))}
      </div>

      {filteredGifts.length === 0 && (
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="p-12 text-center">
            <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {gifts.length === 0 ? 'No gifts recorded yet' : 'No gifts match your search'}
            </h3>
            <p className="text-gray-600 mb-6">
              {gifts.length === 0 
                ? "Start tracking your wedding gifts to make thank you notes easier."
                : "Try adjusting your search terms or filters."
              }
            </p>
            <Button 
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
            >
              {gifts.length === 0 ? 'Add Your First Gift' : 'Add New Gift'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Gift Modal */}
      <GiftFormModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingGift(null);
        }}
        gift={editingGift}
        weddingId={weddingId}
        onSave={(giftData) => {
          if (editingGift) {
            onEditGift(editingGift.id, giftData);
          } else {
            onAddGift(giftData);
          }
          setShowAddModal(false);
          setEditingGift(null);
        }}
      />
    </div>
  );
}
```

### Thank You Progress Component
```typescript
'use client';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Mail, Heart, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

interface ThankYouProgressBarProps {
  summary: ThankYouSummary;
  recipients: ThankYouRecipient[];
}

export function ThankYouProgressBar({ summary, recipients }: ThankYouProgressBarProps) {
  const completionPercentage = summary.totalRecipients > 0 
    ? Math.round((summary.completed / summary.totalRecipients) * 100) 
    : 0;

  const getMotivationalMessage = (percentage: number) => {
    if (percentage === 100) return "🎉 Amazing! You've thanked everyone!";
    if (percentage >= 75) return "🌟 You're almost there! Keep going!";
    if (percentage >= 50) return "💪 Great progress! You're halfway done!";
    if (percentage >= 25) return "🚀 Nice start! You're building momentum!";
    return "💕 Every thank you note matters. You've got this!";
  };

  const statusBreakdown = recipients.reduce((acc, recipient) => {
    acc[recipient.status] = (acc[recipient.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusConfig = [
    { key: 'pending', label: 'Pending', icon: Clock, color: 'text-red-600 bg-red-100' },
    { key: 'drafted', label: 'Drafted', icon: Mail, color: 'text-yellow-600 bg-yellow-100' },
    { key: 'sent', label: 'Sent', icon: Mail, color: 'text-blue-600 bg-blue-100' },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
    { key: 'acknowledged', label: 'Acknowledged', icon: Heart, color: 'text-purple-600 bg-purple-100' }
  ];

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-rose-50 to-pink-50">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Trophy className="w-6 h-6 text-yellow-600" />
          <CardTitle className="text-2xl">Gratitude Journey</CardTitle>
        </div>
        <p className="text-gray-600">{getMotivationalMessage(completionPercentage)}</p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Progress */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">Overall Progress</span>
            <span className="text-2xl font-bold text-rose-600">{completionPercentage}%</span>
          </div>
          
          <div className="relative">
            <Progress value={completionPercentage} className="h-6 bg-gray-100" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium text-white drop-shadow">
                {summary.completed} of {summary.totalRecipients}
              </span>
            </div>
          </div>
          
          <div className="flex justify-between text-sm text-gray-600">
            <span>{summary.completed} completed</span>
            <span>{summary.pending} remaining</span>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {statusConfig.map(status => {
            const count = statusBreakdown[status.key] || 0;
            const percentage = summary.totalRecipients > 0 
              ? Math.round((count / summary.totalRecipients) * 100) 
              : 0;
            const IconComponent = status.icon;
            
            return (
              <motion.div
                key={status.key}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
                className="text-center"
              >
                <div className={`p-3 rounded-full ${status.color} mx-auto w-12 h-12 flex items-center justify-center mb-2`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-gray-600">{status.label}</p>
                <p className="text-xs text-gray-500">{percentage}%</p>
              </motion.div>
            );
          })}
        </div>

        {/* Achievement Badges */}
        {completionPercentage > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {completionPercentage >= 25 && (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                🌱 Getting Started
              </Badge>
            )}
            {completionPercentage >= 50 && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                🏃‍♀️ Halfway Hero
              </Badge>
            )}
            {completionPercentage >= 75 && (
              <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                ⭐ Almost There
              </Badge>
            )}
            {completionPercentage === 100 && (
              <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                🏆 Gratitude Champion
              </Badge>
            )}
          </div>
        )}

        {/* Next Steps */}
        {completionPercentage < 100 && (
          <div className="bg-white/50 rounded-lg p-4 border border-rose-200">
            <h4 className="font-medium text-gray-900 mb-2">Next Steps</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {summary.pending > 0 && (
                <li>• Complete {summary.pending} pending thank you notes</li>
              )}
              {statusBreakdown.drafted > 0 && (
                <li>• Send {statusBreakdown.drafted} drafted messages</li>
              )}
              {statusBreakdown.sent > 0 && (
                <li>• Track delivery of {statusBreakdown.sent} sent notes</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

## ✅ Acceptance Criteria Checklist

- [ ] **Visual Gift Registry** Pinterest-style grid with gift photos, categories, and elegant card layouts
- [ ] **Progress Visualization** beautiful progress bars with motivational messages and completion celebrations
- [ ] **Mobile-First Design** thumb-friendly interface perfect for updating while opening gifts or mailing notes
- [ ] **Emotional Connection** warm rose/pink color palette and gratitude-focused messaging throughout
- [ ] **Batch Operations** efficient bulk status updates and multi-select functionality for large thank you lists
- [ ] **Wedding Theme Integration** consistent with existing WedSync branding and wedding aesthetic
- [ ] **Search and Filter Excellence** powerful filtering by status, recipient type, gift category, and relationship
- [ ] **Import Workflow Optimization** seamless guest list and vendor import with smart duplicate detection
- [ ] **Status Tracking Innovation** visual status indicators with icons, colors, and progress animations
- [ ] **Gift Documentation Excellence** photo upload, value tracking, and category organization with visual appeal
- [ ] **Responsive Excellence** perfect experience across all devices from mobile to desktop
- [ ] **Navigation Integration** seamless integration with post-wedding dashboard navigation

Your interface transforms the overwhelming post-wedding thank you process into a beautiful, manageable, and even enjoyable experience that helps couples express genuine gratitude.

**Remember**: Every thank you note represents a meaningful relationship. Design with the love and appreciation these moments deserve! 💕💍