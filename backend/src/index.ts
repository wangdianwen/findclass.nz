/**
 * EduSearch NZ - Course Search Platform Backend
 *
 * A Node.js/Express backend for course search platform in New Zealand
 * Supports both local development (Express) and production (AWS Lambda)
 */

export const APP_NAME = 'FindClass NZ';
export const APP_DESCRIPTION = 'Course Search Platform for New Zealand';
export const API_VERSION = process.env.API_VERSION || 'v1';

// Module exports
export * from './config';
export * from './server';
export * from './app';
