'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Camera,
  Upload,
  Loader2,
  CheckCircle,
  Edit,
  X,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';

interface ScannedReceiptData {
  vendor_name: string;
  amount: number;
  date: string;
  items: Array<{
    description: string;
    price: number;
  }>;
  suggested_category: {
    name: string;
    confidence: number;
    id?: string;
  };
  tax_amount?: number;
  payment_method?: string;
  receipt_number?: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

export default function SmartReceiptScanner({
  weddingId,
  categories = [],
  onReceiptProcessed,
}: {
  weddingId: string;
  categories?: Category[];
  onReceiptProcessed: (data: ScannedReceiptData) => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedReceiptData | null>(
    null,
  );
  const [showEditor, setShowEditor] = useState(false);
  const [editedData, setEditedData] = useState<ScannedReceiptData | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      processReceiptImage(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const processReceiptImage = async (file: File) => {
    setIsProcessing(true);
    setUploadProgress(0);

    try {
      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      // Create form data
      const formData = new FormData();
      formData.append('image', file);
      formData.append('weddingId', weddingId);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/receipts/scan', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process receipt');
      }

      const data: ScannedReceiptData = await response.json();

      // Validate the response data
      if (!data.vendor_name || !data.amount || !data.date) {
        throw new Error('Incomplete receipt data extracted');
      }

      setScannedData(data);
      setEditedData({ ...data });
      setShowEditor(true);

      toast.success('Receipt scanned successfully!', {
        description: `Extracted data from ${data.vendor_name} with ${data.suggested_category.confidence}% confidence`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to scan receipt';
      toast.error(errorMessage, {
        description: 'Please try again with a clearer image',
      });
      console.error('Receipt processing error:', error);
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processReceiptImage(file);
    }
  };

  const updateEditedData = (field: string, value: any) => {
    if (!editedData) return;

    setEditedData((prev) => ({
      ...prev!,
      [field]: value,
    }));
  };

  const updateLineItem = (
    index: number,
    field: 'description' | 'price',
    value: string | number,
  ) => {
    if (!editedData) return;

    const updatedItems = [...editedData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === 'price' ? Number(value) : value,
    };

    setEditedData((prev) => ({
      ...prev!,
      items: updatedItems,
    }));
  };

  const addLineItem = () => {
    if (!editedData) return;

    setEditedData((prev) => ({
      ...prev!,
      items: [...prev!.items, { description: '', price: 0 }],
    }));
  };

  const removeLineItem = (index: number) => {
    if (!editedData || editedData.items.length <= 1) return;

    setEditedData((prev) => ({
      ...prev!,
      items: prev!.items.filter((_, i) => i !== index),
    }));
  };

  const confirmReceiptData = () => {
    if (editedData) {
      // Validate edited data
      if (!editedData.vendor_name || !editedData.amount || !editedData.date) {
        toast.error('Please fill in all required fields');
        return;
      }

      onReceiptProcessed(editedData);
      resetScanner();
      toast.success('Expense added successfully!');
    }
  };

  const resetScanner = () => {
    setScannedData(null);
    setEditedData(null);
    setShowEditor(false);
    setIsProcessing(false);
    setUploadProgress(0);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 70)
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Smart Receipt Scanner
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            AI-powered receipt scanning with automatic expense categorization
          </p>
        </CardHeader>
        <CardContent>
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Processing receipt...</p>
              <p className="text-sm text-muted-foreground mb-4">
                Extracting data using AI technology
              </p>
              {uploadProgress > 0 && (
                <div className="w-full max-w-xs">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-center mt-1">
                    {uploadProgress}% complete
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                {isDragActive ? (
                  <p className="text-primary font-medium">
                    Drop the receipt image here...
                  </p>
                ) : (
                  <div>
                    <p className="font-medium mb-2">
                      Drop receipt image here, or click to browse
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supports JPG, PNG, WebP up to 10MB
                    </p>
                  </div>
                )}
              </div>

              {/* Manual upload buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-16 flex flex-col gap-2"
                  variant="outline"
                >
                  <Upload className="w-6 h-6" />
                  <span>Choose File</span>
                </Button>

                <Button
                  onClick={() => {
                    // Future: implement camera capture
                    toast.info('Camera feature coming in the next update!');
                  }}
                  className="h-16 flex flex-col gap-2"
                  variant="outline"
                >
                  <Camera className="w-6 h-6" />
                  <span>Take Photo</span>
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scanned Data Editor */}
      {showEditor && editedData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Review Scanned Receipt
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={resetScanner}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Review and confirm the extracted information
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vendor_name">Vendor Name *</Label>
                  <Input
                    id="vendor_name"
                    value={editedData.vendor_name}
                    onChange={(e) =>
                      updateEditedData('vendor_name', e.target.value)
                    }
                    placeholder="Enter vendor name"
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Total Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={editedData.amount}
                    onChange={(e) =>
                      updateEditedData(
                        'amount',
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={editedData.date}
                    onChange={(e) => updateEditedData('date', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={editedData.suggested_category.id || ''}
                    onValueChange={(value) => {
                      const category = categories.find((c) => c.id === value);
                      if (category) {
                        updateEditedData('suggested_category', {
                          id: category.id,
                          name: category.name,
                          confidence: editedData.suggested_category.confidence,
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-1">
                    <Badge
                      variant="secondary"
                      className={getConfidenceColor(
                        editedData.suggested_category.confidence,
                      )}
                    >
                      {editedData.suggested_category.confidence}% confidence
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Optional Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="tax_amount">Tax Amount</Label>
                  <Input
                    id="tax_amount"
                    type="number"
                    step="0.01"
                    value={editedData.tax_amount || ''}
                    onChange={(e) =>
                      updateEditedData(
                        'tax_amount',
                        parseFloat(e.target.value) || undefined,
                      )
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select
                    value={editedData.payment_method || ''}
                    onValueChange={(value) =>
                      updateEditedData('payment_method', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="debit_card">Debit Card</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="bank_transfer">
                        Bank Transfer
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="receipt_number">Receipt Number</Label>
                  <Input
                    id="receipt_number"
                    value={editedData.receipt_number || ''}
                    onChange={(e) =>
                      updateEditedData('receipt_number', e.target.value)
                    }
                    placeholder="Receipt #"
                  />
                </div>
              </div>

              {/* Line Items */}
              {editedData.items && editedData.items.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Line Items</Label>
                    <Button size="sm" variant="outline" onClick={addLineItem}>
                      Add Item
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {editedData.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 border rounded"
                      >
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(index, 'description', e.target.value)
                          }
                          placeholder="Item description"
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={item.price}
                          onChange={(e) =>
                            updateLineItem(index, 'price', e.target.value)
                          }
                          placeholder="0.00"
                          className="w-24"
                        />
                        {editedData.items.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeLineItem(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={confirmReceiptData} className="flex-1">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Add to Budget
                </Button>
                <Button variant="outline" onClick={resetScanner}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
