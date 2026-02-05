// Mock data for course detail page
// Based on product design spec

import type { CourseDetail, SimilarCourse } from '../types/courseDetail';

export const MOCK_COURSE_DETAIL: CourseDetail = {
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
<p>Auckland CBD, 123 Queen Street</p>

<blockquote>
  <p>"数学不是一门需要死记硬背的学科，而是一种思维方式的训练。"</p>
</blockquote>

<p>报名请扫描下方二维码或添加微信联系。</p>`,
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
    // Privacy settings - showWechat: true shows QR code
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
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
    'https://images.unsplash.com/photo-1562774053-701939374585?w=800',
  ],
};

export const MOCK_SIMILAR_COURSES: SimilarCourse[] = [
  {
    id: '2',
    title: 'GCSE数学冲刺',
    price: 45,
    lessonCount: 10,
    rating: 4.8,
    reviewCount: 86,
    trustLevel: 'A',
    subject: '数学',
    region: 'Epsom',
    teachingMode: 'offline',
  },
  {
    id: '7',
    title: '物理化学补习',
    price: 48,
    lessonCount: 8,
    rating: 4.6,
    reviewCount: 56,
    trustLevel: 'A',
    subject: '理科',
    region: 'Christchurch',
    teachingMode: 'offline',
  },
  {
    id: '4',
    title: 'Python编程入门',
    price: 40,
    lessonCount: 15,
    rating: 4.7,
    reviewCount: 67,
    trustLevel: 'A',
    subject: '编程',
    region: 'Online',
    teachingMode: 'online',
  },
];

// ============================================
// Mock Data Variants for Storybook
// ============================================

// Variant: Show WeChat QR Code (teacher enabled QR display)
export const MOCK_COURSE_WITH_WECHAT_QR: CourseDetail = {
  ...MOCK_COURSE_DETAIL,
  id: '1',
  contact: {
    ...MOCK_COURSE_DETAIL.contact,
    showWechat: true,
    wechatQrcode:
      'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=wechat-id-zhangteacher',
  },
};

// Variant: Show masked WeChat ID (teacher disabled QR, enabled display)
export const MOCK_COURSE_WECHAT_ID_ONLY: CourseDetail = {
  ...MOCK_COURSE_DETAIL,
  id: '2',
  contact: {
    ...MOCK_COURSE_DETAIL.contact,
    showWechat: true,
    wechatQrcode: undefined, // No QR code, only show masked ID
  },
};

// Variant: Hide WeChat (teacher disabled WeChat display)
export const MOCK_COURSE_WITHOUT_WECHAT: CourseDetail = {
  ...MOCK_COURSE_DETAIL,
  id: '3',
  contact: {
    ...MOCK_COURSE_DETAIL.contact,
    showWechat: false,
    wechat: 'wx******1234', // Still stored but not shown
  },
};
