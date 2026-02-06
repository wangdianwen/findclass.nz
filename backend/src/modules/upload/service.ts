/**
 * Upload Module - Service
 */

import path from 'path';
import { logger } from '../../core/logger';
import type { UploadResponse } from './types';

class UploadService {
  /**
   * Get the base URL for serving uploaded files
   */
  private getBaseUrl(): string {
    const config = process.env.UPLOAD_BASE_URL || '';
    if (config) {
      return config;
    }
    // In production, use the server's base URL
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || 'localhost';
    return `http://${host}:${port}`;
  }

  /**
   * Get the public URL path for an uploaded file
   */
  getFileUrl(relativePath: string): string {
    const baseUrl = this.getBaseUrl();
    return `${baseUrl}${relativePath}`;
  }

  /**
   * Process avatar upload response
   */
  processAvatarUpload(filename: string, originalname: string, size: number): UploadResponse {
    const url = this.getFileUrl(`/uploads/avatars/${filename}`);

    logger.info('Avatar uploaded successfully', {
      filename,
      originalname,
      size,
      url,
    });

    return {
      url,
      filename,
      size,
      mimeType: this.getMimeType(originalname),
    };
  }

  /**
   * Process qualification upload response
   */
  processQualificationUpload(
    filename: string,
    originalname: string,
    size: number,
    type: string
  ): UploadResponse {
    const url = this.getFileUrl(`/uploads/qualifications/${filename}`);

    logger.info('Qualification uploaded successfully', {
      filename,
      originalname,
      size,
      type,
      url,
    });

    return {
      url,
      filename,
      size,
      mimeType: this.getMimeType(originalname),
    };
  }

  /**
   * Get MIME type from filename
   */
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

export const uploadService = new UploadService();
