---
title: 技术实现 - 文件上传规范
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 1
priority: P0
status: complete
related_feature: ../../05-product-design/mvp/feature-file-upload.md
---

# 技术实现: 文件上传规范

> **对应产品文档**: [feature-file-upload.md](../../05-product-design/mvp/feature-file-upload.md) | **优先级**: P0 | **排期**: Phase 1 | **状态**: 已实现

---

## 一、技术架构

### 1.1 文件上传架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         文件上传架构                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [Client (Web/Mobile)]                                            │
│         │                                                           │
│         ▼                                                           │
│   [Pre-signed URL] ──→ [S3/CloudFront CDN]                         │
│         │                                                           │
│         ▼                                                           │
│   [Lambda: Upload Handler]                                         │
│         │                                                           │
│         ▼                                                           │
│   [DynamoDB: File Metadata]                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 上传流程

```
1. 客户端请求预签名URL
       │
       ▼
2. 服务端验证权限，生成预签名URL
       │
       ▼
3. 客户端直接上传文件到S3
       │
       ▼
4. S3触发Lambda处理
       │
       ▼
5. Lambda更新文件元数据到DynamoDB
       │
       ▼
6. 客户端获取上传结果
```

### 1.3 技术选型

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| **对象存储** | AWS S3 | 文件存储 |
| **CDN** | CloudFront | 静态资源分发 |
| **图片处理** | Sharp Lambda | 图片压缩、缩略图 |
| **元数据存储** | DynamoDB | 文件元数据 |
| **预签名URL** | AWS SDK v3 | 安全上传凭证 |

---

## 二、数据模型设计 (TypeScript)

### 2.1 文件类型定义

```typescript
// upload/file-types.ts

/**
 * 允许的文件类型
 */
export enum FileCategory {
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
}

/**
 * 文件 MIME 类型映射
 */
export const FILE_MIME_TYPES: Record<string, FileCategory> = {
  // 图片
  'image/jpeg': FileCategory.IMAGE,
  'image/png': FileCategory.IMAGE,
  'image/gif': FileCategory.IMAGE,
  'image/webp': FileCategory.IMAGE,
  'image/svg+xml': FileCategory.IMAGE,

  // 文档
  'application/pdf': FileCategory.DOCUMENT,
  'application/msword': FileCategory.DOCUMENT,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileCategory.DOCUMENT,
  'application/vnd.ms-excel': FileCategory.DOCUMENT,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileCategory.DOCUMENT,

  // 视频
  'video/mp4': FileCategory.VIDEO,
  'video/webm': FileCategory.VIDEO,
  'video/quicktime': FileCategory.VIDEO,

  // 音频
  'audio/mpeg': FileCategory.AUDIO,
  'audio/wav': FileCategory.AUDIO,
  'audio/ogg': FileCategory.AUDIO,
};

/**
 * 文件扩展名映射
 */
export const FILE_EXTENSIONS: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};
```

### 2.2 文件大小限制

```typescript
// upload/file-size-limits.ts

/**
 * 文件大小限制配置
 */
export interface FileSizeLimit {
  /** 最大文件大小（字节） */
  maxSize: number;
  /** 单位显示名称 */
  unit: string;
}

/**
 * 按类别分组的文件大小限制
 */
export const FILE_SIZE_LIMITS: Record<string, FileSizeLimit> = {
  [FileCategory.IMAGE]: {
    maxSize: 5 * 1024 * 1024, // 5MB
    unit: '5MB',
  },
  [FileCategory.DOCUMENT]: {
    maxSize: 10 * 1024 * 1024, // 10MB
    unit: '10MB',
  },
  [FileCategory.VIDEO]: {
    maxSize: 100 * 1024 * 1024, // 100MB
    unit: '100MB',
  },
  [FileCategory.AUDIO]: {
    maxSize: 50 * 1024 * 1024, // 50MB
    unit: '50MB',
  },
};

/**
 * 默认文件大小限制
 */
export const DEFAULT_FILE_SIZE_LIMIT: FileSizeLimit = {
  maxSize: 5 * 1024 * 1024, // 5MB
  unit: '5MB',
};
```

### 2.3 文件元数据接口

