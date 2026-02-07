/**
 * Search Module - Service
 * Handles search logic including popular searches and suggestions
 */

import { getPool } from '@shared/db/postgres/client';
import type { PopularSearchResponse, SearchSuggestion, SearchSuggestionsResponse } from './types';
import { logger } from '@core/logger';

// Static popular search keywords
const POPULAR_SEARCH_KEYWORDS: PopularSearchResponse = [
  '高中数学',
  '雅思英语',
  '钢琴辅导',
  '编程入门',
  '物理补习',
];

const MAX_SUGGESTIONS = 5;

/**
 * Get popular search keywords
 * Returns a static list of popular search terms
 */
export function getPopularSearches(): PopularSearchResponse {
  logger.info('Returning popular search keywords');
  return POPULAR_SEARCH_KEYWORDS;
}

/**
 * Get search suggestions based on query
 * Performs fuzzy matching on course titles, subjects, and teacher names
 */
export async function getSearchSuggestions(query: string): Promise<SearchSuggestionsResponse> {
  logger.info('Getting search suggestions', { query });

  if (!query || query.trim().length === 0) {
    return [];
  }

  const pool = getPool();
  const normalizedQuery = query.toLowerCase().trim();

  try {
    // Search courses by title, description, or category using ILIKE for fuzzy matching
    const result = await pool.query<{
      id: string;
      title: string;
      category: string;
      teacher_name: string;
    }>(
      `SELECT c.id, c.title, c.category, t.display_name as teacher_name
       FROM courses c
       LEFT JOIN teachers t ON c.teacher_id = t.id
       WHERE c.status = 'ACTIVE'
         AND (
           c.title ILIKE $1 OR
           c.category ILIKE $1 OR
           c.description ILIKE $1 OR
           t.display_name ILIKE $1
         )
       ORDER BY c.average_rating DESC NULLS LAST, c.total_reviews DESC
       LIMIT $2`,
      [`%${normalizedQuery}%`, MAX_SUGGESTIONS]
    );

    const suggestions: SearchSuggestion[] = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      type: 'course' as const,
      teacherName: row.teacher_name || 'Unknown Teacher',
      subject: row.category,
    }));

    logger.info('Search suggestions retrieved', {
      query,
      count: suggestions.length,
    });

    return suggestions;
  } catch (error) {
    logger.error('Error fetching search suggestions', { query, error });
    return [];
  }
}
