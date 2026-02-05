/**
 * Email Service - SMTP Implementation
 * Handles transactional email sending via SMTP (SendPulse, SendGrid, etc.)
 * Supports custom sender addresses like no-reply@findclass.nz
 *
 * Configuration is loaded from environment variables:
 * - SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
 * - FROM_EMAIL, FROM_NAME
 */

import nodemailer from 'nodemailer';
import { logger } from '@core/logger';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getConfig } from '@src/config';

const TEMPLATES_DIR = join(__dirname, 'templates');

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) {
    return transporter;
  }

  const config = getConfig();
  const smtpConfig = config.smtp;

  const transportConfig = {
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: smtpConfig.user
      ? {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        }
      : undefined,
  };

  transporter = nodemailer.createTransport(transportConfig);

  logger.info('SMTP transporter created', {
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    from: smtpConfig.fromEmail,
  });

  return transporter;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  htmlBody: string;
  textBody?: string;
}

interface VerificationEmailData {
  email: string;
  code: string;
  type: 'REGISTER' | 'FORGOT_PASSWORD' | 'LOGIN';
  expiresIn: number;
}

function loadTemplate(templateName: string): string {
  const templatePath = join(TEMPLATES_DIR, templateName);
  return readFileSync(templatePath, 'utf-8');
}

function replaceTemplatePlaceholders(
  template: string,
  placeholders: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(placeholders)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return result;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const config = getConfig();
  const smtpConfig = config.smtp;
  const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

  try {
    const transporter = getTransporter();

    const result = await transporter.sendMail({
      from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
      to: toAddresses.join(', '),
      subject: options.subject,
      html: options.htmlBody,
      text: options.textBody,
    });

    logger.info('Email sent successfully', {
      to: toAddresses,
      subject: options.subject,
      messageId: result.messageId,
    });

    return true;
  } catch (error) {
    logger.error('Failed to send email', {
      to: options.to,
      subject: options.subject,
      error,
    });
    return false;
  }
}

export function generateVerificationEmailHTML(data: VerificationEmailData): string {
  const { code, type, expiresIn } = data;

  let title = 'Verification Code';
  let description = 'Your verification code is';

  switch (type) {
    case 'REGISTER':
      title = 'Verify Your Email';
      description = 'Welcome! Use this code to complete your registration';
      break;
    case 'FORGOT_PASSWORD':
      title = 'Reset Your Password';
      description = 'Use this code to reset your password';
      break;
    case 'LOGIN':
      title = 'Login Verification';
      description = 'Use this code to complete your login';
      break;
  }

  const template = loadTemplate('verification.html');

  return replaceTemplatePlaceholders(template, {
    title,
    description,
    code,
    expiresInMinutes: Math.floor(expiresIn / 60),
  });
}

export function generateVerificationEmailText(data: VerificationEmailData): string {
  const { code, type, expiresIn } = data;

  let title = 'Verification Code';
  let description = 'Your verification code is';

  switch (type) {
    case 'REGISTER':
      title = 'Verify Your Email';
      description = 'Welcome! Use this code to complete your registration';
      break;
    case 'FORGOT_PASSWORD':
      title = 'Reset Your Password';
      description = 'Use this code to reset your password';
      break;
    case 'LOGIN':
      title = 'Login Verification';
      description = 'Use this code to complete your login';
      break;
  }

  const template = loadTemplate('verification.txt');

  return replaceTemplatePlaceholders(template, {
    title,
    description,
    code,
    expiresInMinutes: Math.floor(expiresIn / 60),
  });
}

export async function sendVerificationEmail(data: VerificationEmailData): Promise<boolean> {
  const htmlBody = generateVerificationEmailHTML(data);
  const textBody = generateVerificationEmailText(data);

  return sendEmail({
    to: data.email,
    subject: `[FindClass NZ] Your verification code`,
    htmlBody,
    textBody,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  expiresIn: number
): Promise<boolean> {
  const config = getConfig();
  const resetLink = `${config.frontendUrl}/auth/reset-password?token=${resetToken}`;

  const htmlTemplate = loadTemplate('password-reset.html');
  const htmlBody = replaceTemplatePlaceholders(htmlTemplate, {
    resetLink,
    expiresInMinutes: Math.floor(expiresIn / 60),
  });

  const textTemplate = loadTemplate('password-reset.txt');
  const textBody = replaceTemplatePlaceholders(textTemplate, {
    resetLink,
    expiresInMinutes: Math.floor(expiresIn / 60),
  });

  return sendEmail({
    to: email,
    subject: `[FindClass NZ] Reset Your Password`,
    htmlBody,
    textBody,
  });
}

export function setTestTransporter(testTransporter: nodemailer.Transporter): void {
  transporter = testTransporter;
}

export function resetTransporter(): void {
  transporter = null;
}

export function clearTransporterCache(): void {
  transporter = null;
}

export const emailService = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  generateVerificationEmailHTML,
  generateVerificationEmailText,
  setTestTransporter,
  resetTransporter,
  clearTransporterCache,
};
