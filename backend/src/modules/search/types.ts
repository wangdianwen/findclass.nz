/**
 * Search Module - Types
 * Type definitions for search endpoints
 */

// Popular search response
export type PopularSearchResponse = string[];

// Search suggestion item
export interface SearchSuggestion {
  id: string;
  title: string;
  type: 'course';
  teacherName: string;
  subject: string;
}

// Search suggestions response
export type SearchSuggestionsResponse = SearchSuggestion[];

// Query params for suggestions
export interface GetSuggestionsQuery {
  q?: string;
}
