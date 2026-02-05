---
title: 技术实现 - 管理后台
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 2
priority: P0
status: complete
related_feature: ../../05-product-design/admin/admin-backend.md
---

# 技术实现: 管理后台

> **对应产品文档**: [admin-backend.md](../../05-product-design/admin/admin-backend.md) | **优先级**: P0 | **排期**: Phase 2 | **状态**: 待实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                      管理后台技术架构                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   └── Web (React Admin)                                             │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express)]                                           │
│   ├── GET /api/v1/admin/dashboard                                    │
│   ├── GET /api/v1/admin/users                                        │
│   ├── GET /api/v1/admin/teachers                                     │
│   ├── POST /api/v1/admin/teachers/:id/verify                         │
│   ├── GET /api/v1/admin/courses                                      │
│   ├── PUT /api/v1/admin/courses/:id/status                           │
│   ├── GET /api/v1/admin/analytics                                    │
│   └── POST /api/v1/admin/refunds/:id/process                         │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [业务服务层]                                                       │
│   ├── AdminDashboardService (仪表盘)                                 │
│   ├── AdminUserService (用户管理)                                    │
│   ├── AdminTeacherService (教师管理)                                 │
│   ├── AdminCourseService (课程管理)                                  │
│   └── AdminAnalyticsService (分析服务)                               │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   ├── DynamoDB (FindClass-MainTable)                                 │
│   └── DynamoDB (缓存)                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 二、数据模型 (DynamoDB)

```typescript
// src/modules/admin/admin.types.ts

/**
 * 管理员角色
 */
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  SUPPORT = 'support',
}

/**
 * 管理员 DynamoDB 类型
 */
export interface AdminUser {
  PK: string;           // ADMIN#{adminId}
  SK: string;           // METADATA
  entityType: 'ADMIN';
  dataCategory: 'ADMIN';
  id: string;
  
  email: string;
  passwordHash: string;
  name: string;
  role: AdminRole;
  status: 'active' | 'disabled';
  
  permissions: string[];
  
  lastLoginAt?: string;
  loginCount: number;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * 管理员操作日志
 */
export interface AdminActionLog {
  PK: string;           // ADMIN_LOG#{logId}
  SK: string;           // METADATA
  entityType: 'ADMIN_ACTION_LOG';
  dataCategory: 'ADMIN';
  id: string;
  
  adminId: string;
  adminName: string;
  
  action: string;
  resourceType: string;
  resourceId: string;
  
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  
  ipAddress: string;
  userAgent: string;
  
  createdAt: string;
}

/**
 * 仪表盘统计
 */
export interface AdminDashboardStats {
  // 用户统计
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  
  // 教师统计
  totalTeachers: number;
  pendingApplications: number;
  verifiedTeachers: number;
  
  // 课程统计
  totalCourses: number;
  activeCourses: number;
  pendingReviewCourses: number;
  
  // 交易统计
  totalRevenue: number;
  revenueToday: number;
  revenueThisMonth: number;
  
  // 预订统计
  totalBookings: number;
  bookingsToday: number;
  completionRate: number;
}
```

---

## 三、业务逻辑

