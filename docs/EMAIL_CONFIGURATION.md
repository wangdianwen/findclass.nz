# Email Service Configuration Guide

This document explains the email service configuration across different environments in the FindClass.nz project.

## Overview

FindClass.nz uses a hybrid email solution with different SMTP services for each environment:

| Environment | SMTP Service | Purpose | Web UI |
|-------------|--------------|---------|---------|
| **Development** | MailHog | Local development debugging | http://localhost:8025 |
| **Integration Tests** | MailDev (TestContainers) | Automated testing | Dynamic (TestContainers) |
| **Staging** | MailDev (Docker) | Pre-production testing | http://localhost:1080 |
| **Production** | Brevo SMTP | Real email delivery | N/A (Brevo Dashboard) |

**Sender Email**: `no-reply@findclass.nz`

## Environment Configurations

### Development (`.env.dev`)

```bash
# SMTP Configuration (MailHog - Development)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_API_PORT=8025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=no-reply@findclass.nz
FROM_NAME=FindClass NZ
```

- **Service**: MailHog (running in Docker)
- **Purpose**: Catch all emails locally for debugging
- **Web UI**: http://localhost:8025
- **Auto-started**: Yes, via `docker-compose up`

### Staging (`.env.staging`)

```bash
# SMTP Configuration (MailDev - Staging)
SMTP_HOST=maildev
SMTP_PORT=1025
SMTP_API_PORT=1080
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=no-reply@findclass.nz
FROM_NAME=FindClass NZ (Staging)
```

- **Service**: MailDev (running in Docker)
- **Purpose**: Test emails in staging environment
- **Web UI**: http://localhost:1080
- **Auto-started**: Yes, via `docker-compose --profile staging up`

### Production (`.env.prod`)

```bash
# SMTP Configuration (Brevo - Production)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_API_PORT=8025
SMTP_SECURE=false
SMTP_USER=your-brevo-login@email.com
SMTP_PASS=REPLACE_WITH_BREVO_SMTP_KEY
FROM_EMAIL=no-reply@findclass.nz
FROM_NAME=FindClass NZ
```

- **Service**: Brevo (formerly Sendinblue)
- **Purpose**: Send real emails to users
- **Setup Required**: Yes (see Brevo Setup section below)

## Integration Tests

Integration tests automatically start a MailDev TestContainer:

```typescript
// backend/tests/integration/setup.postgres.ts
const maildevContainer = await new GenericContainer('maildev/maildev:2.1.0')
  .withExposedPorts({ container: 1025, host: 1025 }) // SMTP
  .withExposedPorts({ container: 1080, host: 1080 }) // Web UI
  .withWaitStrategy(Wait.forListeningPorts())
  .withStartupTimeout(120000)
  .start();

// Environment variables are automatically set
process.env.SMTP_HOST = maildevContainer.getHost();
process.env.SMTP_PORT = maildevContainer.getMappedPort(1025).toString();
```

No manual setup required - tests handle everything automatically!

## Deployment

### Starting Staging Environment

```bash
# Using the deployment script
./scripts/deploy-staging.sh --build

# Or manually
docker-compose --profile staging up -d
```

After starting, access:
- **Frontend**: http://localhost:3002
- **Backend API**: http://localhost:3001
- **MailDev UI**: http://localhost:1080

### Testing Email Sending in Staging

1. Open http://localhost:3002
2. Register a new user
3. Open http://localhost:1080
4. See the verification email captured by MailDev

## Brevo Production Setup

### Step 1: Create Brevo Account

1. Visit https://www.brevo.com/
2. Click "Sign up for free"
3. Complete registration
4. Verify your email

### Step 2: Configure Sender Domain

1. Login to Brevo Dashboard
2. Go to **Senders** → **Senders & domains**
3. Click **New sender** → **Domain**
4. Enter: `findclass.nz`
5. Click **Save**

### Step 3: Add DNS Records

Add these records to your DNS provider (Cloudflare, Namecheap, etc.):

```
# SPF Record
Type: TXT
Name: @
Value: v=spf1 include:spf.brevo.com ~all

# DKIM Record (get the full key from Brevo)
Type: TXT
Name: brevo._domainkey
Value: k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCX[...]

# CNAME for DKIM
Type: CNAME
Name: mail._domainkey
Value: brevo._domainkey.findclass.nz
```

**How to get DKIM key:**
- In Brevo Dashboard → Senders → Click your domain
- Click **View DKIM** → Copy the complete TXT record value

### Step 4: Verify Domain

1. In Brevo Dashboard → Senders → Click your domain
2. Click **Verify DNS**
3. Wait for DNS propagation (5-10 minutes, up to 48 hours)
4. Status should change to "Verified"

### Step 5: Get SMTP Credentials

1. Go to **SMTP & API** → **SMTP** in Brevo Dashboard
2. Click **Create new SMTP key**
3. Copy the credentials:
   ```
   SMTP Login: your-login@email.com
   SMTP Key: xsmtpsib-xxxxxxxxxxxxxxxxx
   Host: smtp-relay.brevo.com
   Port: 587
   ```

