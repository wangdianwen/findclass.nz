// Storybook Static Mock Data
// This data is used directly in Storybook stories for static display
// Note: MSW handlers provide API data for stories that need network requests

import type { CourseData } from '@/types/course';
import type { CourseDetail } from '@/types/courseDetail';
import type { Review, ReviewStatistics } from '@/types/review';

// ============================================
// Course Data for Storybook Stories
// ============================================

export const STORYBOOK_COURSES: CourseData[] = [
  {
    id: '1',
    title: '高中数学提高班',
    price: 50,
    lessonCount: 12,
    lessonDuration: 90,
    rating: 4.9,
    reviewCount: 128,
    city: 'auckland',
    region: 'Auckland CBD',
    subject: '数学',
    grade: '高中',
    teacherName: '张老师',
    trustLevel: 'S',
    teachingMode: 'offline',
    language: '中文授课',
    schedule: '周末下午',
  },
  {
    id: '2',
    title: 'GCSE数学冲刺',
    price: 45,
    lessonCount: 10,
    lessonDuration: 60,
    rating: 4.8,
    reviewCount: 86,
    city: 'auckland',
    region: 'Epsom',
    subject: '数学',
    grade: '初中/高中',
    teacherName: '李老师',
    trustLevel: 'A',
    teachingMode: 'offline',
    language: '中英双语',
    schedule: '平日晚上',
  },
  {
    id: '3',
    title: '钢琴一对一辅导',
    price: 60,
    lessonCount: 8,
    lessonDuration: 45,
    rating: 4.9,
    reviewCount: 45,
    city: 'auckland',
    region: 'Remuera',
    subject: '音乐',
    grade: '成人',
    teacherName: '王老师',
    trustLevel: 'S',
    teachingMode: 'offline',
    language: '英文授课',
    schedule: '灵活时间',
  },
  {
    id: '4',
    title: 'Python编程入门',
    price: 40,
    lessonCount: 15,
    lessonDuration: 90,
    rating: 4.7,
    reviewCount: 67,
    city: 'online',
    region: 'Online',
    subject: '编程',
    grade: '初中',
    teacherName: '陈老师',
    trustLevel: 'A',
    teachingMode: 'online',
    language: '中文授课',
    schedule: '平日晚上',
  },
  {
    id: '5',
    title: '雅思英语强化',
    price: 55,
    lessonCount: 12,
    lessonDuration: 60,
    rating: 4.8,
    reviewCount: 92,
    city: 'auckland',
    region: 'Newmarket',
    subject: '英语',
    grade: '成人',
    teacherName: '刘老师',
    trustLevel: 'S',
    teachingMode: 'offline',
    language: '英文授课',
    schedule: '周末上午',
  },
  {
    id: '6',
    title: '游泳私教课程',
    price: 70,
    lessonCount: 6,
    lessonDuration: 60,
    rating: 4.9,
    reviewCount: 34,
    city: 'auckland',
    region: 'Parnell',
    subject: '体育',
    grade: '全年龄',
    teacherName: '周教练',
    trustLevel: 'S',
    teachingMode: 'offline',
    language: '中文授课',
    schedule: '平日白天',
  },
];

// ============================================
// Course Detail Data for Storybook Stories
// ============================================