```typescript
// upload/file-metadata.ts

/**
 * 文件元数据
 */
export interface FileMetadata {
  /** 文件唯一ID */
  id: string;
  /** 原始文件名 */
  originalName: string;
  /** 存储Key */
  key: string;
  /** CDN URL */
  url: string;
  /** 文件类别 */
  category: FileCategory;
  /** MIME类型 */
  mimeType: string;
  /** 文件大小（字节） */
  size: number;
  /** 宽度（图片/视频） */
  width?: number;
  /** 高度（图片/视频） */
  height?: number;
  /** 缩略图URL（图片/视频） */
  thumbnailUrl?: string;
  /** 所属用户ID */
  userId: string;
  /** 所属业务类型 */
  businessType: string;
  /** 业务ID */
  businessId: string;
  /** 上传时间 */
  createdAt: number;
  /** 状态 */
  status: FileStatus;
}

/**
 * 文件状态
 */
export enum FileStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * 上传请求参数
 */
export interface UploadRequest {
  /** 文件名 */
  filename: string;
  /** MIME类型 */
  mimeType: string;
  /** 文件大小 */
  size: number;
  /** 业务类型 */
  businessType: string;
  /** 业务ID */
  businessId: string;
}

/**
 * 预签名URL响应
 */
export interface PresignedUrlResponse {
  uploadUrl: string;
  fileId: string;
  key: string;
  expiresIn: number;
}

/**
 * 上传完成响应
 */
export interface UploadCompleteResponse {
  id: string;
  url: string;
  key: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}
```

### 2.4 文件元数据表 (DynamoDB)

```yaml
TableName: file-metadata
KeySchema:
  - AttributeName: id
    KeyType: HASH
AttributeDefinitions:
  - AttributeName: id
    AttributeType: S
  - AttributeName: userId
    AttributeType: S
  - AttributeName: business
    AttributeType: S
GlobalSecondaryIndexes:
  - IndexName: user-index
    KeySchema:
      - AttributeName: userId
        KeyType: HASH
    Projection:
      ProjectionType: ALL
  - IndexName: business-index
    KeySchema:
      - AttributeName: business
        KeyType: HASH
    Projection:
      ProjectionType: ALL
BillingMode: PAY_PER_REQUEST
TimeToLiveSpecification:
  AttributeName: expireAt
  Enabled: true
```

---

## 三、业务逻辑实现

### 3.1 文件验证服务

```typescript
// upload/file-validator.ts
import {
  FileCategory,
  FILE_MIME_TYPES,
  FILE_EXTENSIONS,
  FILE_SIZE_LIMITS,
  FileSizeLimit,
} from './file-types';
import { UploadRequest } from './file-metadata';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  category?: FileCategory;
  normalizedMimeType?: string;
}

/**
 * 文件验证服务
 */
export class FileValidator {
  /**
   * 验证上传请求
   */
  validateUploadRequest(request: UploadRequest): ValidationResult {
    const errors: string[] = [];
    let category: FileCategory | undefined;
    let normalizedMimeType = request.mimeType;

    // 验证文件名
    if (!request.filename || request.filename.length === 0) {
      errors.push('文件名不能为空');
    }

    // 验证MIME类型
    const detectedCategory = FILE_MIME_TYPES[request.mimeType.toLowerCase()];
    if (!detectedCategory) {
      // 尝试通过扩展名检测
      const ext = '.' + request.filename.split('.').pop()?.toLowerCase();
      const mimeFromExt = FILE_EXTENSIONS[ext];
      if (mimeFromExt) {
        normalizedMimeType = mimeFromExt;
        category = FILE_MIME_TYPES[mimeFromExt];
      } else {
        errors.push(`不支持的文件类型: ${request.mimeType}`);
      }
    } else {
      category = detectedCategory;
    }

    // 验证文件大小
    const sizeLimit = category
      ? FILE_SIZE_LIMITS[category]
      : DEFAULT_FILE_SIZE_LIMIT;

    if (request.size > sizeLimit.maxSize) {
      errors.push(`文件大小超出限制，最大允许 ${sizeLimit.unit}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      category,
      normalizedMimeType,
    };
  }

  /**
   * 验证文件MIME类型
   */
  validateMimeType(mimeType: string): boolean {
    return mimeType in FILE_MIME_TYPES;
  }

  /**
   * 获取文件类别
   */
  getFileCategory(mimeType: string): FileCategory | undefined {
    return FILE_MIME_TYPES[mimeType.toLowerCase()];
  }

  /**
   * 获取文件大小限制
   */
  getSizeLimit(category: FileCategory): FileSizeLimit {
    return FILE_SIZE_LIMITS[category];
  }

  /**
   * 验证文件扩展名
   */
  validateExtension(filename: string): boolean {
    const ext = '.' + filename.split('.').pop()?.toLowerCase();
    return ext in FILE_EXTENSIONS;
  }

  /**
   * 获取允许的扩展名列表
   */
  getAllowedExtensions(): string[] {
    return Object.keys(FILE_EXTENSIONS);
  }

  /**
   * 获取允许的MIME类型列表
   */
  getAllowedMimeTypes(): string[] {
    return Object.keys(FILE_MIME_TYPES);
  }
}

