/**
 * MailDev Helper Functions for Integration Testing
 *
 * Provides utilities for interacting with MailDev TestContainer during tests.
 * MailDev provides a REST API for fetching and managing emails.
 *
 * @see https://github.com/maildev/maildev/tree/master/docs/api.md
 */

/**
 * Represents an email address with optional name
 */
export interface EmailAddress {
  address: string;
  name?: string;
}

/**
 * Represents an email message from MailDev
 */
export interface Email {
  id: string;
  to: EmailAddress[];
  from: EmailAddress[];
  subject: string;
  html?: string;
  text?: string;
  date: string;
  headers?: Record<string, string>;
}

/**
 * Options for verifying email was sent
 */
export interface VerifyEmailOptions {
  to: string;
  subject?: string;
  containsText?: string;
  timeout?: number; // milliseconds
}

/**
 * Get MailDev API base URL from environment variables
 *
 * MailDev is started by setup.postgres.ts and exposes:
 * - SMTP port: 1025 (configured via SMTP_PORT env var)
 * - Web UI/API port: 1080 (configured via SMTP_API_PORT env var)
 *
 * @returns MailDev API URL
 * @throws Error if SMTP_HOST or SMTP_API_PORT not set
 */
export function getMailDevUrl(): string {
  const host = process.env.SMTP_HOST;
  const apiPort = process.env.SMTP_API_PORT;

  if (!host || !apiPort) {
    throw new Error(
      'MailDev not configured. Ensure setup.postgres.ts has been imported and beforeAll() has run.'
    );
  }

  return `http://${host}:${apiPort}`;
}

/**
 * Fetch all emails from MailDev
 *
 * @returns Array of all emails
 */
export async function getAllEmails(): Promise<Email[]> {
  try {
    const response = await fetch(`${getMailDevUrl()}/email`);

    if (!response.ok) {
      throw new Error(`MailDev API error: ${response.status} ${response.statusText}`);
    }

    const emails = await response.json();
    return emails || [];
  } catch (error) {
    console.error('Failed to fetch emails from MailDev:', error);
    return [];
  }
}

/**
 * Get emails sent to a specific recipient
 *
 * @param recipient - Email address to filter by
 * @returns Array of emails sent to the recipient
 */
export async function getEmailsByRecipient(recipient: string): Promise<Email[]> {
  const allEmails = await getAllEmails();
  const lowerRecipient = recipient.toLowerCase();

  return allEmails.filter((email) =>
    email.to.some((addr) => addr.address.toLowerCase() === lowerRecipient)
  );
}

/**
 * Get the most recent email
 *
 * @returns Latest email or null if no emails exist
 */
export async function getLatestEmail(): Promise<Email | null> {
  const emails = await getAllEmails();

  if (emails.length === 0) {
    return null;
  }

  // MailDev returns emails in chronological order (oldest first)
  return emails[emails.length - 1];
}

/**
 * Clear all emails from MailDev
 *
 * Useful for test isolation in beforeEach hooks
 */
export async function clearAllEmails(): Promise<void> {
  try {
    const response = await fetch(`${getMailDevUrl()}/email/all`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to clear emails: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.warn('Failed to clear MailDev emails:', error);
  }
}

/**
 * Verify an email was sent with optional matching criteria
 *
 * @param options - Verification options
 * @returns Object with found status and matching email
 */
export async function verifyEmailSent(
  options: VerifyEmailOptions
): Promise<{ found: boolean; email: Email | null }> {
  const { to, subject, containsText, timeout = 5000 } = options;
  const startTime = Date.now();
  const lowerTo = to.toLowerCase();

  // Poll for email with timeout
  while (Date.now() - startTime < timeout) {
    const emails = await getAllEmails();

    for (const email of emails) {
      // Check recipient
      const hasRecipient = email.to.some(
        (addr) => addr.address.toLowerCase() === lowerTo
      );

      if (!hasRecipient) {
        continue;
      }

      // Check subject if provided
      if (subject && !email.subject.includes(subject)) {
        continue;
      }

      // Check text content if provided
      if (containsText) {
        const htmlContent = email.html || '';
        const textContent = email.text || '';
        if (
          !htmlContent.toLowerCase().includes(containsText.toLowerCase()) &&
          !textContent.toLowerCase().includes(containsText.toLowerCase())
        ) {
          continue;
        }
      }

      // All checks passed
      return { found: true, email };
    }

    // Wait 100ms before retrying
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return { found: false, email: null };
}

/**
 * Verify email content matches expected values
 *
 * @param email - Email to verify
 * @param expected - Expected content
 * @returns True if all expected values match
 */
export function verifyEmailContent(
  email: Email,
  expected: {
    subject?: string;
    htmlBody?: string;
    textBody?: string;
    from?: string;
  }
): boolean {
  if (expected.subject && !email.subject.includes(expected.subject)) {
    return false;
  }

  if (expected.from) {
    const fromAddress = email.from[0]?.address.toLowerCase();
    if (!fromAddress || !fromAddress.includes(expected.from.toLowerCase())) {
      return false;
    }
  }

  if (expected.htmlBody && !email.html?.includes(expected.htmlBody)) {
    return false;
  }

  if (expected.textBody && !email.text?.includes(expected.textBody)) {
    return false;
  }

  return true;
}

/**
 * Extract verification code from email
 *
 * Looks for 6-digit code in:
 * 1. HTML: <span>123456</span> or <td>123456</td>
 * 2. Text: "验证码: 123456" or "verification code: 123456"
 *
 * @param email - Email to extract code from
 * @returns 6-digit verification code or null if not found
 */
export function extractVerificationCode(email: Email): string | null {
  // Try HTML first - look for 6-digit code in span or td
  const htmlMatch = email.html?.match(/<(?:span|td)[^>]*>(\d{6})<\/(?:span|td)>/);
  if (htmlMatch) {
    return htmlMatch[1];
  }

  // Try text version - look for various patterns
  const textPatterns = [
    /验证码[:\s]+(\d{6})/, // Chinese: "验证码: 123456"
    /verification code[:\s]+(\d{6})/i, // English: "verification code: 123456"
    /code[:\s]+(\d{6})/i, // Generic: "code: 123456"
    /(\d{6})/, // Any 6-digit number (last resort)
  ];

  for (const pattern of textPatterns) {
    const textMatch = email.text?.match(pattern);
    if (textMatch) {
      return textMatch[1];
    }
  }

  return null;
}

/**
 * Extract password reset link from email
 *
 * @param email - Email to extract reset link from
 * @returns Reset link URL or null if not found
 */
export function extractResetLink(email: Email): string | null {
  // Try HTML first - look for href attribute
  const htmlMatch = email.html?.match(/href="([^"]*reset-password[^"]*)"/);
  if (htmlMatch) {
    return htmlMatch[1];
  }

  // Try text version - look for URL
  const textMatch = email.text?.match(/(https?:\/\/[^\s]+reset-password[^\s]*)/);
  if (textMatch) {
    return textMatch[1];
  }

  return null;
}

/**
 * Wait for an email to arrive
 *
 * @param options - What to wait for
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns Email that arrived or null if timeout
 */
export async function waitForEmail(
  options: Omit<VerifyEmailOptions, 'timeout'>,
  timeout: number = 5000
): Promise<Email | null> {
  const result = await verifyEmailSent({ ...options, timeout });
  return result.email;
}

/**
 * Get email count for a specific recipient
 *
 * @param recipient - Email address
 * @returns Number of emails sent to recipient
 */
export async function getEmailCount(recipient: string): Promise<number> {
  const emails = await getEmailsByRecipient(recipient);
  return emails.length;
}
