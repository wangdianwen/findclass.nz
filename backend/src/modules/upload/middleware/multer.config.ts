/**
 * Upload Module - Multer Configuration
 */

import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Allowed MIME types for avatar uploads
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Allowed MIME types for qualification uploads
const ALLOWED_QUALIFICATION_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// Maximum file sizes
const AVATAR_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const QUALIFICATION_MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Get upload directory from config or use default
const getUploadDir = (subDir: string = ''): string => {
  const baseDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  return subDir ? path.join(baseDir, subDir) : baseDir;
};

// Generate unique filename with original extension
const generateFilename = (originalname: string): string => {
  const ext = path.extname(originalname).toLowerCase();
  return `${uuidv4()}${ext}`;
};

// Storage configuration for avatars
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = getUploadDir('avatars');
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const filename = generateFilename(file.originalname);
    cb(null, filename);
  },
});

// Storage configuration for qualifications
const qualificationStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const subDir = file.fieldname === 'file' ? 'qualifications' : 'temp';
    const uploadPath = getUploadDir(subDir);
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const filename = generateFilename(file.originalname);
    cb(null, filename);
  },
});

// File filter for avatars
const avatarFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  if (ALLOWED_AVATAR_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_AVATAR_TYPES.join(', ')}`));
  }
};

// File filter for qualifications
const qualificationFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  if (ALLOWED_QUALIFICATION_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_QUALIFICATION_TYPES.join(', ')}`));
  }
};

// Configure multer for avatar uploads
export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: AVATAR_MAX_SIZE,
  },
  fileFilter: avatarFileFilter,
});

// Configure multer for qualification uploads
export const uploadQualification = multer({
  storage: qualificationStorage,
  limits: {
    fileSize: QUALIFICATION_MAX_SIZE,
  },
  fileFilter: qualificationFileFilter,
});

// Export allowed types for reference
export const ALLOWED_TYPES = {
  avatar: ALLOWED_AVATAR_TYPES,
  qualification: ALLOWED_QUALIFICATION_TYPES,
};

export const MAX_SIZES = {
  avatar: AVATAR_MAX_SIZE,
  qualification: QUALIFICATION_MAX_SIZE,
};
