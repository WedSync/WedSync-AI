/**
 * OptimizedImage Component Unit Tests - WS-079 Photo Gallery System
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import '@testing-library/jest-dom';
import { OptimizedImage } from '@/components/photos/OptimizedImage';
import { Photo } from '@/types/photos';
import * as imageOptimization from '@/lib/utils/image-optimization';
// Mock the image optimization utilities
jest.mock('@/lib/utils/image-optimization', () => ({
  getOptimizedImageUrl: jest.fn(),
  generateBlurPlaceholder: jest.fn(),
  generateSrcSet: jest.fn(),
  generateSizes: jest.fn()
}));
// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, onLoad, onError, ...props }: any) => (
    <img
      src={src}
      alt={alt}
      onLoad={onLoad}
      onError={onError}
      data-testid="next-image"
      {...props}
    />
  )
const mockPhoto: Photo = {
  id: 'photo-1',
  bucketId: 'bucket-1',
  organizationId: 'org-1',
  filename: 'test.jpg',
  filePath: '/photos/test.jpg',
  thumbnailPath: '/photos/thumbs/test_thumb.jpg',
  previewPath: '/photos/previews/test_preview.jpg',
  optimizedPath: '/photos/optimized/test_opt.jpg',
  title: 'Test Photo',
  altText: 'A test photo',
  width: 2048,
  height: 1536,
  sortOrder: 0,
  isFeatured: false,
  isApproved: true,
  approvalStatus: 'approved',
  viewCount: 0,
  downloadCount: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  uploadedBy: 'user-1',
  tags: []
};
describe('OptimizedImage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (imageOptimization.getOptimizedImageUrl as jest.Mock).mockReturnValue(
      'https://example.com/optimized-image.jpg'
    );
    (imageOptimization.generateBlurPlaceholder as jest.Mock).mockReturnValue(
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...'
    (imageOptimization.generateSrcSet as jest.Mock).mockReturnValue(
      'https://example.com/image-400.jpg 400w, https://example.com/image-800.jpg 800w'
    (imageOptimization.generateSizes as jest.Mock).mockReturnValue(
      '(max-width: 640px) 100vw, 50vw'
  });
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<OptimizedImage photo={mockPhoto} fill />);
      
      const image = screen.getByTestId('next-image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/optimized-image.jpg');
      expect(image).toHaveAttribute('alt', 'Test Photo');
    });
    it('should use custom alt text when provided', () => {
      render(<OptimizedImage photo={mockPhoto} alt="Custom alt text" fill />);
      expect(image).toHaveAttribute('alt', 'Custom alt text');
    it('should fallback to photo altText', () => {
      const photoWithoutTitle = { ...mockPhoto, title: undefined };
      render(<OptimizedImage photo={photoWithoutTitle} fill />);
      expect(image).toHaveAttribute('alt', 'A test photo');
    it('should fallback to filename when no alt text available', () => {
      const photoMinimal = {
        ...mockPhoto,
        title: undefined,
        altText: undefined
      };
      render(<OptimizedImage photo={photoMinimal} fill />);
      expect(image).toHaveAttribute('alt', 'Photo: test.jpg');
  describe('Quality Selection', () => {
    it('should use specified quality', () => {
      render(<OptimizedImage photo={mockPhoto} quality="thumbnail" fill />);
      expect(imageOptimization.getOptimizedImageUrl).toHaveBeenCalledWith(
        mockPhoto,
        'thumbnail'
      );
    it('should default to preview quality', () => {
        'preview'
  describe('Responsive Images', () => {
    it('should generate srcSet and sizes for responsive images', () => {
      render(<OptimizedImage photo={mockPhoto} responsive fill />);
      expect(image).toHaveAttribute(
        'srcSet', 
        'https://example.com/image-400.jpg 400w, https://example.com/image-800.jpg 800w'
      expect(image).toHaveAttribute('sizes', '(max-width: 640px) 100vw, 50vw');
      expect(imageOptimization.generateSrcSet).toHaveBeenCalledWith(mockPhoto);
      expect(imageOptimization.generateSizes).toHaveBeenCalledWith(undefined);
    it('should use custom breakpoints for sizes', () => {
      const breakpoints = {
        mobile: '90vw',
        tablet: '45vw',
        desktop: '30vw'
      render(
        <OptimizedImage 
          photo={mockPhoto} 
          responsive 
          breakpoints={breakpoints}
          fill 
        />
      expect(imageOptimization.generateSizes).toHaveBeenCalledWith(breakpoints);
    it('should not generate srcSet when responsive is false', () => {
      render(<OptimizedImage photo={mockPhoto} responsive={false} fill />);
      expect(image).not.toHaveAttribute('srcSet');
      expect(image).not.toHaveAttribute('sizes');
      expect(imageOptimization.generateSrcSet).not.toHaveBeenCalled();
      expect(imageOptimization.generateSizes).not.toHaveBeenCalled();
  describe('Loading States', () => {
    it('should show loading overlay initially', () => {
      const { container } = render(<OptimizedImage photo={mockPhoto} fill />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    it('should hide loading overlay when image loads', () => {
      fireEvent.load(image);
      expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
    it('should call onLoad callback when image loads', () => {
      const onLoad = jest.fn();
      render(<OptimizedImage photo={mockPhoto} onLoad={onLoad} fill />);
      expect(onLoad).toHaveBeenCalled();
  describe('Error Handling', () => {
    it('should show error state when image fails to load', () => {
      fireEvent.error(image);
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    it('should try fallback quality on error', () => {
      (imageOptimization.getOptimizedImageUrl as jest.Mock)
        .mockReturnValueOnce('https://example.com/preview.jpg')
        .mockReturnValueOnce('https://example.com/thumbnail.jpg');
          quality="preview" 
          fallbackQuality="thumbnail" 
    it('should call onError callback', () => {
      const onError = jest.fn();
      render(<OptimizedImage photo={mockPhoto} onError={onError} fill />);
      expect(onError).toHaveBeenCalledWith(
        new Error('Failed to load image: test.jpg')
  describe('Blur Placeholder', () => {
    it('should use generated blur placeholder', () => {
      expect(image).toHaveAttribute('blurDataURL', 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...');
      expect(image).toHaveAttribute('placeholder', 'blur');
      expect(imageOptimization.generateBlurPlaceholder).toHaveBeenCalledWith(mockPhoto);
  describe('CSS Classes', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <OptimizedImage photo={mockPhoto} className="custom-class" fill />
      expect(container.firstChild).toHaveClass('custom-class');
    it('should apply relative positioning class', () => {
      expect(container.firstChild).toHaveClass('relative');
  describe('Props Forwarding', () => {
    it('should forward Image props to Next.js Image component', () => {
          priority
          width={400}
          height={300}
          style={{ borderRadius: '8px' }}
      expect(image).toHaveAttribute('priority');
      expect(image).toHaveAttribute('width', '400');
      expect(image).toHaveAttribute('height', '300');
      expect(image).toHaveStyle({ borderRadius: '8px' });
  describe('Edge Cases', () => {
    it('should handle photo with missing file paths', () => {
      const photoNoFiles = {
        thumbnailPath: undefined,
        previewPath: undefined,
        optimizedPath: undefined
      render(<OptimizedImage photo={photoNoFiles} fill />);
        photoNoFiles,
    it('should not retry fallback when fallback is same as current quality', () => {
          quality="thumbnail" 
      // Should only be called once (for initial load)
      expect(imageOptimization.getOptimizedImageUrl).toHaveBeenCalledTimes(1);
  describe('Integration', () => {
    it('should work with all image optimization utilities', () => {
          quality="optimized"
          responsive
          breakpoints={{ mobile: '100vw' }}
        'optimized'
      expect(imageOptimization.generateSizes).toHaveBeenCalledWith({ mobile: '100vw' });
});
