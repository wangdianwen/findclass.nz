# Google Analytics 4 (GA4) Documentation

## Overview

FindClass.nz uses Google Analytics 4 (GA4) to track user behavior and improve the product experience. This implementation is **GDPR-compliant** and only tracks users who have explicitly consented to analytics cookies.

### Key Features

- ✅ **GDPR Compliant**: No tracking without explicit user consent
- ✅ **Type-Safe**: All GA4 events have full TypeScript type definitions
- ✅ **Event Queue**: Events before consent are queued and sent after consent
- ✅ **User ID Tracking**: Logged-in users are tracked with `user_id`
- ✅ **IP Anonymization**: All IP addresses are automatically anonymized
- ✅ **Automatic Page Views**: Page views tracked on route changes
- ✅ **Zero Performance Impact**: gtag.js loads asynchronously after consent

---

## Setup & Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Google Analytics 4 (GA4)
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX  # Your GA4 Measurement ID
VITE_GA4_ENABLED_DEV=true              # Enable GA4 in development (true/false)
```

### Getting Your GA4 Measurement ID

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new GA4 property
3. Get your Measurement ID (format: `G-XXXXXXXXXX`)
4. Add it to your environment variables

### Separate Properties for Environments

**Recommended**: Create separate GA4 properties for:

- **Staging**: For testing and development
- **Production**: For live user data

Example configuration:

```bash
# .env.staging
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_GA4_ENABLED_DEV=true

# .env.production
VITE_GA4_MEASUREMENT_ID=G-YYYYYYYYYY
VITE_GA4_ENABLED_DEV=false
```

---

## Event Tracking Reference

### Search Events

#### `trackSearch`

Track search submissions with filters and result count.

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function MyComponent() {
  const { trackSearch } = useAnalytics();

  const handleSearch = (term: string, filters: Filters, count: number) => {
    trackSearch(term, {
      city: filters.city,
      subject: filters.subject,
      grade: filters.grade,
      trustLevel: filters.trustLevel,
    }, count);
  };

  return <SearchForm onSearch={handleSearch} />;
}
```

**Parameters:**
- `searchTerm: string` - The search keyword
- `filters: object` - Search filters (city, subject, grade, trustLevel)
- `resultCount: number` - Number of results

**GA4 Event Name:** `search`

---

#### `trackFilterChange`

Track individual filter changes.

```typescript
const { trackFilterChange } = useAnalytics();

trackFilterChange('city', 'Auckland');
trackFilterChange('subject', 'Math');
```

**Parameters:**
- `filterType: string` - Type of filter (city, subject, grade, trust_level)
- `filterValue: string` - Selected value

**GA4 Event Name:** `filter_change`

---

### Course Events

#### `trackCourseClick`

Track course card clicks from lists.

```typescript
const { trackCourseClick } = useAnalytics();

trackCourseClick(
  {
    id: '123',
    name: 'Math Tutoring',
    category: 'Math',
    city: 'Auckland',
    teacherName: 'John Doe',
    price: 50,
  },
  'search_results', // List name
  1                // Position (1-indexed)
);
```

**Parameters:**
- `course: object` - Course info (id, name, category, city, teacherName, price)
- `listName: string` - List where course was displayed
- `position: number` - Position in list (1-indexed)

**GA4 Event Name:** `select_item`

---

#### `trackCourseView`

Track course detail page views.

```typescript
const { trackCourseView } = useAnalytics();

trackCourseView({
  id: '123',
  name: 'Math Tutoring',
  category: 'Math',
  city: 'Auckland',
  teacherName: 'John Doe',
  teacherId: '456',
  price: 50,
});
```

**Parameters:**
- `course: object` - Course info (id, name, category, city, teacherName, teacherId, price)

**GA4 Event Name:** `view_item`

---

#### `trackAddToWishlist` / `trackRemoveFromWishlist`

Track favorite (wishlist) actions.