export const fileValidator = new FileValidator();
```

### 3.2 预签名URL服务

```typescript
// upload/presigned-url-service.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileCategory } from './file-types';
import { UploadRequest, PresignedUrlResponse } from './file-metadata';
import { v4 as uuidv4 } from 'uuid';

interface PresignedUrlConfig {
  bucket: string;
  region: string;
  expiresIn: number;
  cdnDomain?: string;
}

/**
 * 预签名URL服务
 */
export class PresignedUrlService {
  private s3Client: S3Client;
  private config: PresignedUrlConfig;

  constructor(config: PresignedUrlConfig) {
    this.s3Client = new S3Client({
      region: config.region,
    });
    this.config = config;
  }

  /**
   * 生成预签名上传URL
   */
  async generateUploadUrl(
    request: UploadRequest,
    userId: string
  ): Promise<PresignedUrlResponse> {
    const fileId = uuidv4();
    const key = this.generateKey(userId, request.businessType, fileId, request.filename);

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ContentType: request.mimeType,
      Metadata: {
        originalName: request.filename,
        userId,
        businessType: request.businessType,
        businessId: request.businessId,
      },
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: this.config.expiresIn,
    });

    return {
      uploadUrl,
      fileId,
      key,
      expiresIn: this.config.expiresIn,
    };
  }

  /**
   * 生成文件Key
   */
  private generateKey(
    userId: string,
    businessType: string,
    fileId: string,
    filename: string
  ): string {
    const ext = filename.split('.').pop() || '';
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return `${userId}/${businessType}/${date}/${fileId}.${ext}`;
  }

  /**
   * 获取CDN URL
   */
  getCdnUrl(key: string): string {
    if (this.config.cdnDomain) {
      return `https://${this.config.cdnDomain}/${key}`;
    }
    return `https://${this.config.bucket}.s3.amazonaws.com/${key}`;
  }
}

export const createPresignedUrlService = () =>
  new PresignedUrlService({
    bucket: process.env.S3_BUCKET || 'findclass-uploads',
    region: process.env.AWS_REGION || 'ap-southeast-2',
    expiresIn: 3600, // 1小时
    cdnDomain: process.env.CDN_DOMAIN,
  });
```

### 3.3 图片处理服务

```typescript
// upload/image-processor.ts
import Sharp from 'sharp';
import { UploadCompleteResponse } from './file-metadata';

interface ImageProcessOptions {
  /** 缩略图宽度 */
  thumbnailWidth?: number;
  /** 缩略图高度 */
  thumbnailHeight?: number;
  /** 质量 (0-100) */
  quality?: number;
  /** 是否生成WebP */
  convertWebp?: boolean;
}

/**
 * 图片处理服务
 */
export class ImageProcessor {
  private options: ImageProcessOptions;

  constructor(options: ImageProcessOptions = {}) {
    this.options = {
      thumbnailWidth: 200,
      thumbnailHeight: 200,
      quality: 80,
      convertWebp: true,
      ...options,
    };
  }

  /**
   * 处理图片并获取元数据
   */
  async processImage(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    thumbnailBuffer?: Buffer;
  }> {
    const image = Sharp(buffer);
    const metadata = await image.metadata();

    // 获取图片尺寸
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // 生成缩略图
    let thumbnailBuffer: Buffer | undefined;
    if (this.options.thumbnailWidth || this.options.thumbnailHeight) {
      thumbnailBuffer = await image
        .clone()
        .resize({
          width: this.options.thumbnailWidth,
          height: this.options.thumbnailHeight,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: this.options.quality })
        .toBuffer();
    }

    return {
      width,
      height,
      format: metadata.format || 'unknown',
      thumbnailBuffer,
    };
  }

