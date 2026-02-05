---
title: 技术实现 - 邮件通知
category: tech-architecture
created: 2026-01-21
author: linus-torvalds
version: 1.0
phase: 2
priority: P0
status: complete
related_feature: ../../05-product-design/phase-2/feature-notifications.md
---

# 技术实现: 邮件通知

> **对应产品文档**: [feature-notifications.md](../../05-product-design/phase-2/feature-notifications.md) | **优先级**: P0 | **排期**: Phase 2 | **状态**: 待实现

---

## 一、技术架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         邮件通知架构                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [业务事件]                                                        │
│   ├── 用户注册                                                      │
│   ├── 课程更新                                                      │
│   ├── 预约通知                                                      │
│   └── 系统通知                                                      │
│         │                                                           │
│         ▼                                                           │
│   [SQS 队列]                                                        │
│   └── notification-queue                                            │
│         │                                                           │
│         ▼                                                           │
│   [Lambda: notification-worker]                                     │
│         │                                                           │
│         ├──▶ [SES: 邮件发送]                                        │
│         └──▶ [DynamoDB: notification-logs]                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 二、邮件模板

### 2.1 模板配置

```typescript
interface EmailTemplate {
  id: string;
  name: string;
  subject_zh: string;
  subject_en: string;
  body_zh: string;
  body_en: string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome',
    name: '欢迎注册',
    subject_zh: '欢迎加入 FindNZClass！',
    subject_en: 'Welcome to FindNZClass!',
    body_zh: '感谢您注册 FindNZClass...',
    body_en: 'Thank you for registering...'
  },
  {
    id: 'course-update',
    name: '课程更新通知',
    subject_zh: '您关注的课程有更新！',
    subject_en: 'Update on a course you follow!',
    body_zh: '您收藏的课程有新动态...',
    body_en: 'There is an update on a course...'
  }
];
```

---

## 三、API 设计

### 3.1 API 列表

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | /notifications/email | 发送邮件 |
| GET | /notifications/preferences | 获取通知偏好 |
| PUT | /notifications/preferences | 更新通知偏好 |

---

## 四、SQS 队列处理

```typescript
// SQS Message
interface NotificationMessage {
  type: 'email';
  template_id: string;
  to: string[];
  data: Record<string, any>;
  scheduled_at?: string;
}

// Lambda Handler
export async function handler(event: SQSEvent): Promise<void> {
  for (const record of event.Records) {
    const message: NotificationMessage = JSON.parse(record.body);
    
    if (message.type === 'email') {
      await sendEmail(message);
    }
  }
}

async function sendEmail(message: NotificationMessage): Promise<void> {
  const template = EMAIL_TEMPLATES.find(t => t.id === message.template_id);
  if (!template) return;
  
  const subject = renderTemplate(template.subject_zh, message.data);
  const body = renderTemplate(template.body_zh, message.data);
  
  await ses.sendEmail({
    Source: 'noreply@findclass.co.nz',
    Destination: { ToAddresses: message.to },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: body } }
    }
  });
}
```

---

## 六、测试用例

### 6.1 单元测试

```typescript
// src/modules/notifications/notifications.service.test.ts
import { notificationService } from './notifications.service';
import { mockPutItem, mockQueryItems } from '../../test/mocks';

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('NT-HP-01: should send email successfully', async () => {
      // Given
      const dto = {
        templateId: 'welcome',
        to: ['test@example.com'],
        data: { name: '张三' },
      };

      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await notificationService.sendEmail(dto);

      // Then
      expect(result.success).toBe(true);
      expect(putItem).toHaveBeenCalled();
    });

    it('NT-FC-01: should handle invalid template', async () => {
      // When & Then
      await expect(notificationService.sendEmail({
        templateId: 'invalid',
        to: ['test@example.com'],
        data: {},
      })).rejects.toThrow('模板不存在');
    });
  });

  describe('updatePreferences', () => {
    it('NT-HP-02: should update notification preferences', async () => {
      // Given
      const userId = 'user-123';
      const preferences = {
        emailEnabled: true,
        smsEnabled: false,
        marketingEnabled: false,
      };

      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await notificationService.updatePreferences(userId, preferences);

      // Then
      expect(result).toBeDefined();
    });
  });
});
```

### 6.2 集成测试用例

> **测试文档**: `06-tech-architecture/growth/story-notifications.md` 中的 US33

```typescript
// tests/integration/notifications/us33-notifications.test.ts

describe('US33: 消息通知', () => {
  beforeAll(async () => {
    await startTestContainers();
    await createTestTable();
  }, 120000);

  it('US33-HP-01: should send notification successfully', async () => {
    const response = await request(app)
      .post('/api/v1/notifications/email')
      .send({
        templateId: 'welcome',
        to: ['test@example.com'],
        data: { name: 'Test User' },
      })
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

---

## 七、风险分析

- [ ] 邮件发送成功
- [ ] 支持多种邮件模板
- [ ] 支持邮件偏好设置
- [ ] 邮件发送有日志记录
- [ ] 支持异步发送

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/phase-2/tech-notifications.md`

**相关文档**:
- [产品设计](../../05-product-design/phase-2/feature-notifications.md)
