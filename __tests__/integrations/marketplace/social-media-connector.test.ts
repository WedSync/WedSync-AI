import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { SocialMediaConnector } from '@/lib/integrations/marketplace/social-media-connector'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client
vi.mock('@supabase/supabase-js')
const mockSupabase = vi.mocked(createClient)

// Mock the social media adapters
vi.mock('@/lib/integrations/marketplace/social-adapters/InstagramAdapter', () => ({
  InstagramAdapter: vi.fn().mockImplementation(() => ({
    authenticate: vi.fn().mockResolvedValue({ success: true, accessToken: 'mock-instagram-token' }),
    postImage: vi.fn().mockResolvedValue({ success: true, postId: 'post-123' }),
    schedulePost: vi.fn().mockResolvedValue({ success: true, scheduledId: 'scheduled-123' }),
    getAnalytics: vi.fn().mockResolvedValue({ likes: 100, comments: 25, shares: 10 }),
    bulkUpload: vi.fn().mockResolvedValue({ postsUploaded: 5, errors: [] })
  }))
}))

vi.mock('@/lib/integrations/marketplace/social-adapters/FacebookAdapter', () => ({
  FacebookAdapter: vi.fn().mockImplementation(() => ({
    authenticate: vi.fn().mockResolvedValue({ success: true, accessToken: 'mock-facebook-token' }),
    postImage: vi.fn().mockResolvedValue({ success: true, postId: 'fb-post-123' }),
    schedulePost: vi.fn().mockResolvedValue({ success: true, scheduledId: 'fb-scheduled-123' }),
    getAnalytics: vi.fn().mockResolvedValue({ likes: 200, comments: 45, shares: 30 }),
    bulkUpload: vi.fn().mockResolvedValue({ postsUploaded: 3, errors: [] })
  }))
}))

vi.mock('@/lib/integrations/marketplace/social-adapters/PinterestAdapter', () => ({
  PinterestAdapter: vi.fn().mockImplementation(() => ({
    authenticate: vi.fn().mockResolvedValue({ success: true, accessToken: 'mock-pinterest-token' }),
    createPin: vi.fn().mockResolvedValue({ success: true, pinId: 'pin-123' }),
    schedulePost: vi.fn().mockResolvedValue({ success: true, scheduledId: 'pin-scheduled-123' }),
    getAnalytics: vi.fn().mockResolvedValue({ impressions: 500, saves: 75, clicks: 25 }),
    bulkUpload: vi.fn().mockResolvedValue({ postsUploaded: 8, errors: [] })
  }))
}))

