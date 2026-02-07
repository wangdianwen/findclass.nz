/**
 * Reviews Module - Types
 * Type definitions for reviews functionality
 */

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  courseId?: string;
  courseName?: string;
  teacherId: string;
  teacherName?: string;
  bookingId?: string;

  // Ratings (1-5)
  overallRating: number;
  teachingRating?: number;
  courseRating?: number;
  communicationRating?: number;
  punctualityRating?: number;

  // Content
  title?: string;
  content: string;
  tags: string[];

  // Status
  status: ReviewStatus;

  // Stats
  helpfulCount: number;

  // Reply
  reply?: ReviewReply;

  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
}

export interface ReviewReply {
  id: string;
  reviewId: string;
  teacherId: string;
  teacherName?: string;
  teacherAvatar?: string;
  content: string;
  createdAt: Date;
}

export interface ReviewStatistics {
  teacherId: string;
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  teachingAvg?: number;
  courseAvg?: number;
  communicationAvg?: number;
  punctualityAvg?: number;
}

export interface CreateReviewDTO {
  teacherId: string;
  courseId?: string;
  bookingId?: string;
  overallRating: number;
  teachingRating?: number;
  courseRating?: number;
  communicationRating?: number;
  punctualityRating?: number;
  title?: string;
  content: string;
  tags?: string[];
}

export interface ReviewFilters {
  teacherId?: string;
  courseId?: string;
  userId?: string;
  status?: ReviewStatus;
  minRating?: number;
  maxRating?: number;
  page?: number;
  limit?: number;
  sortBy?: 'recent' | 'helpful';
}

// Pagination response types
export interface PaginatedReviewsResponse {
  data: Review[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
