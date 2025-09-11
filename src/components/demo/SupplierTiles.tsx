'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CameraIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  SparklesIcon,
  BuildingOfficeIcon,
  ScissorsIcon,
  PaintBrushIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftIcon,
  CalendarIcon,
  DocumentIcon,
  FolderIcon,
  PhoneIcon,
  GlobeAltIcon,
  AtSymbolIcon
} from '@heroicons/react/24/outline';
import { 
  InstagramLogoIcon,
  TwitterLogoIcon,
  LinkedInLogoIcon
} from '@radix-ui/react-icons';
import { DemoPersona, getPersonaById, DEMO_COUPLES, getCouplesForSupplier } from '@/lib/demo/config';
import { useDemoAuth } from '@/lib/demo/auth-provider';
import { SupplierLogoBg, getSupplierColors } from '@/lib/demo/brand-assets';

// Job status mapping
const JOB_STATUSES = {
  inquiry: { label: 'Inquiry', color: 'bg-yellow-100 text-yellow-800' },
  booked: { label: 'Booked', color: 'bg-green-100 text-green-800' },
  'pre-wedding': { label: 'Pre-Wedding', color: 'bg-blue-100 text-blue-800' },
  delivered: { label: 'Delivered', color: 'bg-purple-100 text-purple-800' }
} as const;

// Icon mapping for supplier types
const getSupplierIcon = (vendorType: string) => {
  const iconProps = { className: "h-5 w-5" };
  
  switch (vendorType) {
    case 'photographer':
      return <CameraIcon {...iconProps} />;
    case 'videographer':
      return <VideoCameraIcon {...iconProps} />;
    case 'dj':
      return <MusicalNoteIcon {...iconProps} />;
    case 'florist':
      return <SparklesIcon {...iconProps} />;
    case 'caterer':
      return <BuildingOfficeIcon {...iconProps} />;
    case 'musician':
      return <MusicalNoteIcon {...iconProps} />;
    case 'venue':
      return <BuildingOfficeIcon {...iconProps} />;
    case 'hair':
      return <ScissorsIcon {...iconProps} />;
    case 'makeup':
      return <PaintBrushIcon {...iconProps} />;
    case 'planner':
      return <ClipboardDocumentListIcon {...iconProps} />;
    default:
      return <BuildingOfficeIcon {...iconProps} />;
  }
};

// Get job status for demo (simulated)
const getJobStatus = (supplierId: string, coupleId: string): keyof typeof JOB_STATUSES => {
  // Simulate different statuses based on supplier type and couple
  const hash = (supplierId + coupleId).length % 4;
  const statuses: (keyof typeof JOB_STATUSES)[] = ['inquiry', 'booked', 'pre-wedding', 'delivered'];
  return statuses[hash];
};