  /**
   * 压缩图片
   */
  async compressImage(buffer: Buffer, quality?: number): Promise<Buffer> {
    return Sharp(buffer)
      .jpeg({ quality: quality || this.options.quality })
      .toBuffer();
  }

  /**
   * 调整图片尺寸
   */
  async resizeImage(
    buffer: Buffer,
    width: number,
    height: number
  ): Promise<Buffer> {
    return Sharp(buffer)
      .resize(width, height, {
        fit: 'fill',
      })
      .toBuffer();
  }

  /**
   * 获取图片方向并调整
   */
  async normalizeOrientation(buffer: Buffer): Promise<Buffer> {
    return Sharp(buffer)
      .rotate()
      .toBuffer();
  }
}

export const imageProcessor = new ImageProcessor();
```

### 3.4 文件元数据服务

```typescript
// upload/file-metadata-service.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { FileMetadata, FileStatus } from './file-metadata';

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

const TABLE_NAME = 'file-metadata';

/**
 * 文件元数据服务
 */
export class FileMetadataService {
  /**
   * 创建文件元数据
   */
  async create(metadata: FileMetadata): Promise<FileMetadata> {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...metadata,
        // 30天后过期
        expireAt: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      },
    });
    await ddbClient.send(command);
    return metadata;
  }

  /**
   * 获取文件元数据
   */
  async getById(id: string): Promise<FileMetadata | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: { id },
    });
    const response = await ddbClient.send(command);
    return (response.Item as FileMetadata) || null;
  }

  /**
   * 更新文件状态
   */
  async updateStatus(id: string, status: FileStatus): Promise<void> {
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
      },
    });
    await ddbClient.send(command);
  }

  /**
   * 添加缩略图URL
   */
  async addThumbnail(id: string, thumbnailUrl: string): Promise<void> {
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: 'SET thumbnailUrl = :thumbnailUrl',
      ExpressionAttributeValues: {
        ':thumbnailUrl': thumbnailUrl,
      },
    });
    await ddbClient.send(command);
  }

  /**
   * 删除文件元数据
   */
  async delete(id: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { id },
    });
    await ddbClient.send(command);
  }
}

export const fileMetadataService = new FileMetadataService();
```

---

## 四、API 设计

### 4.1 请求预签名URL

#### 请求
```
POST /api/v1/upload/presigned
Content-Type: application/json
Authorization: Bearer {token}

{
  "filename": "avatar.jpg",
  "mimeType": "image/jpeg",
  "size": 102400,
  "businessType": "avatar",
  "businessId": "user-001"
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://findclass-uploads.s3.ap-southeast-2.amazonaws.com/...",
    "fileId": "uuid-xxx",
    "key": "user-001/avatar/2026-01-26/uuid-xxx.jpg",
    "expiresIn": 3600
  },
  "meta": {
    "requestId": "req-20260126-001",
    "timestamp": 1706198400
  }
}
```

### 4.2 上传完成回调

#### 请求
```
POST /api/v1/upload/complete
Content-Type: application/json
Authorization: Bearer {token}

{
  "fileId": "uuid-xxx",
  "key": "user-001/avatar/2026-01-26/uuid-xxx.jpg"
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "id": "uuid-xxx",
    "url": "https://cdn.findclass.co.nz/user-001/avatar/2026-01-26/uuid-xxx.jpg",
    "key": "user-001/avatar/2026-01-26/uuid-xxx.jpg",
    "size": 102400,
    "mimeType": "image/jpeg",
    "width": 800,
    "height": 600,
    "thumbnailUrl": "https://cdn.findclass.co.nz/user-001/avatar/2026-01-26/uuid-xxx-thumb.jpg"
  },
  "meta": {
    "requestId": "req-20260126-001",
    "timestamp": 1706198400
  }
}
```

### 4.3 批量上传

#### 请求
```
POST /api/v1/upload/batch
Content-Type: application/json
Authorization: Bearer {token}