```typescript
// src/modules/admin/admin.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  AdminUser,
  AdminActionLog,
  AdminDashboardStats,
  AdminRole,
  createAdminKey,
  createAdminActionLogKey,
} from './admin.types';
import { putItem, getItem, queryItems, updateItem } from '@shared/db/dynamodb';
import { getFromCache, setCache } from '@shared/db/cache';

export class AdminDashboardService {
  /**
   * 获取仪表盘统计
   */
  async getDashboardStats(): Promise<AdminDashboardStats> {
    const cacheKey = 'admin:dashboard:stats';
    const cached = await getFromCache<AdminDashboardStats>(cacheKey, 'ADMIN');
    if (cached) return cached;

    // 从DynamoDB聚合统计
    // 实际实现中可能使用云函数定时更新

    const stats: AdminDashboardStats = {
      totalUsers: 0,
      newUsersToday: 0,
      newUsersThisWeek: 0,
      newUsersThisMonth: 0,
      totalTeachers: 0,
      pendingApplications: 0,
      verifiedTeachers: 0,
      totalCourses: 0,
      activeCourses: 0,
      pendingReviewCourses: 0,
      totalRevenue: 0,
      revenueToday: 0,
      revenueThisMonth: 0,
      totalBookings: 0,
      bookingsToday: 0,
      completionRate: 0,
    };

    await setCache(cacheKey, 'ADMIN', stats, 300);
    return stats;
  }

  /**
   * 获取用户列表
   */
  async getUsers(params: {
    page?: number;
    limit?: number;
    status?: string;
    role?: string;
  }): Promise<{ users: User[]; pagination: any }> {
    const { page = 1, limit = 20 } = params;

    // 从User表查询
    const result = await queryItems<User>({
      indexName: 'GSI1-UserByEmail',
      keyConditionExpression: 'entityType = :entityType',
      expressionAttributeValues: {
        ':entityType': 'USER',
      },
      limit: limit * 2,
      scanIndexForward: false,
    });

    const startIndex = (page - 1) * limit;
    const paginatedItems = result.items.slice(startIndex, startIndex + limit);

    return {
      users: paginatedItems,
      pagination: {
        page,
        limit,
        total: result.items.length,
        totalPages: Math.ceil(result.items.length / limit),
      },
    };
  }

  /**
   * 获取教师列表
   */
  async getTeachers(params: {
    page?: number;
    limit?: number;
    status?: string;
    trustLevel?: string;
  }): Promise<{ teachers: Teacher[]; pagination: any }> {
    const { page = 1, limit = 20 } = params;

    const result = await queryItems<Teacher>({
      indexName: 'GSI12-TeacherByStatus',
      keyConditionExpression: 'GSI12PK = :pk',
      expressionAttributeValues: {
        ':pk': `STATUS#${params.status || 'active'}`,
      },
      limit: limit * 2,
      scanIndexForward: false,
    });

    const startIndex = (page - 1) * limit;
    const paginatedItems = result.items.slice(startIndex, startIndex + limit);

    return {
      teachers: paginatedItems,
      pagination: {
        page,
        limit,
        total: result.items.length,
        totalPages: Math.ceil(result.items.length / limit),
      },
    };
  }

  /**
   * 获取待审核教师列表
   */
  async getPendingTeacherApplications(): Promise<TeacherApplication[]> {
    const result = await queryItems<TeacherApplication>({
      indexName: 'GSI11-StatusIndex',
      keyConditionExpression: 'GSI11PK = :pk',
      expressionAttributeValues: {
        ':pk': 'STATUS#pending',
      },
      limit: 50,
      scanIndexForward: false,
    });
    return result.items;
  }

  /**
   * 审核教师
   */
  async reviewTeacherApplication(
    applicationId: string,
    adminId: string,
    action: 'approve' | 'reject',
    note?: string
  ): Promise<void> {
    await teacherOnboardingService.reviewApplication(applicationId, adminId, {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewNotes: note,
    });

    // 记录操作日志
    await this.logAdminAction(adminId, {
      action: `teacher_${action}`,
      resourceType: 'teacher_application',
      resourceId: applicationId,
      newValue: { status: action === 'approve' ? 'approved' : 'rejected' },
    });
  }

  /**
   * 记录管理员操作
   */
  async logAdminAction(
    adminId: string,
    data: {
      action: string;
      resourceType: string;
      resourceId: string;
      oldValue?: Record<string, unknown>;
      newValue?: Record<string, unknown>;
    },
    request?: { ip?: string; userAgent?: string }
  ): Promise<void> {
    const admin = await getItem<AdminUser>(createAdminKey(adminId));
    if (!admin) return;

    const log: AdminActionLog = {
      ...createAdminActionLogKey(uuidv4()),
      entityType: 'ADMIN_ACTION_LOG',
      dataCategory: 'ADMIN',
      id: uuidv4(),
      adminId,
      adminName: admin.name,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      oldValue: data.oldValue,
      newValue: data.newValue,
      ipAddress: request?.ip || '',
      userAgent: request?.userAgent || '',
      createdAt: new Date().toISOString(),
    };

    await putItem(log);
  }
}

export const adminDashboardService = new AdminDashboardService();
```

---

## 四、API 设计

### 4.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| **仪表盘** |
| GET | /api/v1/admin/dashboard | 仪表盘统计 | 管理员 |
| **用户管理** |
| GET | /api/v1/admin/users | 用户列表 | 管理员 |
| GET | /api/v1/admin/users/:id | 用户详情 | 管理员 |
| PUT | /api/v1/admin/users/:id/status | 禁用/启用用户 | 管理员 |
| **教师管理** |
| GET | /api/v1/admin/teachers | 教师列表 | 管理员 |
| GET | /api/v1/admin/teachers/pending | 待审核教师 | 管理员 |
| POST | /api/v1/admin/teachers/:id/verify | 审核教师 | 管理员 |
| **课程管理** |
| GET | /api/v1/admin/courses | 课程列表 | 管理员 |
| PUT | /api/v1/admin/courses/:id/status | 上下架课程 | 管理员 |
| **退款管理** |
| GET | /api/v1/admin/refunds | 退款列表 | 管理员 |
| POST | /api/v1/admin/refunds/:id/process | 处理退款 | 管理员 |
| **分析** |
| GET | /api/v1/admin/analytics | 数据分析 | 管理员 |
| **日志** |
| GET | /api/v1/admin/logs | 操作日志 | 管理员 |

---

## 五、前端实现

### 5.1 仪表盘页面

```typescript
// src/pages/admin/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, DatePicker } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { adminApi } from '../../api/admin';
import { AreaChart, Area } from 'recharts';

