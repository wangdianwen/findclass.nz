/**
 * Upload Module - Types
 */

import type { Request } from 'express';

export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface AvatarUploadResponse {
  url: string;
}

export interface QualificationUploadResponse {
  url: string;
  type: string;
}

// Extended file info for our use
export interface UploadedFileInfo {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}

// Extend Express Request to include file
export interface AuthenticatedUploadRequest extends Request {
  file?: Express.Multer.File;
}