{
  "files": [
    {
      "filename": "photo1.jpg",
      "mimeType": "image/jpeg",
      "size": 102400,
      "businessType": "course-gallery",
      "businessId": "course-001"
    }
  ]
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "total": 1,
    "success": 1,
    "failed": 0,
    "results": [
      {
        "index": 0,
        "success": true,
        "data": {
          "id": "uuid-001",
          "url": "https://cdn.findclass.co.nz/..."
        }
      }
    ]
  },
  "meta": {
    "requestId": "req-20260126-001",
    "timestamp": 1706198400
  }
}
```

### 4.4 错误响应

| 错误码 | 说明 | HTTP状态 |
|--------|------|----------|
| UPLOAD_NO_FILE | 未上传文件 | 400 |
| UPLOAD_SIZE_EXCEED | 文件大小超出限制 | 400 |
| UPLOAD_TYPE_NOT_ALLOWED | 文件类型不支持 | 400 |
| UPLOAD_FILE_ID_INVALID | 文件ID无效 | 400 |
| UPLOAD_KEY_INVALID | 存储Key无效 | 400 |
| UPLOAD_PERMISSION_DENIED | 无上传权限 | 403 |
| UPLOAD_FAILED | 上传失败 | 500 |

---

## 五、前端实现

### 5.1 文件上传 Hook

```typescript
// hooks/useFileUpload.ts
import { useState, useCallback } from 'react';

interface UploadOptions {
  /** 上传成功回调 */
  onSuccess?: (response: UploadCompleteResponse) => void;
  /** 上传失败回调 */
  onError?: (error: Error) => void;
  /** 上传进度回调 */
  onProgress?: (progress: number) => void;
}

interface UploadState {
  uploading: boolean;
  progress: number;
  error: Error | null;
}

interface UploadCompleteResponse {
  id: string;
  url: string;
  key: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

export function useFileUpload(options: UploadOptions = {}) {
  const [state, setState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
  });

  const upload = useCallback(
    async (file: File, metadata: Record<string, string>): Promise<UploadCompleteResponse | null> => {
      setState({ uploading: true, progress: 0, error: null });

      try {
        // 1. 获取预签名URL
        const presignedResponse = await fetch('/api/v1/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type,
            size: file.size,
            ...metadata,
          }),
        });

        const presignedData = await presignedResponse.json();
        if (!presignedData.success) {
          throw new Error(presignedData.error?.message || '获取上传URL失败');
        }

        // 2. 上传文件到S3
        const xhr = new XMLHttpRequest();

        await new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              setState((prev) => ({ ...prev, progress }));
              options.onProgress?.(progress);
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error('文件上传失败'));
            }
          });

          xhr.addEventListener('error', () => reject(new Error('网络错误')));

          xhr.open('PUT', presignedData.data.uploadUrl);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.send(file);
        });

        // 3. 通知服务器上传完成
        const completeResponse = await fetch('/api/v1/upload/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileId: presignedData.data.fileId,
            key: presignedData.data.key,
          }),
        });

        const completeData = await completeResponse.json();

        if (!completeData.success) {
          throw new Error(completeData.error?.message || '上传确认失败');
        }

        setState({ uploading: false, progress: 100, error: null });
        options.onSuccess?.(completeData.data);

        return completeData.data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('上传失败');
        setState({ uploading: false, progress: 0, error });
        options.onError?.(error);
        return null;
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setState({ uploading: false, progress: 0, error: null });
  }, []);

  return {
    ...state,
    upload,
    reset,
  };
}
```

### 5.2 文件选择组件

```typescript
// components/FileUploader.tsx
import React, { useCallback } from 'react';
import { useFileUpload } from '../hooks/useFileUpload';
import { fileValidator } from '../utils/file-validator';

interface FileUploaderProps {
  /** 业务类型 */
  businessType: string;
  /** 业务ID */
  businessId: string;
  /** 允许的文件类型 */
  accept?: string;
  /** 最大文件大小 */
  maxSize?: number;
  /** 多选模式 */
  multiple?: boolean;
  /** 上传成功回调 */
  onUpload?: (responses: UploadCompleteResponse[]) => void;
  /** 渲染子元素 */
  children: (props: {
    onSelect: (files: FileList | null) => void;
    uploading: boolean;
  }) => React.ReactNode;
}

