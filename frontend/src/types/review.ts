// Review types for course reviews module
// Based on product design spec

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
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  isPublic: boolean;
  isEdited: boolean;

  // Stats
  helpfulCount: number;
  reportCount: number;

  // Reply
  reply?: ReviewReply;

  // Timestamps
  createdAt: string;
  updatedAt?: string;
  editedAt?: string;
}

export interface ReviewReply {
  id: string;
  reviewId: string;
  teacherId: string;
  teacherName: string;
  teacherAvatar?: string;
  content: string;
  isPublic: boolean;
  createdAt: string;
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

export interface ReviewFormValues {
  overallRating: number;
  teachingRating?: number;
  courseRating?: number;
  communicationRating?: number;
  punctualityRating?: number;
  title?: string;
  content: string;
  tags: string[];
}

export interface ReviewFilter {
  rating?: number; // 0 = all, 1-5 = filter by rating
  sortBy?: 'recent' | 'helpful';
}
