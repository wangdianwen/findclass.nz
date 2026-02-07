/**
 * Search Module Index
 */

export * from './types';
export { searchRoutes } from './routes';

// Export controllers
export { getPopularSearchController, getSearchSuggestionsController } from './controller';

// Export service functions
export { getPopularSearches, getSearchSuggestions } from './service';