// Quick action buttons component
function QuickActions({ supplier }: { supplier: DemoPersona }) {
  const actions = [
    {
      label: 'Message',
      icon: <ChatBubbleLeftIcon className="h-4 w-4" />,
      onClick: () => console.log('Message', supplier.name),
      color: 'bg-blue-50 hover:bg-blue-100 text-blue-700'
    },
    {
      label: 'Timeline',
      icon: <CalendarIcon className="h-4 w-4" />,
      onClick: () => console.log('Timeline', supplier.name),
      color: 'bg-green-50 hover:bg-green-100 text-green-700'
    },
    {
      label: 'Forms',
      icon: <DocumentIcon className="h-4 w-4" />,
      onClick: () => console.log('Forms', supplier.name),
      color: 'bg-purple-50 hover:bg-purple-100 text-purple-700'
    },
    {
      label: 'Files',
      icon: <FolderIcon className="h-4 w-4" />,
      onClick: () => console.log('Files', supplier.name),
      color: 'bg-orange-50 hover:bg-orange-100 text-orange-700'
    }
  ];

  return (
    <div className="flex gap-1">
      {actions.map((action) => (
        <Button
          key={action.label}
          size="sm"
          variant="ghost"
          className={`h-8 px-2 ${action.color} hover:scale-105 transition-transform`}
          onClick={action.onClick}
        >
          {action.icon}
          <span className="ml-1 hidden sm:inline text-xs">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}

// Contact links component
function ContactLinks({ supplier }: { supplier: DemoPersona }) {
  const contacts = [
    {
      icon: <GlobeAltIcon className="h-4 w-4" />,
      label: 'Website',
      href: '#',
      color: 'text-gray-600 hover:text-gray-800'
    },
    {
      icon: <InstagramLogoIcon className="h-4 w-4" />,
      label: 'Instagram',
      href: '#',
      color: 'text-pink-600 hover:text-pink-800'
    },
    {
      icon: <AtSymbolIcon className="h-4 w-4" />,
      label: 'Email',
      href: `mailto:hello@${supplier.company?.toLowerCase().replace(/\s+/g, '')}.com`,
      color: 'text-blue-600 hover:text-blue-800'
    },
    {
      icon: <PhoneIcon className="h-4 w-4" />,
      label: 'Call',
      href: 'tel:+1234567890',
      color: 'text-green-600 hover:text-green-800'
    }
  ];

  return (
    <div className="flex gap-2">
      {contacts.map((contact) => (
        <a
          key={contact.label}
          href={contact.href}
          className={`p-1 rounded hover:bg-gray-100 transition-colors ${contact.color}`}
          title={contact.label}
        >
          {contact.icon}
        </a>
      ))}
    </div>
  );
}

// Individual supplier tile component
function SupplierTile({ supplier, coupleId, showStatus = true }: { 
  supplier: DemoPersona; 
  coupleId: string; 
  showStatus?: boolean 
}) {
  const jobStatus = getJobStatus(supplier.id, coupleId);
  const status = JOB_STATUSES[jobStatus];
  const supplierColors = getSupplierColors(supplier.id);

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-l-4" 
          style={{ borderLeftColor: supplierColors.primary }}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Professional Logo */}
            <div className="flex-shrink-0">
              <SupplierLogoBg 
                supplierId={supplier.id}
                size={48}
                className="demo-logo-interactive"
              />
            </div>
            
            {/* Name and Type */}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold text-gray-900 truncate">
                {supplier.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant="secondary" 
                  className="text-xs"
                  style={{ 
                    backgroundColor: supplierColors.primary + '20',
                    color: supplierColors.primary
                  }}
                >
                  {supplier.metadata?.vendorType || supplier.role}
                </Badge>
                {showStatus && (
                  <Badge className={`text-xs ${status.color}`}>
                    {status.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        {/* Blurb */}
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
          {supplier.blurb}
        </p>
        
        {/* Specialties */}
        {supplier.metadata?.specialties && (
          <div className="flex flex-wrap gap-1">
            {supplier.metadata.specialties.slice(0, 2).map((specialty: string) => (
              <span 
                key={specialty}
                className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700"
              >
                {specialty}
              </span>
            ))}
            {supplier.metadata.specialties.length > 2 && (
              <span className="text-xs text-gray-500">
                +{supplier.metadata.specialties.length - 2} more
              </span>
            )}
          </div>
        )}
        
        {/* Experience */}
        {supplier.metadata?.yearsExperience && (
          <div className="text-xs text-gray-500">
            {supplier.metadata.yearsExperience} years of experience
          </div>
        )}
        
        {/* Quick Actions */}
        <div className="pt-2 border-t border-gray-100">
          <QuickActions supplier={supplier} />
        </div>
        
        {/* Contact Links */}
        <div className="flex items-center justify-between pt-2">
          <ContactLinks supplier={supplier} />
          <div className="text-xs text-gray-400">
            Updated 2h ago
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main supplier tiles component
interface SupplierTilesProps {
  coupleId?: string;
  className?: string;
  title?: string;
  showAddSupplier?: boolean;
  layout?: 'grid' | 'list';
  maxSuppliers?: number;
}

export function SupplierTiles({
  coupleId,
  className = '',
  title = 'Your Suppliers',
  showAddSupplier = true,
  layout = 'grid',
  maxSuppliers
}: SupplierTilesProps) {
  const { session } = useDemoAuth();
  const [viewAll, setViewAll] = useState(false);

  // Get current couple's suppliers
  const getCurrentCoupleSuppliers = () => {
    if (coupleId) {
      const couple = DEMO_COUPLES.find(c => c.id === coupleId);
      return couple?.suppliers.map(id => getPersonaById(id)).filter(Boolean) || [];
    }
    
    // If no specific couple ID, use the first couple's suppliers as demo data
    const defaultCouple = DEMO_COUPLES[0];
    return defaultCouple?.suppliers.map(id => getPersonaById(id)).filter(Boolean) || [];
  };

  const suppliers = getCurrentCoupleSuppliers() as DemoPersona[];
  const displaySuppliers = maxSuppliers && !viewAll ? suppliers.slice(0, maxSuppliers) : suppliers;
  const hasMore = maxSuppliers && suppliers.length > maxSuppliers;

  if (suppliers.length === 0) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Suppliers Yet</h3>
        <p className="text-gray-600 mb-4">Start building your wedding team by adding suppliers.</p>
        {showAddSupplier && (
          <Button>Add First Supplier</Button>
        )}
      </div>
    );
  }

  const gridClass = layout === 'grid' 
    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
    : 'space-y-4';

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        {showAddSupplier && (
          <Button size="sm" variant="outline">
            Add Supplier
          </Button>
        )}
      </div>

      {/* Supplier Tiles */}
      <div className={gridClass}>
        {displaySuppliers.map((supplier) => (
          <SupplierTile
            key={supplier.id}
            supplier={supplier}
            coupleId={coupleId || 'sarah-michael'}
          />
        ))}
      </div>

      {/* View More/Less */}
      {hasMore && (
        <div className="text-center mt-6">
          <Button 
            variant="outline" 
            onClick={() => setViewAll(!viewAll)}
          >
            {viewAll ? 'Show Less' : `View All ${suppliers.length} Suppliers`}
          </Button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {suppliers.filter(s => getJobStatus(s.id, coupleId || 'sarah-michael') === 'booked').length}
          </div>
          <div className="text-sm text-green-700">Booked</div>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {suppliers.filter(s => getJobStatus(s.id, coupleId || 'sarah-michael') === 'pre-wedding').length}
          </div>
          <div className="text-sm text-blue-700">Pre-Wedding</div>
        </div>
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {suppliers.filter(s => getJobStatus(s.id, coupleId || 'sarah-michael') === 'inquiry').length}
          </div>
          <div className="text-sm text-yellow-700">Inquiries</div>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {suppliers.filter(s => getJobStatus(s.id, coupleId || 'sarah-michael') === 'delivered').length}
          </div>
          <div className="text-sm text-purple-700">Completed</div>
        </div>
      </div>
    </div>
  );
}

export default SupplierTiles;