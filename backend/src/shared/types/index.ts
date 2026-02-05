/**
 * Entity Types
 * TypeScript type definitions for all entities
 */

// User Types
export enum UserRole {
  PARENT = 'PARENT',
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  INSTITUTION = 'INSTITUTION',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING_PARENTAL_CONSENT = 'PENDING_PARENTAL_CONSENT',
  DISABLED = 'DISABLED',
}

export interface User {
  PK: string;
  SK: string;
  entityType: 'USER';
  dataCategory: 'USER';
  id: string;
  email: string;
  name: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  language: 'zh' | 'en';
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  GSI1PK?: string;
  GSI1SK?: string;
}

export interface Child {
  PK: string;
  SK: string;
  entityType: 'CHILD';
  dataCategory: 'USER';
  id: string;
  userId: string;
  name: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE';
  school?: string;
  grade?: string;
  subjects: string[];
  learningGoals: string[];
  parentalConsent: {
    hasConsent: boolean;
    consentDate?: string;
    consentMethod?: string;
  };
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

// Child Types
export interface Child {
  PK: string;
  SK: string;
  entityType: 'CHILD';
  id: string;
  userId: string;
  name: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE';
  school?: string;
  grade?: string;
  subjects: string[];
  learningGoals: string[];
  parentalConsent: {
    hasConsent: boolean;
    consentDate?: string;
    consentMethod?: string;
  };
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

// Teacher Types
export enum TrustLevel {
  S = 'S',
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface Teacher {
  PK: string;
  SK: string;
  entityType: 'TEACHER';
  dataCategory: 'TEACHER';
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  teachingSubjects: string[];
  teachingModes: ('ONLINE' | 'OFFLINE' | 'BOTH')[];
  locations: string[];
  trustLevel: TrustLevel;
  verificationStatus: VerificationStatus;
  averageRating: number;
  totalReviews: number;
  totalStudents: number;
  createdAt: string;
  updatedAt: string;
  GSI2PK?: string;
  GSI2SK?: string;
}

export interface TeacherQualification {
  PK: string;
  SK: string;
  entityType: 'QUALIFICATION';
  dataCategory: 'TEACHER';
  id: string;
  teacherId: string;
  type: 'DEGREE' | 'CERTIFICATE' | 'EXPERIENCE';
  name: string;
  institution?: string;
  year?: number;
  fileUrl?: string;
  status: VerificationStatus;
  createdAt: string;
}

// Course Types
export enum CourseCategory {
  MATH = 'MATH',
  MUSIC = 'MUSIC',
  ART = 'ART',
  PROGRAMMING = 'PROGRAMMING',
  LANGUAGE = 'LANGUAGE',
  OTHER = 'OTHER',
}

export enum PriceType {
  PER_HOUR = 'PER_HOUR',
  PER_SESSION = 'PER_SESSION',
  PER_PACKAGE = 'PER_PACKAGE',
}

export enum CourseSourceType {
  REGISTERED = 'REGISTERED',
  GUMTREE = 'GUMTREE',
  FACEBOOK = 'FACEBOOK',
  OTHER = 'OTHER',
}

export enum CourseStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
}

export interface Course {
  PK: string;
  SK: string;
  entityType: 'COURSE';
  dataCategory: 'COURSE';
  id: string;
  teacherId: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  category: CourseCategory;
  subcategory?: string;
  price: number;
  priceType: PriceType;
  teachingModes: ('ONLINE' | 'OFFLINE' | 'BOTH')[];
  locations: string[];
  targetAgeGroups: string[];
  maxClassSize: number;
  currentEnrollment: number;
  sourceType: CourseSourceType;
  sourceUrl?: string;
  qualityScore: number;
  trustLevel: TrustLevel;
  averageRating?: number;
  totalReviews?: number;
  publishedAt?: string;
  expiresAt?: string;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
  GSI3PK?: string;
  GSI3SK?: string;
  GSI4PK?: string;
  GSI4SK?: string;
}

export interface CourseTimeSlot {
  id: string;
  courseId: string;
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

// Booking Types
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

export interface Booking {
  PK: string;
  SK: string;
  entityType: 'BOOKING';
  dataCategory: 'BOOKING';
  id: string;
  courseId: string;
  teacherId: string;
  userId: string;
  childId?: string;
  timeSlotId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  price: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  GSI5PK?: string;
  GSI5SK?: string;
  GSI6PK?: string;
  GSI6SK?: string;
}

export interface Review {
  PK: string;
  SK: string;
  entityType: 'REVIEW';
  dataCategory: 'COURSE';
  id: string;
  courseId: string;
  teacherId: string;
  userId: string;
  bookingId: string;
  rating: number;
  title?: string;
  content: string;
  teachingQuality: number;
  punctuality: number;
  communication: number;
  reply?: {
    content: string;
    createdAt: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  GSI7PK?: string;
  GSI7SK?: string;
}

// Review Types
export interface Review {
  PK: string;
  SK: string;
  entityType: 'REVIEW';
  id: string;
  courseId: string;
  teacherId: string;
  userId: string;
  bookingId: string;
  rating: number;
  title?: string;
  content: string;
  teachingQuality: number;
  punctuality: number;
  communication: number;
  reply?: {
    content: string;
    createdAt: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  GSI7PK?: string;
  GSI7SK?: string;
}

// Aggregated Data Types
export enum DataSource {
  GUMTREE = 'GUMTREE',
  FACEBOOK = 'FACEBOOK',
  OTHER = 'OTHER',
}

export enum AggregatedDataStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  DELETED = 'DELETED',
}

export interface AggregatedData {
  PK: string;
  SK: string;
  entityType: 'AGGREGATED_DATA';
  source: DataSource;
  externalId: string;
  originalUrl: string;
  title: string;
  description: string;
  contactInfo: {
    phone?: string;
    email?: string;
    wechat?: string;
  };
  price?: number;
  location?: string;
  language: string;
  publishedAt?: string;
  lastFetchedAt: string;
  qualityScore: number;
  trustLevel: TrustLevel;
  status: AggregatedDataStatus;
  feedbackCount: {
    outdated: number;
    inaccurate: number;
    incomplete: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Trust Badge Types
export enum BadgeType {
  PLATFORM_CERTIFIED = 'PLATFORM_CERTIFIED',
  SOURCE_VERIFIED = 'SOURCE_VERIFIED',
  COMMUNITY_SOURCE = 'COMMUNITY_SOURCE',
  HIGH_QUALITY = 'HIGH_QUALITY',
  NEWLY_PUBLISHED = 'NEWLY_PUBLISHED',
}

export interface TrustBadge {
  PK: string;
  SK: string;
  entityType: 'TRUST_BADGE';
  badgeType: BadgeType;
  badgeLevel: TrustLevel;
  score: number;
  criteria: {
    verificationDate?: string;
    expiresAt?: string;
  };
  awardedAt: string;
  createdAt: string;
}

// Notification Types
export enum NotificationType {
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  REVIEW_RECEIVED = 'REVIEW_RECEIVED',
  COURSE_RECOMMENDATION = 'COURSE_RECOMMENDATION',
}

export interface Notification {
  PK: string;
  SK: string;
  entityType: 'NOTIFICATION';
  dataCategory: 'USER';
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, unknown>;
  channels: ('IN_APP' | 'EMAIL' | 'SMS')[];
  status: {
    inApp: { sent: boolean; read: boolean };
    email: { sent: boolean; delivered: boolean };
    sms: { sent: boolean };
  };
  createdAt: string;
  expiresAt?: string;
}

export interface Session {
  PK: string;
  SK: string;
  entityType: 'SESSION';
  dataCategory: 'USER';
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: string;
  lastActivityAt: string;
  status: 'ACTIVE' | 'REVOKED';
  createdAt: string;
}

// Session Types
export interface Session {
  PK: string;
  SK: string;
  entityType: 'SESSION';
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: string;
  lastActivityAt: string;
  status: 'ACTIVE' | 'REVOKED';
  createdAt: string;
}

// Feedback Types
export enum FeedbackType {
  OUTDATED = 'OUTDATED',
  INACCURATE = 'INACCURATE',
  INCOMPLETE = 'INCOMPLETE',
  OTHER = 'OTHER',
}

export interface Feedback {
  PK: string;
  SK: string;
  entityType: 'FEEDBACK';
  id: string;
  courseId?: string;
  userId: string;
  type: FeedbackType;
  content: string;
  status: 'SUBMITTED' | 'REVIEWED' | 'RESOLVED';
  createdAt: string;
}

// Learning Record Types
export enum LearningRecordType {
  COURSE_START = 'COURSE_START',
  COURSE_COMPLETE = 'COURSE_COMPLETE',
  LESSON_COMPLETE = 'LESSON_COMPLETE',
  QUIZ_COMPLETE = 'QUIZ_COMPLETE',
  VIDEO_WATCH = 'VIDEO_WATCH',
  ASSIGNMENT_SUBMIT = 'ASSIGNMENT_SUBMIT',
  NOTES_CREATE = 'NOTES_CREATE',
}

export enum ProgressStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export interface LearningRecord {
  PK: string;
  SK: string;
  entityType: 'LEARNING_RECORD';
  dataCategory: 'USER';
  id: string;
  userId: string;
  courseId: string;
  lessonId?: string;
  type: LearningRecordType;
  duration: number;
  progress: number;
  status: ProgressStatus;
  metadata?: {
    score?: number;
    maxScore?: number;
    completionRate?: number;
    videoPosition?: number;
    videoDuration?: number;
    notes?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LearningProgress {
  courseId: string;
  userId: string;
  totalDuration: number;
  completedLessons: number;
  totalLessons: number;
  progressPercentage: number;
  status: ProgressStatus;
  lastActivityAt: string;
  startedAt: string;
  completedAt?: string;
}

export interface LearningStatistics {
  userId: string;
  totalLearningTime: number;
  totalCourses: number;
  completedCourses: number;
  totalLessons: number;
  completedLessons: number;
  averageProgress: number;
  lastActivityAt: string;
  weeklyData: {
    date: string;
    duration: number;
    lessonsCompleted: number;
  }[];
}

export interface LearningReport {
  userId: string;
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  statistics: LearningStatistics;
  courseProgress: LearningProgress[];
  achievements: {
    id: string;
    name: string;
    description: string;
    earnedAt: string;
  }[];
}

export { createSuccessResponse } from './api';