### Step 6: Update Production Environment

Add your Brevo credentials to the production environment (do NOT commit to git):

```bash
# Option 1: Environment variables (recommended)
export SMTP_HOST="smtp-relay.brevo.com"
export SMTP_PORT="587"
export SMTP_USER="your-brevo-login@email.com"
export SMTP_PASS="xsmtpsib-xxxxxxxxxxxxxxxxx"

# Option 2: Create .env.production.local (not in git)
cp backend/src/config/env/.env.prod backend/src/config/env/.env.production.local
# Edit the file with real credentials
```

**IMPORTANT**: Never commit real SMTP credentials to git!

### Step 7: Test Production Emails

```bash
# Send a test email to your real address
curl -X POST http://localhost:8080/api/v1/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email": "your-real-email@example.com"}'
```

Check your inbox - you should receive a real email!

## DNS Verification Tools

After configuring DNS, verify with these tools:

- **MXToolbox**: https://mxtoolbox.com/ (SPF/DKIM check)
- **NSLookup**: https://www.nslookup.io/ (DNS propagation)
- **Brevo Dashboard**: Built-in verification tool

## Monitoring & Troubleshooting

### Brevo Dashboard

Monitor your email delivery at:
- **Send Stats**: https://app.brevo.com/campaigns/transactional
- **Daily Usage**: Free tier = 300 emails/day
- **Delivery Rate**: Should be > 95%
- **Bounce Rate**: Should be < 5%

### Application Logs

```bash
# View email-related logs
tail -f logs/app.log | grep -i "email\|smtp"

# Count successful sends
grep "Email sent successfully" logs/app.log | wc -l

# Find errors
grep "Failed to send email" logs/app.log
```

### Docker Logs

```bash
# MailDev logs (staging)
docker-compose logs staging-maildev -f

# All staging services
docker-compose --profile staging logs -f
```

### Common Issues

**Issue 1: Emails not reaching inbox**
- Check SPF/DKIM DNS records
- Verify domain in Brevo Dashboard
- Check Brevo delivery logs

**Issue 2: Port already in use**
```bash
# Find what's using the port
lsof -ti:1025 | xargs kill -9
```

**Issue 3: MailDev not starting**
```bash
# Check Docker logs
docker-compose logs staging-maildev

# Restart MailDev
docker-compose restart staging-maildev
```

**Issue 4: Brevo rate limit exceeded**
- Free tier: 300 emails/day
- Monitor usage in Brevo Dashboard
- Consider upgrading to paid plan ($9/month for 5,000 emails)

## Security Best Practices

1. **Never commit SMTP credentials** to git
2. **Use environment variables** in production
3. **Add .env.production.local** to `.gitignore`
4. **Rotate SMTP keys** periodically
5. **Monitor delivery rates** for anomalies
6. **Use TLS/SSL** for SMTP connections (STARTTLS for Brevo)

## Testing Email Functionality

### Manual Testing

```bash
# 1. Start staging environment
./scripts/deploy-staging.sh

# 2. Register a test user
curl -X POST http://localhost:3001/api/v1/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 3. Check MailDev UI
open http://localhost:1080

# 4. Complete registration
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "Test User",
    "verificationCode": "123456"
  }'
```

### Automated Testing

```bash
# Run integration tests (includes email tests)
cd backend
npm run test:integration

# Run specific email test
npm run test:integration -- auth
```

## Migration from SendGrid

If migrating from SendGrid to Brevo:

1. **Update credentials** in `.env.prod`
2. **Verify DNS records** (SPF/DKIM need to point to Brevo)
3. **Test with real emails** before full deployment
4. **Monitor delivery rates** in Brevo Dashboard
5. **Update any hard-coded SendGrid references**

**Key differences:**
- **Host**: `smtp-relay.brevo.com` (vs `smtp.sendgrid.net`)
- **Port**: `587` with STARTTLS (vs `587` with SSL)
- **Auth**: Username + Key (vs `apikey` + Key)

## Rollback Plan

If Brevo has issues, rollback to SendGrid:

```bash
# .env.prod
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-key
```

## Resources

- **Brevo Documentation**: https://help.brevo.com/hc/en-us
- **Brevo SMTP Guide**: https://help.brevo.com/hc/en-us/articles/360005202339
- **MailDev GitHub**: https://github.com/maildev/maildev
- **MailHog GitHub**: https://github.com/mailhog/mailhog
- **TestContainers Node.js**: https://node.testcontainers.org/

## Support

For issues or questions:
1. Check application logs: `tail -f logs/app.log`
2. Check container logs: `docker-compose logs -f`
3. Verify environment variables: `docker-compose exec staging-api env | grep SMTP`
4. Test SMTP connection: Use telnet or openssl
5. Check Brevo status page: https://status.brevo.com/

---

**Last Updated**: 2025-02-08
**Version**: 1.0
