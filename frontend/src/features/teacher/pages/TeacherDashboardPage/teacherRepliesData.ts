// ============================================
// Teacher Replies Mock Data
// ============================================

export interface TeacherReply {
  id: string;
  reviewId: string;
  content: string;
  createdAt: string;
}

export type ReviewCategory = 'review' | 'inquiry';

export interface ReviewForReply {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  courseId: string;
  courseName: string;
  teacherId: string;
  category: ReviewCategory;
  overallRating?: number;
  teachingRating?: number;
  courseRating?: number;
  communicationRating?: number;
  punctualityRating?: number;
  title?: string;
  content: string;
  tags?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  reply?: TeacherReply | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReplyStats {
  totalReviews: number;
  pendingReplies: number;
  repliedCount: number;
}

export interface ReplyTemplate {
  id: string;
  name: string;
  nameEn: string;
  category: 'thank' | 'apologize' | 'explain' | 'encourage';
  content: string;
  contentEn: string;
}

// Mock reviews data
export const MOCK_REVIEWS_FOR_REPLY: ReadonlyArray<ReviewForReply> = [
  {
    id: 'review-001',
    userId: 'user-001',
    userName: '李女士',
    userAvatar: undefined,
    courseId: 'course-001',
    courseName: '一年级数学启蒙班',
    teacherId: 'teacher-001',
    category: 'review',
    overallRating: 5,
    teachingRating: 5,
    courseRating: 5,
    communicationRating: 5,
    punctualityRating: 5,
    title: '非常推荐张老师！',
    content: '老师讲解清晰，孩子成绩有明显提升。教学方法生动有趣，孩子很喜欢上张老师的课。',
    tags: ['讲解清晰', '因材施教', '有耐心'],
    status: 'approved',
    reply: null,
    createdAt: '2026-01-10T10:30:00Z',
    updatedAt: '2026-01-10T10:30:00Z',
  },
  {
    id: 'review-002',
    userId: 'user-002',
    userName: '王先生',
    userAvatar: undefined,
    courseId: 'course-002',
    courseName: '三年级英语强化班',
    teacherId: 'teacher-001',
    category: 'review',
    overallRating: 4,
    teachingRating: 4,
    courseRating: 4,
    communicationRating: 5,
    punctualityRating: 4,
    title: '不错的课程体验',
    content: '课程内容丰富，老师很专业。只是有时候进度稍快，孩子需要更多时间消化。',
    tags: ['专业', '内容丰富'],
    status: 'approved',
    reply: null,
    createdAt: '2026-01-08T14:20:00Z',
    updatedAt: '2026-01-08T14:20:00Z',
  },
  {
    id: 'review-003',
    userId: 'user-003',
    userName: '张妈妈',
    userAvatar: undefined,
    courseId: 'course-001',
    courseName: '一年级数学启蒙班',
    teacherId: 'teacher-001',
    category: 'review',
    overallRating: 5,
    teachingRating: 5,
    courseRating: 4,
    communicationRating: 5,
    punctualityRating: 5,
    title: '孩子进步很大',
    content: '经过一个学期的学习，孩子的数学兴趣明显提高了。张老师特别有耐心，非常感谢！',
    tags: ['有耐心', '激发兴趣'],
    status: 'approved',
    reply: {
      id: 'reply-001',
      reviewId: 'review-003',
      content: '感谢张妈妈的认可！孩子的进步是我们最大的欣慰。期待继续陪伴孩子的学习之旅。',
      createdAt: '2026-01-05T16:00:00Z',
    },
    createdAt: '2026-01-04T09:15:00Z',
    updatedAt: '2026-01-04T09:15:00Z',
  },
  {
    id: 'inquiry-001',
    userId: 'user-004',
    userName: '陈爸爸',
    userAvatar: undefined,
    courseId: 'course-001',
    courseName: '一年级数学启蒙班',
    teacherId: 'teacher-001',
    category: 'inquiry',
    content: '请问这个课程适合几岁的孩子？零基础可以学吗？有没有试听课？',
    status: 'pending',
    reply: null,
    createdAt: '2026-01-12T11:45:00Z',
    updatedAt: '2026-01-12T11:45:00Z',
  },
  {
    id: 'review-005',
    userId: 'user-005',
    userName: '刘女士',
    userAvatar: undefined,
    courseId: 'course-002',
    courseName: '三年级英语强化班',
    teacherId: 'teacher-001',
    category: 'review',
    overallRating: 5,
    teachingRating: 5,
    courseRating: 5,
    communicationRating: 5,
    punctualityRating: 5,
    title: '超级推荐！',
    content: '老师发音标准，教学方法科学有效。孩子的英语成绩从70分提升到了90分！',
    tags: ['效果显著', '发音标准', '方法科学'],
    status: 'approved',
    reply: null,
    createdAt: '2025-12-28T15:30:00Z',
    updatedAt: '2025-12-28T15:30:00Z',
  },
  {
    id: 'inquiry-002',
    userId: 'user-006',
    userName: '赵妈妈',
    userAvatar: undefined,
    courseId: 'course-001',
    courseName: '一年级数学启蒙班',
    teacherId: 'teacher-001',
    category: 'inquiry',
    content: '想了解一下上课时间和收费标准，还有是否提供课后作业辅导？',
    status: 'pending',
    reply: null,
    createdAt: '2026-01-14T09:20:00Z',
    updatedAt: '2026-01-14T09:20:00Z',
  },
];

// Mock reply stats
export const MOCK_REPLY_STATS: ReplyStats = {
  totalReviews: MOCK_REVIEWS_FOR_REPLY.length,
  pendingReplies: MOCK_REVIEWS_FOR_REPLY.filter(r => !r.reply).length,
  repliedCount: MOCK_REVIEWS_FOR_REPLY.filter(r => r.reply).length,
};

// Mock reply templates
export const MOCK_REPLY_TEMPLATES: ReadonlyArray<ReplyTemplate> = [
  {
    id: 'template-001',
    name: '感谢类',
    nameEn: 'Thank You',
    category: 'thank',
    content: '感谢您的认可！很高兴课程对孩子有所帮助。孩子的进步是我们最大的动力。',
    contentEn:
      "Thank you for your kind words! We are glad to hear that the classes are helping. Your child's progress is our greatest motivation.",
  },
  {
    id: 'template-002',
    name: '感谢类2',
    nameEn: 'Thank You 2',
    category: 'thank',
    content: '非常感谢您的好评！我们会继续努力，为每一位学员提供最优质的学习体验。',
    contentEn:
      'Thank you so much for the wonderful review! We are committed to providing the best learning experience for every student.',
  },
  {
    id: 'template-003',
    name: '致歉类',
    nameEn: 'Apology',
    category: 'apologize',
    content: '对此给您带来的不便，我们深表歉意。我们会持续改进教学质量。',
    contentEn:
      'We sincerely apologize for any inconvenience. We will continue to improve our teaching quality.',
  },
  {
    id: 'template-004',
    name: '解释类',
    nameEn: 'Explanation',
    category: 'explain',
    content: '感谢您的反馈。我们会不断改进教学方法和课程内容。',
    contentEn:
      'Thank you for your feedback. We are constantly working to improve our teaching methods and materials.',
  },
  {
    id: 'template-005',
    name: '鼓励类',
    nameEn: 'Encouragement',
    category: 'encourage',
    content: '继续加油！我们相信通过努力，每个孩子都能实现自己的目标。',
    contentEn:
      'Keep up the great work! We believe every student can achieve their goals with dedication.',
  },
];

// Helper function to calculate days ago
export const getDaysAgo = (dateString: string): number => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};