```typescript
const { trackAddToWishlist, trackRemoveFromWishlist } = useAnalytics();

// Add to favorites
trackAddToWishlist({
  id: '123',
  name: 'Math Tutoring',
  category: 'Math',
  price: 50,
});

// Remove from favorites
trackRemoveFromWishlist({
  id: '123',
  name: 'Math Tutoring',
  category: 'Math',
});
```

**GA4 Event Names:** `add_to_wishlist`, `remove_from_cart`

---

### Contact Events

#### `trackContact`

Track contact button clicks.

```typescript
const { trackContact } = useAnalytics();

trackContact('form', '123', '456'); // form, courseId, teacherId
trackContact('phone', '123', '456');
trackContact('email', '123', '456');
trackContact('wechat', '123', '456');
```

**Parameters:**
- `method: 'phone' | 'email' | 'wechat' | 'form'` - Contact method
- `courseId?: string` - Course ID
- `teacherId?: string` - Teacher ID

**GA4 Event Name:** `contact`

---

#### `trackGenerateLead`

Track lead generation (contact form submitted).

```typescript
const { trackGenerateLead } = useAnalytics();

trackGenerateLead('123', '456', 50); // courseId, teacherId, value
```

**Parameters:**
- `courseId: string` - Course ID
- `teacherId?: string` - Teacher ID
- `value?: number` - Lead value

**GA4 Event Name:** `generate_lead`

---

### Share Events

#### `trackShare`

Track share actions.

```typescript
const { trackShare } = useAnalytics();

trackShare('native', 'course', '123');        // Native share API
trackShare('clipboard', 'course', '123');    // Copy link
trackShare('link', 'course', '123');         // Share link
trackShare('wechat', 'course', '123');       // WeChat
trackShare('facebook', 'course', '123');     // Facebook
```

**Parameters:**
- `method: string` - Share method
- `contentType: 'course' | 'teacher' | 'profile'` - Content type
- `contentId?: string` - Content ID

**GA4 Event Name:** `share`

---

### Authentication Events

#### `trackLogin` / `trackSignUp`

Track user authentication.

```typescript
const { trackLogin, trackSignUp } = useAnalytics();

trackLogin('email');    // Email login
trackLogin('google');   // Google OAuth
trackLogin('wechat');   // WeChat OAuth

trackSignUp('email');   // Email registration
trackSignUp('google');  // Google registration
trackSignUp('wechat');  // WeChat registration
```

**GA4 Event Names:** `login`, `sign_up`

---

### Teacher Events

#### `trackTeacherApplication`

Track teacher application submissions.

```typescript
const { trackTeacherApplication } = useAnalytics();

trackTeacherApplication();
```

**GA4 Event Name:** `generate_lead`

---

#### `trackTeacherView`

Track teacher profile views.

```typescript
const { trackTeacherView } = useAnalytics();

trackTeacherView('456', 'John Doe');
```

**Parameters:**
- `teacherId: string` - Teacher ID
- `teacherName: string` - Teacher name

**GA4 Event Name:** `view_item`

---

### Error Events

#### `trackError`

Track errors (for error boundaries).

```typescript
const { trackError } = useAnalytics();

trackError(
  'Failed to load course data',
  'COURSE_LOAD_ERROR',
  'CourseDetailPage'
);
```

**Parameters:**
- `errorMessage: string` - Error message
- `errorCode?: string` - Error code
- `context?: string` - Error context

**GA4 Event Name:** `app_exception`

---

## Usage Examples

### In a React Component

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function CourseSearchPage() {
  const { trackSearch, trackFilterChange, trackCourseClick } = useAnalytics();

  const handleSearch = (term: string, filters: Filters) => {
    trackSearch(term, filters, results.length);
  };

  const handleCourseClick = (course: Course, position: number) => {
    trackCourseClick(course, 'search_results', position);
  };

  return (
    <div>
      <SearchForm onSearch={handleSearch} />
      <CourseList courses={courses} onCourseClick={handleCourseClick} />
    </div>
  );
}
```

### Tracking Page Views (Automatic)

Page views are tracked automatically by the `AnalyticsProvider` in `main.tsx`. No manual tracking needed.

```typescript
// In main.tsx
<AnalyticsProvider userId={user?.id}>
  <App />
