# Email Service Setup Guide

## Overview

FindClass.nz uses **Brevo** (formerly Sendinblue) for transactional emails in production and **MailDev** for email testing in staging.

## Prerequisites

- Brevo account with API keys
- Configured sender email addresses

## Configuration

### 1. Environment Variables

Set the following environment variables in your `.env` file:

```bash
# SMTP Configuration (Brevo)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-brevo-login
SMTP_PASS=your-brevo-api-key

# Email Sender
FROM_EMAIL=no-reply@findclass.nz
FROM_NAME=FindClass NZ

# Frontend URL (for password reset links)
FRONTEND_URL=https://findclass.nz
```

### 2. Staging Environment

For staging/testing, MailDev is automatically configured by `docker-compose.yml`:

```bash
# MailDev captures emails without sending them
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_API_PORT=1080  # Web UI: http://localhost:1080
```

## Usage

### Sending Emails

```typescript
import * as emailService from '@shared/smtp/email.service';

// Send verification code
await emailService.sendVerificationEmail({
  email: 'user@example.com',
  code: '123456',
  type: 'REGISTER', // or 'FORGOT_PASSWORD', 'LOGIN'
  expiresIn: 300 // seconds
});

// Send password reset email
await emailService.sendPasswordResetEmail(
  'user@example.com',
  'reset-token-here',
  600 // expires in 10 minutes
);

// Send custom email
await emailService.sendEmail({
  to: 'recipient@example.com',
  subject: 'Test Email',
  htmlBody: '<h1>Hello</h1>',
  textBody: 'Hello'
});
```

### Email Templates

Templates are located in `backend/src/shared/smtp/templates/`:

- `verification.html` / `verification.txt` - Verification code emails
- `password-reset.html` / `password-reset.txt` - Password reset emails

To customize templates, edit these files and restart the server.

## Testing

### Integration Tests

Email integration tests use MailDev TestContainer:

```bash
cd backend
INTEGRATION_TESTS=true POSTGRES_INTEGRATION_TESTS=true npm run test:integration -- email
```

### Manual Testing (Staging)

1. Start staging environment:
   ```bash
   ./scripts/deploy-staging.sh
   ```

2. Open MailDev UI: http://localhost:1080

3. Trigger emails (e.g., register a user)

4. View captured emails in MailDev

## Troubleshooting

### Emails Not Sending

1. Check SMTP credentials in `.env`
2. Verify Brevo API key is valid
3. Check sender email is verified in Brevo
4. Review logs: `docker-compose logs backend`

### MailDev Not Showing Emails

1. Verify MailDev container is running: `docker ps | grep maildev`
2. Check backend is using correct SMTP port (1025)
3. Review backend logs for SMTP errors

## Brevo Setup

1. Create account at https://www.brevo.com
2. Verify sender email addresses
3. Generate SMTP & API keys
4. Configure DNS records (SPF, DKIM) for better deliverability

## Production Checklist

- [ ] SMTP credentials configured
- [ ] Sender emails verified
- [ ] DNS records configured (SPF, DKIM)
- [ ] Email templates tested
- [ ] Rate limiting configured
- [ ] Error monitoring setup
- [ ] Test emails sent successfully

## Related Files

- `backend/src/shared/smtp/email.service.ts` - Email service implementation
- `backend/src/shared/smtp/templates/` - Email templates
- `backend/tests/integration/email/` - Integration tests
- `scripts/deploy-staging.sh` - Staging deployment with MailDev
