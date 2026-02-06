/**
 * Database Seeding Script
 * Populates the database with sample data for staging/preview environments
 *
 * Usage: npm run seed (or SEED_SAMPLE_DATA=true npm run dev)
 */

import { Client } from 'pg';
import { logger } from '../../core/logger';
import { getConfig } from '../../config';

// Sample data for seeding
const SAMPLE_USERS = [
  {
    id: 'usr_demo_001',
    email: 'demo@findclass.nz',
    name: 'Demo User',
    role: 'user',
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'usr_teacher_001',
    email: 'teacher@findclass.nz',
    name: 'Jane Smith',
    role: 'teacher',
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const SAMPLE_TEACHERS = [
  {
    id: 'tch_001',
    user_id: 'usr_teacher_001',
    name: 'Jane Smith',
    title: 'Mathematics Expert',
    bio: 'Passionate about making math accessible to all students.',
    subjects: ['Mathematics', 'Calculus', 'Statistics'],
    teaching_since: 2018,
    rating: 4.8,
    review_count: 156,
    hourly_rate: 65,
    city: 'Auckland',
    available: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tch_002',
    user_id: 'usr_demo_001',
    name: 'John Doe',
    title: 'English Language Tutor',
    bio: 'Native English speaker with TESOL certification.',
    subjects: ['English', 'ESOL', 'Writing'],
    teaching_since: 2020,
    rating: 4.9,
    review_count: 89,
    hourly_rate: 55,
    city: 'Wellington',
    available: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const SAMPLE_COURSES = [
  {
    id: 'crs_001',
    teacher_id: 'tch_001',
    title: 'High School Mathematics',
    description: 'Comprehensive math tutoring covering algebra, geometry, and calculus.',
    subject: 'Mathematics',
    level: 'High School',
    price: 65,
    duration_minutes: 60,
    city: 'Auckland',
    format: 'Online',
    max_students: 5,
    rating: 4.8,
    review_count: 45,
    featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'crs_002',
    teacher_id: 'tch_002',
    title: 'English Conversation Practice',
    description: 'Improve your spoken English with real-world conversations.',
    subject: 'English',
    level: 'All Levels',
    price: 45,
    duration_minutes: 45,
    city: 'Wellington',
    format: 'Hybrid',
    max_students: 8,
    rating: 4.9,
    review_count: 32,
    featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'crs_003',
    teacher_id: 'tch_001',
    title: 'Calculus Preparation',
    description: 'Get ready for calculus with this intensive preparation course.',
    subject: 'Mathematics',
    level: 'University',
    price: 80,
    duration_minutes: 90,
    city: 'Auckland',
    format: 'In-Person',
    max_students: 4,
    rating: 4.7,
    review_count: 28,
    featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const SAMPLE_REVIEWS = [
  {
    id: 'rev_001',
    course_id: 'crs_001',
    user_id: 'usr_demo_001',
    rating: 5,
    comment: 'Excellent teaching! My grades improved significantly.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rev_002',
    course_id: 'crs_002',
    user_id: 'usr_demo_001',
    rating: 5,
    comment: 'Great conversation practice. Very helpful for improving fluency.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

async function seedDatabase(client: Client): Promise<void> {
  logger.info('Starting database seeding...');

  // Seed users
  for (const user of SAMPLE_USERS) {
    await client.query(
      `INSERT INTO users (id, email, name, role, avatar_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         updated_at = EXCLUDED.updated_at`,
      [user.id, user.email, user.name, user.role, user.avatar_url, user.created_at, user.updated_at]
    );
    logger.debug(`Seeded user: ${user.email}`);
  }

  // Seed teachers
  for (const teacher of SAMPLE_TEACHERS) {
    await client.query(
      `INSERT INTO teachers (id, user_id, name, title, bio, subjects, teaching_since,
                            rating, review_count, hourly_rate, city, available, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         rating = EXCLUDED.rating,
         updated_at = EXCLUDED.updated_at`,
      [
        teacher.id,
        teacher.user_id,
        teacher.name,
        teacher.title,
        teacher.bio,
        JSON.stringify(teacher.subjects),
        teacher.teaching_since,
        teacher.rating,
        teacher.review_count,
        teacher.hourly_rate,
        teacher.city,
        teacher.available,
        teacher.created_at,
        teacher.updated_at,
      ]
    );
    logger.debug(`Seeded teacher: ${teacher.name}`);
  }

  // Seed courses
  for (const course of SAMPLE_COURSES) {
    await client.query(
      `INSERT INTO courses (id, teacher_id, title, description, subject, level, price,
                           duration_minutes, city, format, max_students, rating, review_count,
                           featured, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         rating = EXCLUDED.rating,
         updated_at = EXCLUDED.updated_at`,
      [
        course.id,
        course.teacher_id,
        course.title,
        course.description,
        course.subject,
        course.level,
        course.price,
        course.duration_minutes,
        course.city,
        course.format,
        course.max_students,
        course.rating,
        course.review_count,
        course.featured,
        course.created_at,
        course.updated_at,
      ]
    );
    logger.debug(`Seeded course: ${course.title}`);
  }

  // Seed reviews
  for (const review of SAMPLE_REVIEWS) {
    await client.query(
      `INSERT INTO reviews (id, course_id, user_id, rating, comment, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         comment = EXCLUDED.comment,
         updated_at = EXCLUDED.updated_at`,
      [
        review.id,
        review.course_id,
        review.user_id,
        review.rating,
        review.comment,
        review.created_at,
        review.updated_at,
      ]
    );
    logger.debug(`Seeded review: ${review.id}`);
  }

  logger.info('Database seeding completed successfully!');
}

export async function runSeed(): Promise<void> {
  const config = getConfig();

  if (!config.seedSampleData) {
    logger.debug('SEED_SAMPLE_DATA is false, skipping seed');
    return;
  }

  const client = new Client({
    connectionString: config.database.url,
  });

  try {
    await client.connect();
    logger.info('Connected to database for seeding');

    await seedDatabase(client);

    await client.end();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Database seeding failed', { error: (error as Error).message });
    await client.end();
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