</AnalyticsProvider>
```

---

## Testing

### Unit Tests

Run unit tests for analytics module:

```bash
cd frontend
npm run test:unit analytics
```

**Coverage Target:** 90%+

### E2E Tests

Run E2E tests for analytics:

```bash
cd frontend
npx playwright test analytics.spec.ts
```

### Manual Testing

1. **Check Cookie Consent:**
   - Open the app
   - Verify no events are sent before accepting cookies
   - Accept analytics cookies
   - Verify events are sent after consent

2. **Check Realtime Dashboard:**
   - Open GA4 Realtime dashboard
   - Navigate through the app
   - Verify events appear in Realtime

3. **Check DebugView:**
   - Enable DebugView in GA4
   - Use GA4 DebugView extension
   - Verify events appear with correct parameters

---

## Debugging

### Enable Debug Mode

Set environment variable:

```bash
VITE_GA4_ENABLED_DEV=true
```

This enables:
- Console logging for all GA4 events
- Debug mode in GA4 (events appear in DebugView)

### Check dataLayer

Open browser console and run:

```javascript
// View all tracked events
window.dataLayer

// View latest event
window.dataLayer[window.dataLayer.length - 1]
```

### GA4 DebugView

1. Install [GA4 DebugView](https://chrome.google.com/webstore/detail/ga4-debug-view/) extension
2. Enable DebugView in your GA4 property
3. Navigate through your app
4. View events in real-time in DebugView

---

## GDPR Compliance

### Consent Gating

All analytics events are gated by cookie consent:

1. User visits the site
2. Cookie consent banner appears
3. User chooses to accept/decline analytics cookies
4. If accepted:
   - gtag.js is loaded
   - Queued events are sent
   - Future events are sent immediately
5. If declined:
   - No gtag.js loaded
   - No events sent
   - Events remain queued (in case user changes mind)

### IP Anonymization

All IP addresses are automatically anonymized before sending to Google:

```typescript
// In core.ts
window.gtag('config', measurementId, {
  anonymize_ip: true,
});
```

### Data Retention

Configure data retention in GA4:
- Go to Admin > Data Settings > Data Retention
- Set retention period (e.g., 2 months)
- User and event data older than retention period is automatically deleted

---

## Performance Impact

### Bundle Size

- **gtag.js**: Loads asynchronously from CDN after consent
- **Analytics module**: ~5KB (minified)
- **Zero impact** on initial bundle size

### Network Requests

- gtag.js only loads after consent (saves bandwidth for users who decline)
- Events batched and sent efficiently
- No impact on page load performance

---

## Troubleshooting

### Events Not Appearing in GA4

1. **Check Measurement ID:**
   ```bash
   echo $VITE_GA4_MEASUREMENT_ID
   ```
   Should be in format `G-XXXXXXXXXX`

2. **Check Consent:**
   - Accept analytics cookies
   - Check `localStorage.getItem('analytics_enabled')` is `"true"`

3. **Check Console:**
   - Open DevTools Console
   - Look for `[GA4]` log messages
   - Check for errors

4. **Check DebugView:**
   - Enable DebugView in GA4
   - Install GA4 DebugView extension
   - Verify events appear

### Events Not Queued Before Consent

1. Check `isAnalyticsEnabled()` returns `false` before consent
2. Check `initAnalytics()` is called when consent is granted
3. Check queued events are flushed after consent

### User ID Not Set

1. Check user is logged in: `useUserStore.getState().user`
2. Check `AnalyticsProvider` receives `userId` prop
3. Check console for `set user_id` log message

---

## References

- [GA4 Event Reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
- [GA4 Setup Guide](https://developers.google.com/analytics/devguides/collection/ga4)
- [GDPR Compliance](https://developers.google.com/analytics/devguides/collection/ga4/user-privacy)
- [React Query DevTools](https://tanstack.com/query/latest/docs/react/devtools)

---

## Support

For issues or questions:

1. Check this documentation
2. Check console for error messages
3. Check GA4 DebugView
4. Contact: tech@findclass.nz
