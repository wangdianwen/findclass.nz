/**
 * Google Analytics 4 (GA4) Type Definitions
 *
 * Reference: https://developers.google.com/analytics/devguides/collection/ga4/reference/events
 */

/**
 * GA4 Event Name
 * Standard event names from GA4 documentation
 */
export type Ga4EventName =
  // Engagement events
  | 'ad_impression'
  | 'ad_click'
  | 'ad_query'
  | 'adunit_exposure'
  | 'app_clear_data'
  | 'app_install'
  | 'app_update'
  | 'app_exception'
  | 'cli_error_with_timestamp'
  | 'first_open'
  | 'first_visit'
  | 'in_app_purchase'
  | 'notification_open'
  | 'notification_dismiss'
  | 'notification_receive'
  | 'os_update'
  | 'session_start'
  | 'user_engagement'
  // Ecommerce events
  | 'add_payment_info'
  | 'add_shipping_info'
  | 'add_to_cart'
  | 'add_to_wishlist'
  | 'begin_checkout'
  | 'generate_lead'
  | 'purchase'
  | 'refund'
  | 'remove_from_cart'
  | 'select_item'
  | 'select_promotion'
  | 'view_cart'
  | 'view_item'
  | 'view_item_list'
  | 'view_promotion'
  // Custom events for FindClass.nz
  | 'search'
  | 'login'
  | 'sign_up'
  | 'contact'
  | 'share'
  | 'teacher_application'
  | 'filter_change'
  | 'page_view';

/**
 * Event Parameters
 * Common parameters used across multiple events
 */
export interface Ga4EventParams {
  // Currency
  currency?: string;

  // Value
  value?: number;

  // Items (for ecommerce events)
  items?: Ga4Item[];

  // Item parameters
  item_id?: string;
  item_name?: string;
  item_category?: string;
  item_list_name?: string;
  item_list_id?: string;
  index?: number;
  location_id?: string;
  price?: number;
  quantity?: number;
  affiliation?: string;
  coupon?: string;
  discount?: number;
  creative_name?: string;
  creative_slot?: string;
  promotion_id?: string;
  promotion_name?: string;

  // Search parameters
  search_term?: string;
  search_filters?: string;
  result_count?: number;
  filter_type?: string;
  filter_value?: string;

  // Auth parameters
  method?: string;

  // Engagement parameters
  engagement_time_msec?: number;
  session_id?: number;

  // Custom parameters for FindClass.nz
  city?: string;
  subject?: string;
  grade?: string;
  trust_level?: string;
  teacher_id?: string;
  teacher_name?: string;
  contact_method?: string;
  share_method?: string;
  content_type?: string;
  error_message?: string;
  error_code?: string;
  description?: string;
  fatal?: boolean;
  context?: string;

  // Page view parameters
  page_location?: string;
  page_title?: string;
  page_referrer?: string;
}

/**
 * GA4 Item (for ecommerce events)
 */
export interface Ga4Item {
  item_id: string;
  item_name?: string;
  affiliation?: string;
  coupon?: string;
  currency?: string;
  creative_name?: string;
  creative_slot?: string;
  discount?: number;
  index?: number;
  item_brand?: string;
  item_category?: string;
  item_category2?: string;
  item_category3?: string;
  item_category4?: string;
  item_category5?: string;
  item_list_id?: string;
  item_list_name?: string;
  item_variant?: string;
  location_id?: string;
  price?: number;
  promotion_id?: string;
  promotion_name?: string;
  quantity?: number;
}

/**
 * GA4 Configuration
 */
export interface Ga4Config {
  measurementId: string;
  enabledDev: boolean;
  anonymizeIp: boolean;
  sendPageView: boolean;
  debugMode: boolean;
}

/**
 * Queued Event (before consent)
 */
export interface QueuedEvent {
  eventName: Ga4EventName;
  eventParams?: Ga4EventParams;
  timestamp: number;
}

/**
 * Analytics Context
 */
export interface AnalyticsContext {
  userId?: string;
  sessionId?: string;
  pageReferrer?: string;
  pageLocation?: string;
  pageTitle?: string;
}
