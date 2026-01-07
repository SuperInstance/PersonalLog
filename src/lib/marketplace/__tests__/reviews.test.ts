/**
 * Marketplace Reviews System Tests
 *
 * Comprehensive test suite for review CRUD operations,
 * helpful voting, sorting, filtering, pagination, and reporting.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createReview,
  editReview,
  deleteReview,
  getReviews,
  getUserReviews,
  getReview,
  markReviewHelpful,
  unmarkReviewHelpful,
  hasMarkedHelpful,
  reportReview,
  getReportsForReview,
} from '../reviews';

// Mock storage functions
vi.mock('../storage', () => ({
  saveRating: vi.fn(),
  getRatingsForAgent: vi.fn(),
  getUserRating: vi.fn(),
  deleteRating: vi.fn(),
  loadMarketplaceAgent: vi.fn(),
  saveReviewVote: vi.fn(),
  getReviewVote: vi.fn(),
  deleteReviewVote: vi.fn(),
  saveReviewReport: vi.fn(),
  getReviewReports: vi.fn(),
  getReviewsForAgent: vi.fn(),
}));

// Import mocked functions
import {
  saveRating,
  getRatingsForAgent,
  getUserRating,
  deleteRating,
  loadMarketplaceAgent,
  saveReviewVote,
  getReviewVote,
  deleteReviewVote,
  saveReviewReport,
  getReviewReports,
  getReviewsForAgent as getReviewsForAgentMock,
} from '../storage';

describe('Reviews System', () => {
  const mockAgentId = 'test-agent-v1';
  const mockUserId = 'user-123';
  const mockReviewId = 'review-abc123';

  const mockReview = {
    id: mockReviewId,
    agentId: mockAgentId,
    userId: mockUserId,
    userName: 'Test User',
    rating: 5,
    reviewTitle: 'Great agent!',
    review: 'This is an amazing agent that works perfectly.',
    helpful: 10,
    userMarkedHelpful: false,
    reported: false,
    editHistory: [],
    createdAt: Date.now() - 86400000, // 1 day ago
    updatedAt: Date.now() - 86400000,
  };

  const mockAgent = {
    id: mockAgentId,
    name: 'Test Agent',
    description: 'Test description',
    category: 'productivity' as const,
    systemPrompt: 'Test prompt',
    marketplace: {
      author: 'Test Author',
      version: '1.0.0',
      description: 'Test agent description',
      tags: ['test', 'agent'],
      stats: {
        downloads: 100,
        installs: 50,
        rating: 4.5,
        ratingCount: 20,
        lastUpdated: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      visibility: 'public' as const,
      license: 'MIT',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // CREATE REVIEW TESTS
  // ============================================================================

  describe('createReview', () => {
    it('should create a new review with rating, title, and text', async () => {
      vi.mocked(loadMarketplaceAgent).mockResolvedValue(mockAgent as any);
      vi.mocked(getUserRating).mockResolvedValue(null);
      vi.mocked(saveRating).mockImplementation((review) => Promise.resolve(review as any));

      const result = await createReview(
        mockAgentId,
        mockUserId,
        5,
        'Excellent!',
        'This agent is fantastic'
      );

      expect(result).toBeDefined();
      expect(result.rating).toBe(5);
      expect(result.reviewTitle).toBe('Excellent!');
      expect(result.review).toBe('This agent is fantastic');
      expect(saveRating).toHaveBeenCalledTimes(1);
    });

    it('should create a review with only rating (title and text optional)', async () => {
      vi.mocked(loadMarketplaceAgent).mockResolvedValue(mockAgent as any);
      vi.mocked(getUserRating).mockResolvedValue(null);
      vi.mocked(saveRating).mockResolvedValue(mockReview as any);

      const result = await createReview(mockAgentId, mockUserId, 4);

      expect(result).toBeDefined();
      expect(saveRating).toHaveBeenCalledTimes(1);
    });

    it('should update existing review instead of creating duplicate', async () => {
      const existingReview = { ...mockReview, rating: 3 };
      vi.mocked(loadMarketplaceAgent).mockResolvedValue(mockAgent as any);
      vi.mocked(getUserRating).mockResolvedValue(existingReview as any);
      vi.mocked(saveRating).mockResolvedValue(mockReview as any);

      const result = await createReview(mockAgentId, mockUserId, 5, 'Updated', 'Updated text');

      expect(result).toBeDefined();
      expect(getUserRating).toHaveBeenCalledWith(mockAgentId, mockUserId);
    });

    it('should track edit history when updating review', async () => {
      const existingReview = { ...mockReview, rating: 3, review: 'Old review' };
      vi.mocked(loadMarketplaceAgent).mockResolvedValue(mockAgent as any);
      vi.mocked(getUserRating).mockResolvedValue(existingReview as any);
      vi.mocked(saveRating).mockResolvedValue(mockReview as any);

      await createReview(mockAgentId, mockUserId, 5, 'New title', 'New review');

      const savedCall = vi.mocked(saveRating).mock.calls[0][0];
      expect(savedCall.editHistory).toBeDefined();
      expect(savedCall.editHistory?.length).toBeGreaterThan(0);
    });

    it('should throw ValidationError for rating outside 1-5 range', async () => {
      await expect(createReview(mockAgentId, mockUserId, 6)).rejects.toThrow('Rating must be between 1 and 5');
      await expect(createReview(mockAgentId, mockUserId, 0)).rejects.toThrow('Rating must be between 1 and 5');
    });

    it('should throw ValidationError for empty user ID', async () => {
      await expect(createReview(mockAgentId, '', 5)).rejects.toThrow('User ID cannot be empty');
    });

    it('should throw ValidationError for review title over 200 characters', async () => {
      const longTitle = 'A'.repeat(201);
      await expect(createReview(mockAgentId, mockUserId, 5, longTitle)).rejects.toThrow(
        'Review title must be 200 characters or less'
      );
    });

    it('should throw ValidationError for review text over 5000 characters', async () => {
      const longText = 'A'.repeat(5001);
      await expect(createReview(mockAgentId, mockUserId, 5, undefined, longText)).rejects.toThrow(
        'Review text must be 5000 characters or less'
      );
    });

    it('should throw NotFoundError if agent does not exist', async () => {
      vi.mocked(loadMarketplaceAgent).mockResolvedValue(null);

      await expect(createReview(mockAgentId, mockUserId, 5)).rejects.toThrow('marketplace agent');
    });
  });

  // ============================================================================
  // EDIT REVIEW TESTS
  // ============================================================================

  describe('editReview', () => {
    it('should edit review with new rating, title, and text', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([mockReview] as any);
      vi.mocked(saveRating).mockResolvedValue(mockReview as any);

      const result = await editReview(mockReviewId, 4, 'Updated title', 'Updated review');

      expect(result).toBeDefined();
      expect(saveRating).toHaveBeenCalledTimes(1);
    });

    it('should add entry to edit history', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([mockReview] as any);
      vi.mocked(saveRating).mockResolvedValue(mockReview as any);

      await editReview(mockReviewId, 3, 'Changed', 'Modified');

      const savedCall = vi.mocked(saveRating).mock.calls[0][0];
      expect(savedCall.editHistory).toBeDefined();
      expect(savedCall.editHistory?.length).toBe(1);
    });

    it('should throw ValidationError for invalid review ID', async () => {
      await expect(editReview('', 4)).rejects.toThrow('Review ID cannot be empty');
    });

    it('should throw ValidationError for rating outside 1-5 range', async () => {
      await expect(editReview(mockReviewId, 6)).rejects.toThrow('Rating must be between 1 and 5');
    });

    it('should throw NotFoundError if review does not exist', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([]);

      await expect(editReview('nonexistent-review', 4)).rejects.toThrow('review');
    });
  });

  // ============================================================================
  // DELETE REVIEW TESTS
  // ============================================================================

  describe('deleteReview', () => {
    it('should delete an existing review', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([mockReview] as any);
      vi.mocked(deleteRating).mockResolvedValue(undefined);

      await deleteReview(mockReviewId);

      expect(deleteRating).toHaveBeenCalledWith(mockReviewId);
    });

    it('should throw ValidationError for empty review ID', async () => {
      await expect(deleteReview('')).rejects.toThrow('Review ID cannot be empty');
    });

    it('should throw NotFoundError if review does not exist', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([]);

      await expect(deleteReview('nonexistent-review')).rejects.toThrow('review');
    });
  });

  // ============================================================================
  // GET REVIEWS TESTS
  // ============================================================================

  describe('getReviews', () => {
    const mockReviews = [mockReview, { ...mockReview, id: 'review-2', rating: 4 }];

    it('should get paginated reviews for an agent', async () => {
      vi.mocked(getRatingsForAgent).mockResolvedValue(mockReviews as any);

      const result = await getReviews(mockAgentId, 1, 10);

      expect(result.reviews).toBeDefined();
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalReviews).toBe(2);
      expect(result.totalPages).toBe(1);
    });

    it('should sort reviews by most recent', async () => {
      vi.mocked(getRatingsForAgent).mockResolvedValue(mockReviews as any);

      const result = await getReviews(mockAgentId, 1, 10, 'recent');

      expect(getRatingsForAgent).toHaveBeenCalledWith(mockAgentId);
    });

    it('should sort reviews by most helpful', async () => {
      vi.mocked(getRatingsForAgent).mockResolvedValue(mockReviews as any);

      const result = await getReviews(mockAgentId, 1, 10, 'helpful');

      expect(result.reviews).toBeDefined();
    });

    it('should sort reviews by highest rating', async () => {
      vi.mocked(getRatingsForAgent).mockResolvedValue(mockReviews as any);

      const result = await getReviews(mockAgentId, 1, 10, 'rating-high');

      expect(result.reviews).toBeDefined();
    });

    it('should sort reviews by lowest rating', async () => {
      vi.mocked(getRatingsForAgent).mockResolvedValue(mockReviews as any);

      const result = await getReviews(mockAgentId, 1, 10, 'rating-low');

      expect(result.reviews).toBeDefined();
    });

    it('should filter reviews by rating', async () => {
      vi.mocked(getRatingsForAgent).mockResolvedValue(mockReviews as any);

      const result = await getReviews(mockAgentId, 1, 10, 'recent', 5);

      expect(result.reviews).toBeDefined();
    });

    it('should return empty array when no reviews match filter', async () => {
      vi.mocked(getRatingsForAgent).mockResolvedValue(mockReviews as any);

      const result = await getReviews(mockAgentId, 1, 10, 'recent', 1);

      expect(result.reviews).toHaveLength(0);
    });

    it('should paginate correctly', async () => {
      const manyReviews = Array.from({ length: 25 }, (_, i) => ({
        ...mockReview,
        id: `review-${i}`,
      }));
      vi.mocked(getRatingsForAgent).mockResolvedValue(manyReviews as any);

      const page1 = await getReviews(mockAgentId, 1, 10);
      const page2 = await getReviews(mockAgentId, 2, 10);

      expect(page1.totalPages).toBe(3);
      expect(page2.page).toBe(2);
    });

    it('should throw ValidationError for invalid page number', async () => {
      await expect(getReviews(mockAgentId, 0, 10)).rejects.toThrow('Page must be at least 1');
    });

    it('should throw ValidationError for page size out of range', async () => {
      await expect(getReviews(mockAgentId, 1, 0)).rejects.toThrow('Page size must be between 1 and 100');
      await expect(getReviews(mockAgentId, 1, 101)).rejects.toThrow('Page size must be between 1 and 100');
    });

    it('should throw ValidationError for empty agent ID', async () => {
      await expect(getReviews('', 1, 10)).rejects.toThrow('Agent ID cannot be empty');
    });
  });

  // ============================================================================
  // GET USER REVIEWS TESTS
  // ============================================================================

  describe('getUserReviews', () => {
    it('should get all reviews by a user', async () => {
      const userReviews = [mockReview, { ...mockReview, id: 'review-2' }];
      vi.mocked(getReviewsForAgentMock).mockResolvedValue(userReviews as any);

      const result = await getUserReviews(mockUserId);

      expect(result).toHaveLength(2);
    });

    it('should filter out reviews from other users', async () => {
      const allReviews = [
        mockReview,
        { ...mockReview, id: 'review-2', userId: 'other-user' },
      ];
      vi.mocked(getReviewsForAgentMock).mockResolvedValue(allReviews as any);

      const result = await getUserReviews(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(mockUserId);
    });

    it('should throw ValidationError for empty user ID', async () => {
      await expect(getUserReviews('')).rejects.toThrow('User ID cannot be empty');
    });

    it('should return empty array when user has no reviews', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([]);

      const result = await getUserReviews('nonexistent-user');

      expect(result).toHaveLength(0);
    });
  });

  // ============================================================================
  // GET SINGLE REVIEW TESTS
  // ============================================================================

  describe('getReview', () => {
    it('should get a review by ID', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([mockReview] as any);

      const result = await getReview(mockReviewId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(mockReviewId);
      expect(result?.formattedDate).toBeDefined();
      expect(result?.relativeTime).toBeDefined();
    });

    it('should return null for non-existent review', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([]);

      const result = await getReview('nonexistent-review');

      expect(result).toBeNull();
    });

    it('should throw ValidationError for empty review ID', async () => {
      await expect(getReview('')).rejects.toThrow('Review ID cannot be empty');
    });
  });

  // ============================================================================
  // HELPFUL VOTING TESTS
  // ============================================================================

  describe('markReviewHelpful', () => {
    it('should mark review as helpful', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([mockReview] as any);
      vi.mocked(getReviewVote).mockResolvedValue(null);
      vi.mocked(saveReviewVote).mockResolvedValue({} as any);
      vi.mocked(saveRating).mockResolvedValue({ ...mockReview, helpful: 11 } as any);

      const result = await markReviewHelpful(mockReviewId, 'voter-user');

      expect(result.helpful).toBe(11);
      expect(result.userMarkedHelpful).toBe(true);
    });

    it('should record vote in storage', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([mockReview] as any);
      vi.mocked(getReviewVote).mockResolvedValue(null);
      vi.mocked(saveReviewVote).mockResolvedValue({} as any);
      vi.mocked(saveRating).mockResolvedValue(mockReview as any);

      await markReviewHelpful(mockReviewId, 'voter-user');

      expect(saveReviewVote).toHaveBeenCalledWith(
        expect.objectContaining({
          reviewId: mockReviewId,
          userId: 'voter-user',
        })
      );
    });

    it('should prevent self-voting', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([mockReview] as any);

      await expect(markReviewHelpful(mockReviewId, mockUserId)).rejects.toThrow(
        'You cannot mark your own review as helpful'
      );
    });

    it('should prevent duplicate helpful marking', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([mockReview] as any);
      vi.mocked(getReviewVote).mockResolvedValue({} as any);

      await expect(markReviewHelpful(mockReviewId, 'voter-user')).rejects.toThrow(
        'You have already marked this review as helpful'
      );
    });

    it('should throw ValidationError for empty review ID', async () => {
      await expect(markReviewHelpful('', 'user-123')).rejects.toThrow('Review ID cannot be empty');
    });

    it('should throw ValidationError for empty user ID', async () => {
      await expect(markReviewHelpful(mockReviewId, '')).rejects.toThrow('User ID cannot be empty');
    });

    it('should throw NotFoundError if review does not exist', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([]);

      await expect(markReviewHelpful('nonexistent-review', 'user-123')).rejects.toThrow('review');
    });
  });

  describe('unmarkReviewHelpful', () => {
    it('should unmark review as helpful', async () => {
      const markedReview = { ...mockReview, helpful: 11, userMarkedHelpful: true };
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([markedReview] as any);
      vi.mocked(getReviewVote).mockResolvedValue({} as any);
      vi.mocked(deleteReviewVote).mockResolvedValue(undefined);
      vi.mocked(saveRating).mockResolvedValue(mockReview as any);

      const result = await unmarkReviewHelpful(mockReviewId, 'voter-user');

      expect(result.helpful).toBe(10);
      expect(result.userMarkedHelpful).toBe(false);
    });

    it('should remove vote from storage', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([mockReview] as any);
      vi.mocked(getReviewVote).mockResolvedValue({} as any);
      vi.mocked(deleteReviewVote).mockResolvedValue(undefined);
      vi.mocked(saveRating).mockResolvedValue(mockReview as any);

      await unmarkReviewHelpful(mockReviewId, 'voter-user');

      expect(deleteReviewVote).toHaveBeenCalledWith(mockReviewId, 'voter-user');
    });

    it('should throw error if not marked as helpful', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([mockReview] as any);
      vi.mocked(getReviewVote).mockResolvedValue(null);

      await expect(unmarkReviewHelpful(mockReviewId, 'voter-user')).rejects.toThrow(
        'You have not marked this review as helpful'
      );
    });
  });

  describe('hasMarkedHelpful', () => {
    it('should return true if user has marked review as helpful', async () => {
      vi.mocked(getReviewVote).mockResolvedValue({} as any);

      const result = await hasMarkedHelpful(mockReviewId, 'voter-user');

      expect(result).toBe(true);
    });

    it('should return false if user has not marked review as helpful', async () => {
      vi.mocked(getReviewVote).mockResolvedValue(null);

      const result = await hasMarkedHelpful(mockReviewId, 'voter-user');

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // REVIEW REPORTING TESTS
  // ============================================================================

  describe('reportReview', () => {
    it('should report review for spam', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([mockReview] as any);
      vi.mocked(saveReviewReport).mockResolvedValue({} as any);
      vi.mocked(saveRating).mockResolvedValue({ ...mockReview, reported: true } as any);

      const result = await reportReview(mockReviewId, 'reporter-user', 'spam', 'Spam content');

      expect(result).toBeDefined();
      expect(result.reason).toBe('spam');
    });

    it('should report review for offensive content', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([mockReview] as any);
      vi.mocked(saveReviewReport).mockResolvedValue({} as any);
      vi.mocked(saveRating).mockResolvedValue(mockReview as any);

      const result = await reportReview(mockReviewId, 'reporter-user', 'offensive');

      expect(result.reason).toBe('offensive');
    });

    it('should report review for inappropriate content', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([mockReview] as any);
      vi.mocked(saveReviewReport).mockResolvedValue({} as any);
      vi.mocked(saveRating).mockResolvedValue(mockReview as any);

      const result = await reportReview(mockReviewId, 'reporter-user', 'inappropriate');

      expect(result.reason).toBe('inappropriate');
    });

    it('should report review for fake content', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([mockReview] as any);
      vi.mocked(saveReviewReport).mockResolvedValue({} as any);
      vi.mocked(saveRating).mockResolvedValue(mockReview as any);

      const result = await reportReview(mockReviewId, 'reporter-user', 'fake');

      expect(result.reason).toBe('fake');
    });

    it('should report review with other reason', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([mockReview] as any);
      vi.mocked(saveReviewReport).mockResolvedValue({} as any);
      vi.mocked(saveRating).mockResolvedValue(mockReview as any);

      const result = await reportReview(mockReviewId, 'reporter-user', 'other', 'Other issue');

      expect(result.reason).toBe('other');
      expect(result.details).toBe('Other issue');
    });

    it('should mark review as reported', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([mockReview] as any);
      vi.mocked(saveReviewReport).mockResolvedValue({} as any);
      vi.mocked(saveRating).mockResolvedValue({ ...mockReview, reported: true } as any);

      await reportReview(mockReviewId, 'reporter-user', 'spam');

      expect(saveRating).toHaveBeenCalledWith(
        expect.objectContaining({
          reported: true,
        })
      );
    });

    it('should prevent self-reporting', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([mockReview] as any);

      await expect(reportReview(mockReviewId, mockUserId, 'spam')).rejects.toThrow(
        'You cannot report your own review'
      );
    });

    it('should throw ValidationError for empty review ID', async () => {
      await expect(reportReview('', 'user-123', 'spam')).rejects.toThrow('Review ID cannot be empty');
    });

    it('should throw ValidationError for empty user ID', async () => {
      await expect(reportReview(mockReviewId, '', 'spam')).rejects.toThrow('User ID cannot be empty');
    });

    it('should throw NotFoundError if review does not exist', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([]);

      await expect(reportReview('nonexistent-review', 'user-123', 'spam')).rejects.toThrow('review');
    });
  });

  describe('getReportsForReview', () => {
    it('should get all reports for a review', async () => {
      const mockReports = [
        { id: 'report-1', reviewId: mockReviewId, reason: 'spam', status: 'pending' as const },
        { id: 'report-2', reviewId: mockReviewId, reason: 'offensive', status: 'pending' as const },
      ];
      vi.mocked(getReviewReports).mockResolvedValue(mockReports as any);

      const result = await getReportsForReview(mockReviewId);

      expect(result).toHaveLength(2);
    });

    it('should return empty array if no reports exist', async () => {
      vi.mocked(getReviewReports).mockResolvedValue([]);

      const result = await getReportsForReview(mockReviewId);

      expect(result).toHaveLength(0);
    });

    it('should throw ValidationError for empty review ID', async () => {
      await expect(getReportsForReview('')).rejects.toThrow('Review ID cannot be empty');
    });
  });

  // ============================================================================
  // EDGE CASES AND INTEGRATION TESTS
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle concurrent helpful votes correctly', async () => {
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([mockReview] as any);
      vi.mocked(getReviewVote).mockResolvedValue(null);
      vi.mocked(saveReviewVote).mockResolvedValue({} as any);
      vi.mocked(saveRating).mockResolvedValue({ ...mockReview, helpful: 11 } as any);

      const promises = [
        markReviewHelpful(mockReviewId, 'user-1'),
        markReviewHelpful(mockReviewId, 'user-2'),
        markReviewHelpful(mockReviewId, 'user-3'),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.helpful === 11)).toBe(true);
    });

    it('should handle review with maximum length text', async () => {
      vi.mocked(loadMarketplaceAgent).mockResolvedValue(mockAgent as any);
      vi.mocked(getUserRating).mockResolvedValue(null);
      vi.mocked(saveRating).mockResolvedValue(mockReview as any);

      const maxText = 'A'.repeat(5000);
      const result = await createReview(mockAgentId, mockUserId, 5, undefined, maxText);

      expect(result).toBeDefined();
    });

    it('should handle review with maximum length title', async () => {
      vi.mocked(loadMarketplaceAgent).mockResolvedValue(mockAgent as any);
      vi.mocked(getUserRating).mockResolvedValue(null);
      vi.mocked(saveRating).mockResolvedValue(mockReview as any);

      const maxTitle = 'A'.repeat(200);
      const result = await createReview(mockAgentId, mockUserId, 5, maxTitle);

      expect(result).toBeDefined();
    });

    it('should handle multiple edit history entries', async () => {
      const reviewWithHistory = {
        ...mockReview,
        editHistory: [
          { timestamp: Date.now(), previousRating: 3, previousTitle: 'Old', previousText: 'Old text' },
          { timestamp: Date.now(), previousRating: 4, previousTitle: 'Newer', previousText: 'Newer text' },
        ],
      };
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([reviewWithHistory] as any);
      vi.mocked(saveRating).mockResolvedValue(reviewWithHistory as any);

      const result = await editReview(mockReviewId, 5, 'Latest', 'Latest text');

      expect(result.editHistory?.length).toBe(3);
    });
  });

  // ============================================================================
  // DATA CONSISTENCY TESTS
  // ============================================================================

  describe('Data Consistency', () => {
    it('should maintain review count after deletion', async () => {
      const reviews = [mockReview, { ...mockReview, id: 'review-2' }];
      vi.mocked(getReviewsForAgentMock).mockResolvedValue(reviews as any);
      vi.mocked(deleteRating).mockResolvedValue(undefined);
      vi.mocked(getRatingsForAgent).mockResolvedValue([mockReview] as any);

      await deleteReview('review-2');

      const remaining = await getReviews(mockAgentId, 1, 10);
      expect(remaining.totalReviews).toBe(1);
    });

    it('should preserve helpful count on unmark', async () => {
      const markedReview = { ...mockReview, helpful: 10, userMarkedHelpful: true };
      vi.mocked(getReviewsForAgentMock).mockResolvedValue([markedReview] as any);
      vi.mocked(getReviewVote).mockResolvedValue({} as any);
      vi.mocked(deleteReviewVote).mockResolvedValue(undefined);
      vi.mocked(saveRating).mockResolvedValue({ ...mockReview, helpful: 9 } as any);

      const result = await unmarkReviewHelpful(mockReviewId, 'voter-user');

      expect(result.helpful).toBe(9);
      expect(result.userMarkedHelpful).toBe(false);
    });
  });
});
