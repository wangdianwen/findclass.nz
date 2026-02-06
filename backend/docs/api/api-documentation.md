# FindClass NZ API Documentation

## Base URL

- Development: `http://localhost:3000/api/v1`
- Production: `https://api.findclass.nz/api/v1`

## Authentication

All protected endpoints require a JWT access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Rate Limiting

- Auth endpoints: 10 requests/15 minutes per email
- General API: 100 requests/minute

## Security

- Passwords must be at least 12 characters with uppercase, lowercase, number, and special character
- Verification codes are cryptographically secure (6 digits)

## Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register | Register a new user |
| POST | /api/v1/auth/login | Login with email/password |
| POST | /api/v1/auth/send-code | Send verification code |
| POST | /api/v1/auth/verify-code | Verify email with code |
| POST | /api/v1/auth/refresh | Refresh access token |
| POST | /api/v1/auth/logout | Logout and invalidate tokens |
| GET | /api/v1/auth/me | Get current user |
| PUT | /api/v1/auth/me | Update current user profile |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/users/profile | Get user profile |
| PUT | /api/v1/users/profile | Update user profile |

### Courses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/courses/search | Search courses |
| GET | /api/v1/courses/:id | Get course details |

### Teachers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/teachers | List teachers |
| GET | /api/v1/teachers/:id | Get teacher profile |

## Health Checks

| Endpoint | Description |
|----------|-------------|
| GET /health | Basic health check |
| GET /health/ready | Readiness check |
| GET /health/live | Liveness check |