export function FileUploader({
  businessType,
  businessId,
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024,
  multiple = false,
  onUpload,
  children,
}: FileUploaderProps) {
  const [uploads, setUploads] = useState<UploadCompleteResponse[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  const handleSelect = useCallback(
    async (files: FileList | null) => {
      if (!files) return;

      const fileArray = Array.from(files);
      const results: UploadCompleteResponse[] = [];
      const errors: string[] = [];

      for (const file of fileArray) {
        // 验证文件
        if (!fileValidator.validateMimeType(file.type)) {
          errors.push(`${file.name}: 不支持的文件类型`);
          continue;
        }

        if (file.size > maxSize) {
          errors.push(`${file.name}: 文件大小超出限制`);
          continue;
        }

        // 上传文件
        const result = await upload(file, {
          businessType,
          businessId,
        });

        if (result) {
          results.push(result);
        } else {
          errors.push(`${file.name}: 上传失败`);
        }
      }

      setUploads((prev) => [...prev, ...results]);
      setUploadErrors(errors);
      onUpload?.(results);
    },
    [businessType, businessId, maxSize, upload, onUpload]
  );

  return (
    <div className="file-uploader">
      {children({
        onSelect: (files) => handleSelect(files),
        uploading: uploads.some((u) => uploads.includes(u)),
      })}

      {uploadErrors.length > 0 && (
        <div className="upload-errors">
          {uploadErrors.map((error, index) => (
            <div key={index} className="upload-error">
              {error}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 六、测试用例

### 6.1 文件验证测试

| ID | 测试类型 | 测试描述 | 预期结果 | 优先级 |
|----|----------|----------|----------|--------|
| VAL-UT-01 | 单元测试 | 验证有效图片 | valid: true | P0 |
| VAL-UT-02 | 单元测试 | 验证有效PDF | valid: true | P0 |
| VAL-UT-03 | 单元测试 | 验证无效类型 | 返回错误 | P0 |
| VAL-UT-04 | 单元测试 | 验证超大小文件 | 返回错误 | P0 |
| VAL-UT-05 | 单元测试 | 验证扩展名 | 正确检测 | P1 |

### 6.2 预签名URL测试

| ID | 测试类型 | 测试描述 | 预期结果 | 优先级 |
|----|----------|----------|----------|--------|
| PRE-UT-01 | 单元测试 | 生成预签名URL | 包含有效签名 | P0 |
| PRE-UT-02 | 单元测试 | URL过期时间 | 正确设置 | P1 |
| PRE-UT-03 | 单元测试 | 文件Key格式 | 符合规范 | P1 |
| PRE-UT-04 | 集成测试 | 使用预签名上传 | 上传成功 | P1 |

### 6.3 图片处理测试

| ID | 测试类型 | 测试描述 | 预期结果 | 优先级 |
|----|----------|----------|----------|--------|
| IMG-UT-01 | 单元测试 | 获取图片尺寸 | 返回宽高 | P0 |
| IMG-UT-02 | 单元测试 | 生成缩略图 | 尺寸正确 | P0 |
| IMG-UT-03 | 单元测试 | 图片压缩 | 体积减小 | P1 |
| IMG-UT-04 | 集成测试 | 处理非图片 | 抛出错误 | P1 |

### 6.4 前端上传测试

| ID | 测试类型 | 测试描述 | 预期结果 | 优先级 |
|----|----------|----------|----------|--------|
| FE-UT-01 | 单元测试 | 文件选择事件 | 触发onSelect | P0 |
| FE-UT-02 | 单元测试 | 上传进度更新 | progress更新 | P0 |
| FE-UT-03 | 单元测试 | 上传成功回调 | 调用onSuccess | P0 |
| FE-UT-04 | 单元测试 | 上传错误处理 | 调用onError | P0 |

---

## 七、验收标准

- [x] 支持单文件和多文件上传
- [x] 支持图片、文档等常见文件类型
- [x] 文件大小限制正确生效
- [x] 使用预签名URL直接上传到S3
- [x] CDN加速文件访问
- [x] 支持图片压缩和缩略图生成
- [x] 上传进度实时显示
- [x] 错误提示清晰明确

---

## 八、风险分析

| 风险项 | 风险等级 | 影响范围 | 应对措施 |
|--------|----------|----------|----------|
| **恶意文件上传** | 高 | 安全性 | 严格MIME类型验证，病毒扫描 |
| **存储成本过高** | 中 | 运营成本 | 设置文件过期策略，压缩图片 |
| **上传超时** | 中 | 用户体验 | 使用分片上传，增大超时时间 |
| **CDN缓存失效** | 中 | 访问速度 | 合理设置缓存策略 |
| **预签名URL泄露** | 中 | 安全性 | 设置短有效期，限制IP |
| **大文件上传失败** | 中 | 用户体验 | 分片上传，断点续传 |
| **并发上传限制** | 低 | 系统性能 | 限制单用户并发数 |