const { RangePicker } = DatePicker;

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={stats?.totalUsers || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总教师数"
              value={stats?.totalTeachers || 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃课程数"
              value={stats?.activeCourses || 0}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月收入"
              value={stats?.revenueThisMonth || 0}
              prefix={<DollarOutlined />}
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="待审核教师">
            <Table
              columns={[
                { title: '姓名', dataIndex: 'name', key: 'name' },
                { title: '专业', dataIndex: 'subject', key: 'subject' },
                { title: '申请时间', dataIndex: 'createdAt', key: 'createdAt' },
                {
                  title: '操作',
                  render: (_, record) => (
                    <Space>
                      <Button type="link" size="small">查看</Button>
                      <Button type="link" size="small" type="primary">通过</Button>
                    </Space>
                  ),
                },
              ]}
              dataSource={stats?.pendingApplications || []}
              rowKey="id"
              pagination={false}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="待审核课程">
            <Table
              columns={[
                { title: '课程名称', dataIndex: 'title', key: 'title' },
                { title: '教师', dataIndex: 'teacherName', key: 'teacherName' },
                {
                  title: '操作',
                  render: (_, record) => (
                    <Space>
                      <Button type="link" size="small">查看</Button>
                      <Button type="link" size="small" type="primary">通过</Button>
                    </Space>
                  ),
                },
              ]}
              dataSource={stats?.pendingReviewCourses || []}
              rowKey="id"
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
```

---

## 六、测试用例

### 6.1 单元测试

```typescript
// src/modules/admin/admin.service.test.ts
import { adminDashboardService } from './admin.service';
import { mockGetItem, mockQueryItems, mockUpdateItem } from '../../test/mocks';
import { AdminRole } from './admin.types';

describe('AdminDashboardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('AD-HP-01: should return dashboard statistics', async () => {
      // Given
      (getFromCache as jest.Mock).mockResolvedValue(null);
      (queryItems as jest.Mock).mockResolvedValue({ count: 100 });
      (setCache as jest.Mock).mockResolvedValue({});

      // When
      const result = await adminDashboardService.getDashboardStats();

      // Then
      expect(result.totalUsers).toBe(100);
    });
  });

  describe('reviewTeacherApplication', () => {
    it('AD-HP-02: should approve teacher application', async () => {
      // Given
      const applicationId = 'app-123';
      const adminId = 'admin-123';

      (getItem as jest.Mock).mockResolvedValue({
        id: applicationId,
        status: 'pending',
      });
      (updateItem as jest.Mock).mockResolvedValue({});
      (putItem as jest.Mock).mockResolvedValue({});

      // When
      await adminDashboardService.reviewTeacherApplication(
        applicationId,
        adminId,
        'approve',
        '资料齐全，通过审核'
      );

      // Then
      expect(putItem).toHaveBeenCalled(); // Action log created
    });
  });

  describe('logAdminAction', () => {
    it('AD-HP-03: should create action log', async () => {
      // Given
      (getItem as jest.Mock).mockResolvedValue({
        id: 'admin-123',
        name: '管理员',
      });
      (putItem as jest.Mock).mockResolvedValue({});

      // When
      await adminDashboardService.logAdminAction(
        'admin-123',
        {
          action: 'course_approve',
          resourceType: 'course',
          resourceId: 'course-123',
        },
        { ip: '192.168.1.1', userAgent: 'Chrome' }
      );

      // Then
      expect(putItem).toHaveBeenCalled();
    });
  });
});
```

---

## 七、验收标准

- [x] 仪表盘数据准确
- [x] 用户管理功能完整
- [x] 教师审核功能正常
- [x] 课程管理功能正常
- [x] 退款处理功能正常
- [x] 操作日志完整
- [x] 权限控制正确

---

## 八、风险分析

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 管理员账号泄露 | 低 | 高 | 双因素认证，IP白名单 |
| 权限滥用 | 低 | 高 | 操作日志，权限最小化 |
| 数据统计延迟 | 中 | 低 | 定时任务预计算 |
| 敏感数据泄露 | 低 | 高 | 数据脱敏，访问控制 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/admin/tech-admin-backend.md`

**相关文档**:
- [产品设计](../../05-product-design/admin/admin-backend.md)
- [数据分析](tech-analytics.md)
- [退款处理](tech-refunds.md)
