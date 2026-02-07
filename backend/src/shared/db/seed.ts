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
    id: '00000000-0000-0000-0000-000000000001',
    email: 'demo@findclass.nz',
    name: 'Demo User',
    role: 'STUDENT',
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'teacher@findclass.nz',
    name: 'Jane Smith',
    role: 'TEACHER',
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Pre-hashed password for all test users (Password123)
const TEST_PASSWORD_HASH =
  '$2b$10$I9zkmfYl3Ei.KQXrr3kibuqEULvMQRGSZcoo3obSnBa85i6Hb/v22';

const SAMPLE_TEACHERS = [
  {
    id: '00000000-0000-0000-0000-000000000002', // Same as user_id for Jane Smith
    display_name: 'Jane Smith',
    bio: 'Passionate about making math accessible to all students.',
    teaching_years: 6,
    qualifications: ['MSc Mathematics', 'Teaching Certificate'],
    verified: true,
    verification_status: 'APPROVED',
    teaching_modes: ['ONLINE'],
    locations: ['Auckland'],
    average_rating: 4.8,
    total_reviews: 156,
    total_students: 89,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000001', // Same as user_id for John Doe
    display_name: 'John Doe',
    bio: 'Native English speaker with TESOL certification.',
    teaching_years: 4,
    qualifications: ['BA English', 'TESOL Certified'],
    verified: true,
    verification_status: 'APPROVED',
    teaching_modes: ['BOTH'],
    locations: ['Wellington'],
    average_rating: 4.9,
    total_reviews: 89,
    total_students: 56,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const SAMPLE_COURSES = [
  {
    id: '20000000-0000-0000-0000-000000000001',
    teacher_id: '00000000-0000-0000-0000-000000000002',
    title: 'High School Mathematics',
    description: 'Comprehensive math tutoring covering algebra, geometry, and calculus.',
    category: 'Mathematics',
    subcategory: 'High School',
    price: 65,
    price_type: 'hourly',
    teaching_modes: ['ONLINE'],
    locations: ['Auckland'],
    target_age_groups: ['13-18'],
    max_class_size: 5,
    current_enrollment: 0,
    source_type: 'manual',
    quality_score: 85,
    trust_level: 'B',
    average_rating: 4.8,
    total_reviews: 45,
    status: 'ACTIVE',
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    teacher_id: '00000000-0000-0000-0000-000000000001',
    title: 'English Conversation Practice',
    description: 'Improve your spoken English with real-world conversations.',
    category: 'English',
    subcategory: 'Conversation',
    price: 45,
    price_type: 'hourly',
    teaching_modes: ['BOTH'],
    locations: ['Wellington'],
    target_age_groups: ['Adult'],
    max_class_size: 8,
    current_enrollment: 0,
    source_type: 'manual',
    quality_score: 90,
    trust_level: 'B',
    average_rating: 4.9,
    total_reviews: 32,
    status: 'ACTIVE',
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '20000000-0000-0000-0000-000000000003',
    teacher_id: '00000000-0000-0000-0000-000000000002',
    title: 'Calculus Preparation',
    description: 'Get ready for calculus with this intensive preparation course.',
    category: 'Mathematics',
    subcategory: 'University',
    price: 80,
    price_type: 'hourly',
    teaching_modes: ['OFFLINE'],
    locations: ['Auckland'],
    target_age_groups: ['18+'],
    max_class_size: 4,
    current_enrollment: 0,
    source_type: 'manual',
    quality_score: 82,
    trust_level: 'B',
    average_rating: 4.7,
    total_reviews: 28,
    status: 'ACTIVE',
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const SAMPLE_REVIEWS = [
  {
    id: '30000000-0000-0000-0000-000000000001',
    course_id: '20000000-0000-0000-0000-000000000001',
    user_id: '00000000-0000-0000-0000-000000000001',
    teacher_id: '00000000-0000-0000-0000-000000000002',
    overall_rating: 5,
    teaching_rating: 5,
    course_rating: 5,
    communication_rating: 5,
    punctuality_rating: 5,
    title: 'Excellent teaching!',
    content: 'My grades improved significantly.',
    status: 'APPROVED',
    helpful_count: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '30000000-0000-0000-0000-000000000002',
    course_id: '20000000-0000-0000-0000-000000000002',
    user_id: '00000000-0000-0000-0000-000000000001',
    teacher_id: '00000000-0000-0000-0000-000000000001',
    overall_rating: 5,
    teaching_rating: 5,
    course_rating: 5,
    communication_rating: 5,
    punctuality_rating: 5,
    title: 'Great conversation practice',
    content: 'Very helpful for improving fluency.',
    status: 'APPROVED',
    helpful_count: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

async function seedDatabase(client: Client): Promise<void> {
  logger.info('Starting database seeding...');

  // Seed users
  for (const user of SAMPLE_USERS) {
    await client.query(
      `INSERT INTO users (id, email, password_hash, name, role, avatar_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash,
         updated_at = EXCLUDED.updated_at`,
      [
        user.id,
        user.email,
        TEST_PASSWORD_HASH,
        user.name,
        user.role,
        user.avatar_url,
        user.created_at,
        user.updated_at,
      ]
    );
    logger.debug(`Seeded user: ${user.email}`);
  }

  // Seed teachers
  for (const teacher of SAMPLE_TEACHERS) {
    await client.query(
      `INSERT INTO teachers (id, display_name, bio, teaching_years, qualifications,
                            verified, verification_status, teaching_modes, locations,
                            average_rating, total_reviews, total_students, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         average_rating = EXCLUDED.average_rating,
         updated_at = EXCLUDED.updated_at`,
      [
        teacher.id,
        teacher.display_name,
        teacher.bio,
        teacher.teaching_years,
        teacher.qualifications,
        teacher.verified,
        teacher.verification_status,
        teacher.teaching_modes,
        teacher.locations,
        teacher.average_rating,
        teacher.total_reviews,
        teacher.total_students,
        teacher.created_at,
        teacher.updated_at,
      ]
    );
    logger.debug(`Seeded teacher: ${teacher.display_name}`);
  }

  // Seed courses
  for (const course of SAMPLE_COURSES) {
    await client.query(
      `INSERT INTO courses (id, teacher_id, title, description, category, subcategory, price,
                           price_type, teaching_modes, locations, target_age_groups,
                           max_class_size, current_enrollment, source_type, quality_score,
                           trust_level, average_rating, total_reviews, status, published_at,
                           created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         average_rating = EXCLUDED.average_rating,
         updated_at = EXCLUDED.updated_at`,
      [
        course.id,
        course.teacher_id,
        course.title,
        course.description,
        course.category,
        course.subcategory,
        course.price,
        course.price_type,
        course.teaching_modes,
        course.locations,
        course.target_age_groups,
        course.max_class_size,
        course.current_enrollment,
        course.source_type,
        course.quality_score,
        course.trust_level,
        course.average_rating,
        course.total_reviews,
        course.status,
        course.published_at,
        course.created_at,
        course.updated_at,
      ]
    );
    logger.debug(`Seeded course: ${course.title}`);
  }

  // Seed reviews
  for (const review of SAMPLE_REVIEWS) {
    await client.query(
      `INSERT INTO reviews (id, course_id, user_id, teacher_id, overall_rating, teaching_rating,
                           course_rating, communication_rating, punctuality_rating, title, content,
                           status, helpful_count, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE SET
         content = EXCLUDED.content,
         updated_at = EXCLUDED.updated_at`,
      [
        review.id,
        review.course_id,
        review.user_id,
        review.teacher_id,
        review.overall_rating,
        review.teaching_rating,
        review.course_rating,
        review.communication_rating,
        review.punctuality_rating,
        review.title,
        review.content,
        review.status,
        review.helpful_count,
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