describe('SocialMediaConnector', () => {
  let socialConnector: SocialMediaConnector
  let mockSupabaseClient: any

  beforeEach(() => {
    mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      data: []
    }
    
    mockSupabase.mockReturnValue(mockSupabaseClient)
    socialConnector = new SocialMediaConnector()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('connectSocialPlatform', () => {
    test('should successfully connect to Instagram', async () => {
      const vendorId = 'vendor-123'
      const platform = 'instagram'

      const result = await socialConnector.connectSocialPlatform(platform, vendorId)

      expect(result).toEqual({
        success: true,
        platform: 'instagram',
        connectionId: expect.any(String),
        message: 'Successfully connected to Instagram'
      })
    })

    test('should successfully connect to Facebook', async () => {
      const vendorId = 'vendor-123'
      const platform = 'facebook'

      const result = await socialConnector.connectSocialPlatform(platform, vendorId)

      expect(result).toEqual({
        success: true,
        platform: 'facebook',
        connectionId: expect.any(String),
        message: 'Successfully connected to Facebook'
      })
    })

    test('should successfully connect to Pinterest', async () => {
      const vendorId = 'vendor-123'
      const platform = 'pinterest'

      const result = await socialConnector.connectSocialPlatform(platform, vendorId)

      expect(result).toEqual({
        success: true,
        platform: 'pinterest',
        connectionId: expect.any(String),
        message: 'Successfully connected to Pinterest'
      })
    })

    test('should throw error for unsupported platform', async () => {
      const vendorId = 'vendor-123'
      const platform = 'tiktok'

      await expect(socialConnector.connectSocialPlatform(platform, vendorId))
        .rejects.toThrow('Unsupported social media platform: tiktok')
    })
  })

  describe('postContent', () => {
    test('should post to Instagram successfully', async () => {
      const vendorId = 'vendor-123'
      const platform = 'instagram'
      const postData = {
        image: 'https://example.com/image.jpg',
        caption: 'Beautiful wedding photography',
        tags: ['#wedding', '#photography']
      }

      const result = await socialConnector.postContent(vendorId, platform, postData)

      expect(result).toEqual({
        success: true,
        platform: 'instagram',
        postId: 'post-123',
        postedAt: expect.any(Date)
      })
    })

    test('should post to Facebook successfully', async () => {
      const vendorId = 'vendor-123'
      const platform = 'facebook'
      const postData = {
        image: 'https://example.com/image.jpg',
        message: 'Check out this amazing wedding!'
      }

      const result = await socialConnector.postContent(vendorId, platform, postData)

      expect(result).toEqual({
        success: true,
        platform: 'facebook',
        postId: 'fb-post-123',
        postedAt: expect.any(Date)
      })
    })

    test('should create pin on Pinterest successfully', async () => {
      const vendorId = 'vendor-123'
      const platform = 'pinterest'
      const postData = {
        image: 'https://example.com/image.jpg',
        title: 'Wedding Inspiration',
        description: 'Beautiful wedding decor ideas'
      }

      const result = await socialConnector.postContent(vendorId, platform, postData)

      expect(result).toEqual({
        success: true,
        platform: 'pinterest',
        postId: 'pin-123',
        postedAt: expect.any(Date)
      })
    })
  })

  describe('schedulePost', () => {
    test('should schedule posts across multiple platforms', async () => {
      const vendorId = 'vendor-123'
      const postData = {
        content: 'Wedding season is here!',
        image: 'https://example.com/image.jpg',
        scheduledTime: new Date('2024-03-15T10:00:00Z')
      }

      const instagramResult = await socialConnector.schedulePost(vendorId, 'instagram', postData)
      const facebookResult = await socialConnector.schedulePost(vendorId, 'facebook', postData)
      const pinterestResult = await socialConnector.schedulePost(vendorId, 'pinterest', postData)

      expect(instagramResult.scheduledId).toBe('scheduled-123')
      expect(facebookResult.scheduledId).toBe('fb-scheduled-123')
      expect(pinterestResult.scheduledId).toBe('pin-scheduled-123')
    })
  })

  describe('getAnalytics', () => {
    test('should get analytics from Instagram', async () => {
      const vendorId = 'vendor-123'
      const platform = 'instagram'

      const result = await socialConnector.getAnalytics(vendorId, platform, 30)

      expect(result).toEqual({
        platform: 'instagram',
        period: 30,
        metrics: {
          likes: 100,
          comments: 25,
          shares: 10
        }
      })
    })

    test('should get analytics from Facebook', async () => {
      const vendorId = 'vendor-123'
      const platform = 'facebook'

      const result = await socialConnector.getAnalytics(vendorId, platform, 30)

      expect(result).toEqual({
        platform: 'facebook',
        period: 30,
        metrics: {
          likes: 200,
          comments: 45,
          shares: 30
        }
      })
    })

    test('should get analytics from Pinterest', async () => {
      const vendorId = 'vendor-123'
      const platform = 'pinterest'

      const result = await socialConnector.getAnalytics(vendorId, platform, 30)

      expect(result).toEqual({
        platform: 'pinterest',
        period: 30,
        metrics: {
          impressions: 500,
          saves: 75,
          clicks: 25
        }
      })
    })
  })

  describe('bulkUpload', () => {
    test('should perform bulk upload to multiple platforms', async () => {
      const vendorId = 'vendor-123'
      const mediaFiles = [
        { url: 'https://example.com/image1.jpg', caption: 'Wedding 1' },
        { url: 'https://example.com/image2.jpg', caption: 'Wedding 2' },
        { url: 'https://example.com/image3.jpg', caption: 'Wedding 3' }
      ]

      const instagramResult = await socialConnector.bulkUpload(vendorId, 'instagram', mediaFiles)
      const facebookResult = await socialConnector.bulkUpload(vendorId, 'facebook', mediaFiles)
      const pinterestResult = await socialConnector.bulkUpload(vendorId, 'pinterest', mediaFiles)

      expect(instagramResult.postsUploaded).toBe(5)
      expect(facebookResult.postsUploaded).toBe(3)
      expect(pinterestResult.postsUploaded).toBe(8)
    })
  })

  describe('getAllConnections', () => {
    test('should return all social media connections for vendor', async () => {
      const vendorId = 'vendor-123'
      
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: [
              { id: '1', platform: 'instagram', status: 'connected', followers: 1500 },
              { id: '2', platform: 'facebook', status: 'connected', followers: 2200 },
              { id: '3', platform: 'pinterest', status: 'connected', followers: 800 }
            ],
            error: null
          })
        })
      })

      const result = await socialConnector.getAllConnections(vendorId)

      expect(result).toHaveLength(3)
      expect(result[0].platform).toBe('instagram')
      expect(result[1].platform).toBe('facebook')
      expect(result[2].platform).toBe('pinterest')
    })
  })

  describe('getScheduledPosts', () => {
    test('should return scheduled posts for vendor', async () => {
      const vendorId = 'vendor-123'
      
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: [
              { 
                id: '1', 
                platform: 'instagram', 
                content: 'Wedding post 1',
                scheduledTime: '2024-03-15T10:00:00Z',
                status: 'scheduled'
              },
              { 
                id: '2', 
                platform: 'facebook', 
                content: 'Wedding post 2',
                scheduledTime: '2024-03-15T14:00:00Z',
                status: 'scheduled'
              }
            ],
            error: null
          })
        })
      })

      const result = await socialConnector.getScheduledPosts(vendorId)

      expect(result).toHaveLength(2)
      expect(result[0].platform).toBe('instagram')
      expect(result[1].platform).toBe('facebook')
    })
  })

  describe('getSupportedPlatforms', () => {
    test('should return list of supported social media platforms', async () => {
      const platforms = await socialConnector.getSupportedPlatforms()

      expect(platforms).toEqual([
        { name: 'Instagram', id: 'instagram', features: ['posts', 'stories', 'reels', 'analytics'] },
        { name: 'Facebook', id: 'facebook', features: ['posts', 'pages', 'events', 'ads', 'analytics'] },
        { name: 'Pinterest', id: 'pinterest', features: ['pins', 'boards', 'analytics', 'rich_pins'] }
      ])
    })
  })

  describe('updateAutoPosting', () => {
    test('should update auto-posting settings', async () => {
      const connectionId = 'conn-123'
      const settings = { autoPost: true, postFrequency: 'daily', bestTimes: ['10:00', '14:00'] }

      mockSupabaseClient.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: { ...settings, id: connectionId },
            error: null
          })
        })
      })

      const result = await socialConnector.updateAutoPosting(connectionId, settings)

      expect(result.autoPost).toBe(true)
      expect(result.postFrequency).toBe('daily')
      expect(result.bestTimes).toEqual(['10:00', '14:00'])
    })
  })

  describe('disconnectSocialPlatform', () => {
    test('should disconnect social media platform', async () => {
      const connectionId = 'conn-123'
      const vendorId = 'vendor-123'

      mockSupabaseClient.from.mockReturnValueOnce({
        delete: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockResolvedValueOnce({
              data: { id: connectionId },
              error: null
            })
          })
        })
      })

      const result = await socialConnector.disconnectSocialPlatform(connectionId, vendorId)

      expect(result.success).toBe(true)
      expect(result.message).toBe('Social media platform disconnected successfully')
    })
  })
})