export const STORYBOOK_COURSE_DETAIL: CourseDetail = {
  id: '1',
  title: '高中数学提高班',
  description: `<h2>课程概述</h2>
<p>针对新西兰<strong>NCEA Level 2/3数学课程</strong>，包括微积分、统计学和几何学。</p>

<p>本课程专为高中学生设计，帮助他们掌握数学核心概念，提升解题能力。</p>

<h2>课程特色</h2>
<ul>
  <li>由经验丰富的奥克兰大学数学硕士授课</li>
  <li>8年新西兰高中数学教学经验</li>
  <li>数百名学生成绩明显提升</li>
  <li>提供课后答疑和作业辅导</li>
</ul>

<h2>教学安排</h2>
<p>课程采用<em>小班教学</em>，每班不超过6人，确保每位学生都能得到充分关注。</p>

<h3>上课时间</h3>
<p>周六、周日下午 14:00-16:00</p>

<h3>授课地点</h3>
<p>Auckland CBD, 123 Queen Street</p>`,
  price: 50,
  lessonCount: 12,
  originalPrice: 60,
  rating: 4.9,
  reviewCount: 128,
  trustLevel: 'S',
  dataSource: 'first_party',
  sourceWeight: 1.5,
  publishedAt: '2025-01-10T10:00:00Z',
  updatedAt: '2026-01-15T14:30:00Z',
  subject: '数学',
  grade: ['高中'],
  teachingMode: 'offline',
  language: 'chinese',
  schedule: {
    days: ['Sat', 'Sun'],
    timeSlots: ['14:00-16:00'],
    duration: 120,
    location: 'Auckland CBD',
    address: '123 Queen Street, Auckland',
    showAddress: true,
  },
  teacher: {
    id: 'teacher-001',
    name: '张老师',
    title: '奥克兰大学数学硕士',
    bio: `8年新西兰高中数学教学经验，帮助数百名学生提升成绩。

张老师毕业于奥克兰大学数学系，获硕士学位。在新西兰多所高中任教，熟悉NCEA课程体系和考试要求。

**教学理念：** 因材施教，让每个学生都能爱上数学。`,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zhang',
    verified: true,
    teachingYears: 8,
    qualifications: ['奥克兰大学数学硕士', '新西兰教师资格证', 'NCEA 考官资质'],
  },
  contact: {
    phone: '021-***-4567',
    wechat: 'wx******1234',
    email: 'te***@example.com',
    wechatQrcode:
      'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=wechat-id-zhangteacher',
    showPhone: true,
    showWechat: true,
    showEmail: true,
  },
  tags: ['数学辅导', 'NCEA', '高中', '小班教学'],
  userInteraction: {
    isFavorited: false,
    isCompared: false,
  },
  images: [
    'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800',
    'https://images.unsplash.com/photo-1611974765270-ca12586343bb?w=800',
    'https://images.unsplash.com/photo-1562774053-701939374585?w=800',
  ],
};

// ============================================
// Review Data for Storybook Stories
// ============================================

export const STORYBOOK_REVIEW_STATS: ReviewStatistics = {
  teacherId: 'teacher-001',
  totalReviews: 11,
  averageRating: 4.6,
  ratingDistribution: {
    5: 6,
    4: 4,
    3: 1,
    2: 0,
    1: 0,
  },
  teachingAvg: 4.6,
  courseAvg: 4.5,
  communicationAvg: 4.6,
  punctualityAvg: 4.8,
};

export const STORYBOOK_REVIEWS: Review[] = [
  {
    id: 'review-001',
    userId: 'user-001',
    userName: '李女士',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Li',
    teacherId: 'teacher-001',
    overallRating: 5,
    teachingRating: 5,
    courseRating: 5,
    communicationRating: 5,
    punctualityRating: 5,
    title: '非常推荐张老师！',
    content:
      '老师讲解清晰，孩子成绩有明显提升。教学方法生动有趣，孩子很喜欢上张老师的课。每次课后都有明确的进步。',
    tags: ['teachingSerious', 'patient', 'greatProgress'],
    status: 'approved',
    isPublic: true,
    isEdited: false,
    helpfulCount: 15,
    reportCount: 0,
    createdAt: '2026-01-10T10:00:00Z',
    reply: {
      id: 'reply-001',
      reviewId: 'review-001',
      teacherId: 'teacher-001',
      teacherName: '张老师',
      teacherAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zhang',
      content: '感谢李女士的认可！孩子的进步是对我最大的鼓励。',
      isPublic: true,
      createdAt: '2026-01-10T14:00:00Z',
    },
  },
  {
    id: 'review-002',
    userId: 'user-002',
    userName: '王先生',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wang',
    teacherId: 'teacher-001',
    overallRating: 5,
    teachingRating: 5,
    courseRating: 4,
    communicationRating: 5,
    punctualityRating: 5,
    title: '孩子进步很大',
    content:
      '经过一个学期的学习，孩子的数学成绩从B提升到了A。张老师非常负责任，每次课后都会及时反馈学习情况。',
    tags: ['teachingSerious', 'punctual'],
    status: 'approved',
    isPublic: true,
    isEdited: false,
    helpfulCount: 8,
    reportCount: 0,
    createdAt: '2026-01-05T16:30:00Z',
  },
  {
    id: 'review-003',
    userId: 'user-003',
    userName: '陈妈妈',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chen',
    teacherId: 'teacher-001',
    overallRating: 4,
    teachingRating: 4,
    courseRating: 5,
    communicationRating: 4,
    punctualityRating: 5,
    title: '课程质量不错',
    content:
      '课程内容丰富，老师讲解详细。只是有时候进度稍微快了一点，孩子需要更多时间消化。整体来说很满意。',
    tags: ['goodCourse', 'easyToUnderstand'],
    status: 'approved',
    isPublic: true,
    isEdited: false,
    helpfulCount: 5,
    reportCount: 0,
    createdAt: '2025-12-28T11:20:00Z',
  },
];
