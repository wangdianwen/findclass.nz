// Shared course data constants
// Extracted to module level for performance optimization (rerender-defer-reads)

export const MAIN_CITIES = [
  { value: 'auckland', label: 'Auckland' },
  { value: 'wellington', label: 'Wellington' },
  { value: 'christchurch', label: 'Christchurch' },
  { value: 'online', label: 'Online' },
] as const;

export const REGION_DATA: Record<string, readonly string[]> = {
  auckland: Object.freeze([
    'Albany',
    'Newmarket',
    'Epsom',
    'Parnell',
    'Remuera',
    'Takapuna',
    'Howick',
    'Mt Eden',
    'Grey Lynn',
    'Ponsonby',
    'Devonport',
    'Birkenhead',
    'East Coast Bays',
    'Auckland CBD',
  ]),
  wellington: Object.freeze([
    'Wellington CBD',
    'Karori',
    'Johnsonville',
    'Lower Hutt',
    'Upper Hutt',
    'Porirua',
    'Kelson',
    'Island Bay',
    'Newlands',
    'Miramar',
  ]),
  christchurch: Object.freeze([
    'Christchurch CBD',
    'Riccarton',
    'Addington',
    'Papanui',
    'Hornby',
    'Sockburn',
    'Sydenham',
    'Merivale',
    'Fendalton',
    'Burnside',
  ]),
} as const;

// Teaching mode mapping - icon names for use with @ant-design/icons
export const TEACHING_MODE_LABELS: Record<string, { iconName: string; labelKey: string }> = {
  offline: { iconName: 'BankOutlined', labelKey: 'course.offline' },
  online: { iconName: 'DesktopOutlined', labelKey: 'course.online' },
} as const;

// Subject mapping
export const SUBJECT_LABELS: Record<string, string> = {
  数学: 'subject.math',
  理科: 'subject.science',
  音乐: 'subject.music',
  编程: 'subject.programming',
  英语: 'subject.english',
  体育: 'subject.pe',
  美术: 'subject.art',
} as const;

// Grade mapping
export const GRADE_LABELS: Record<string, string> = {
  高中: 'grade.highSchool',
  初中: 'grade.middleSchool',
  成人: 'grade.adult',
  全年龄: 'grade.allAges',
  '初中/高中': 'grade.highSchool',
  小学: 'grade.primary',
} as const;

// Course data type
export interface CourseData {
  id: string;
  title: string;
  price: number;
  lessonCount: number; // 总课时数
  lessonDuration: number; // 每节课时长（分钟）
  rating: number;
  reviewCount: number;
  city: string;
  region: string;
  subject: string;
  grade: string;
  teacherName: string;
  trustLevel: 'S' | 'A' | 'B' | 'C' | 'D';
  teachingMode: 'offline' | 'online';
  language: string;
  schedule: string;
}

// Mock courses data
export const MOCK_COURSES: readonly CourseData[] = Object.freeze([
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
  {
    id: '7',
    title: '物理化学补习',
    price: 48,
    lessonCount: 8,
    lessonDuration: 60,
    rating: 4.6,
    reviewCount: 56,
    city: 'christchurch',
    region: 'Riccarton',
    subject: '理科',
    grade: '高中',
    teacherName: '赵老师',
    trustLevel: 'A',
    teachingMode: 'offline',
    language: '中文授课',
    schedule: '平日晚上',
  },
  {
    id: '8',
    title: '绘画艺术启蒙',
    price: 35,
    lessonCount: 10,
    lessonDuration: 90,
    rating: 4.8,
    reviewCount: 28,
    city: 'wellington',
    region: 'Karori',
    subject: '美术',
    grade: '小学',
    teacherName: '孙老师',
    trustLevel: 'A',
    teachingMode: 'offline',
    language: '中文授课',
    schedule: '周末下午',
  },
]);
