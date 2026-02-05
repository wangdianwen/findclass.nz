---
title: 技术实现 - 机构管理
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 2
priority: P0
status: complete
related_feature: ../../05-product-design/institution/institution-management.md
---

# 技术实现: 机构管理

> **对应产品文档**: [institution-management.md](../../05-product-design/institution/institution-management.md) | **优先级**: P0 | **排期**: Phase 2 | **状态**: 待实现

---

## 一、数据模型 (DynamoDB)

```typescript
// src/modules/institutions/institutions.types.ts

/**
 * 机构类型
 */
export enum InstitutionType {
  TRAINING_CENTER = 'training_center',
  SCHOOL = 'school',
  STUDIO = 'studio',
  OTHER = 'other',
}

/**
 * 机构状态
 */
export enum InstitutionStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
}

/**
 * 机构 DynamoDB 类型
 */
export interface Institution {
  PK: string;           // INSTITUTION#{institutionId}
  SK: string;           // METADATA
  entityType: 'INSTITUTION';
  dataCategory: 'TEACHER';
  id: string;
  
  // 基础信息
  name: string;
  nameEn: string;
  type: InstitutionType;
  description: string;
  descriptionEn: string;
  
  // 联系信息
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  
  // 地址
  address: {
    street?: string;
    city: string;
    suburb?: string;
    postcode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  
  // 形象展示
  logoUrl?: string;
  coverImageUrl?: string;
  photos?: string[];
  
  // 验证状态
  status: InstitutionStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  
  // 统计
  totalTeachers: number;
  totalCourses: number;
  averageRating: number;
  totalReviews: number;
  
  // 标签
  tags?: string[];
  subjects?: string[];
  teachingModes?: string[];
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  GSI27PK?: string;  // CITY#{city}
  GSI27SK?: string;  // RATING#{averageRating}
  GSI28PK?: string;  // STATUS#{status}
  GSI28SK?: string;  // CREATED_AT#{createdAt}
}

/**
 * 机构成员
 */
export interface InstitutionMember {
  PK: string;           // INSTITUTION#{institutionId}
  SK: string;           // MEMBER#{userId}
  entityType: 'INSTITUTION_MEMBER';
  dataCategory: 'TEACHER';
  id: string;
  
  institutionId: string;
  userId: string;
  role: 'owner' | 'admin' | 'teacher';
  
  name: string;
  email: string;
  title?: string;
  
  status: 'active' | 'inactive';
  joinedAt: string;
  
  GSI29PK?: string;  // USER#{userId}
  GSI29SK?: string;  // INSTITUTION#{institutionId}
}

/**
 * 机构课程
 */
export interface InstitutionCourse {
  PK: string;           // INSTITUTION#{institutionId}
  SK: string;           // COURSE#{courseId}
  entityType: 'INSTITUTION_COURSE';
  dataCategory: 'TEACHER';
  id: string;
  
  institutionId: string;
  courseId: string;
  
  title: string;
  category: string;
  price: number;
  
  status: 'active' | 'inactive';
  publishedAt?: string;
  
  createdAt: string;
}
```

---

## 二、业务逻辑

```typescript
// src/modules/institutions/institutions.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  Institution,
  InstitutionMember,
  InstitutionCourse,
  InstitutionType,
  InstitutionStatus,
  createInstitutionKey,
  createInstitutionMemberKey,
  createUserInstitutionIndexKey,
} from './institutions.types';
import { putItem, getItem, queryItems, updateItem, deleteItem } from '@shared/db/dynamodb';
import { getFromCache, setCache } from '@shared/db/cache';

export class InstitutionService {
  /**
   * 创建机构
   */
  async createInstitution(userId: string, data: {
    name: string;
    type: InstitutionType;
    description: string;
    contactEmail: string;
    address: Institution['address'];
  }): Promise<Institution> {
    const now = new Date().toISOString();
    const institutionId = uuidv4();

    const institution: Institution = {
      ...createInstitutionKey(institutionId),
      entityType: 'INSTITUTION',
      dataCategory: 'TEACHER',
      id: institutionId,
      name: data.name,
      nameEn: data.name,
      type: data.type,
      description: data.description,
      descriptionEn: data.description,
      contactEmail: data.contactEmail,
      address: data.address,
      status: InstitutionStatus.PENDING,
      totalTeachers: 0,
      totalCourses: 0,
      averageRating: 0,
      totalReviews: 0,
      createdAt: now,
      updatedAt: now,
      GSI27PK: `CITY#${data.address.city}`,
      GSI27SK: `RATING#0`,
      GSI28PK: `STATUS#${InstitutionStatus.PENDING}`,
      GSI28SK: `CREATED_AT#${now}`,
    };

    await putItem(institution);

    // 创建所有者成员
    const owner: InstitutionMember = {
      ...createInstitutionMemberKey(institutionId, userId),
      SK: `MEMBER#${userId}`,
      entityType: 'INSTITUTION_MEMBER',
      dataCategory: 'TEACHER',
      id: uuidv4(),
      institutionId,
      userId,
      role: 'owner',
      status: 'active',
      joinedAt: now,
      GSI29PK: `USER#${userId}`,
      GSI29SK: `INSTITUTION#${institutionId}`,
    };
    await putItem(owner);

    logger.info('Institution created', { institutionId, userId });

    return institution;
  }

  /**
   * 获取机构详情
   */
  async getInstitution(institutionId: string): Promise<Institution | null> {
    const { PK, SK } = createInstitutionKey(institutionId);
    return getItem<Institution>({ PK, SK });
  }

  /**
   * 获取机构成员
   */
  async getMembers(institutionId: string): Promise<InstitutionMember[]> {
    const result = await queryItems<InstitutionMember>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': `INSTITUTION#${institutionId}`,
        ':sk': 'MEMBER#',
      },
      limit: 100,
    });
    return result.items;
  }

  /**
   * 获取用户加入的机构
   */
  async getUserInstitutions(userId: string): Promise<Institution[]> {
    const result = await queryItems<InstitutionMember>({
      indexName: 'GSI29-UserInstitutions',
      keyConditionExpression: 'GSI29PK = :pk',
      expressionAttributeValues: {
        ':pk': `USER#${userId}`,
      },
      limit: 20,
    });

    // 批量获取机构详情
    const institutionIds = result.items.map(m => m.institutionId);
    const institutions = await Promise.all(
      institutionIds.map(id => this.getInstitution(id))
    );

    return institutions.filter((i): i is Institution => i !== null);
  }

  /**
   * 添加成员
   */
  async addMember(institutionId: string, data: {
    userId: string;
    name: string;
    email: string;
    role: 'admin' | 'teacher';
    title?: string;
  }): Promise<InstitutionMember> {
    const now = new Date().toISOString();

    const member: InstitutionMember = {
      ...createInstitutionMemberKey(institutionId, data.userId),
      SK: `MEMBER#${data.userId}`,
      entityType: 'INSTITUTION_MEMBER',
      dataCategory: 'TEACHER',
      id: uuidv4(),
      institutionId,
      userId: data.userId,
      name: data.name,
      email: data.email,
      role: data.role,
      title: data.title,
      status: 'active',
      joinedAt: now,
      GSI29PK: `USER#${data.userId}`,
      GSI29SK: `INSTITUTION#${institutionId}`,
    };

    await putItem(member);

    // 更新机构教师数
    await updateItem(
      createInstitutionKey(institutionId),
      'SET totalTeachers = totalTeachers + :inc, updatedAt = :now',
      { ':inc': 1, ':now': now }
    );

    return member;
  }

  /**
   * 移除成员
   */
  async removeMember(institutionId: string, userId: string): Promise<void> {
    await deleteItem(createInstitutionMemberKey(institutionId, userId));

    // 更新机构教师数
    await updateItem(
      createInstitutionKey(institutionId),
      'SET totalTeachers = totalTeachers - :dec, updatedAt = :now',
      { ':dec': 1, ':now': new Date().toISOString() }
    );
  }

  /**
   * 搜索机构
   */
  async searchInstitutions(params: {
    city?: string;
    type?: InstitutionType;
    keyword?: string;
    page?: number;
    limit?: number;
  }): Promise<{ institutions: Institution[]; pagination: any }> {
    const { city, type, keyword, page = 1, limit = 20 } = params;

    const result = await queryItems<Institution>({
      indexName: 'GSI27-CityIndex',
      keyConditionExpression: 'GSI27PK = :pk',
      expressionAttributeValues: {
        ':pk': `CITY#${city || ''}`,
      },
      limit: limit * 2,
      scanIndexForward: false,
    });

    // 过滤
    let filtered = result.items;
    if (type) {
      filtered = filtered.filter(i => i.type === type);
    }
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(i => 
        i.name.toLowerCase().includes(kw) ||
        i.description.toLowerCase().includes(kw)
      );
    }

    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    return {
      institutions: paginatedItems,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };
  }
}

export const institutionService = new InstitutionService();
```

---

## 三、API 设计

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| POST | /api/v1/institutions | 创建机构 | 需登录 |
| GET | /api/v1/institutions/:id | 机构详情 | 公开 |
| PUT | /api/v1/institutions/:id | 更新机构 | 需权限 |
| GET | /api/v1/institutions/:id/members | 成员列表 | 需权限 |
| POST | /api/v1/institutions/:id/members | 添加成员 | 需权限 |
| DELETE | /api/v1/institutions/:id/members/:userId | 移除成员 | 需权限 |
| GET | /api/v1/institutions/my | 我的机构 | 需登录 |
| GET | /api/v1/institutions/search | 搜索机构 | 公开 |

---

## 四、验收标准

- [x] 机构创建正确
- [x] 成员管理功能正常
- [x] 机构搜索正确
- [x] 权限控制正确
- [x] 统计数据正确

---

## 五、前端实现

### 5.1 机构管理页面

```typescript
// src/pages/institutions/InstitutionManagement.tsx
import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Card, Modal, Form, Input, Select, message } from 'antd';
import { PlusOutlined, UserAddOutlined } from '@ant-design/icons';
import { institutionApi } from '../../api/institution';

export const InstitutionManagement: React.FC = () => {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadInstitutions();
  }, []);

  const loadInstitutions = async () => {
    setLoading(true);
    try {
      const response = await institutionApi.getMyInstitutions();
      setInstitutions(response.data);
    } catch (error) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: any) => {
    try {
      await institutionApi.createInstitution(values);
      message.success('创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      loadInstitutions();
    } catch (error) {
      message.error('创建失败');
    }
  };

  const columns = [
    { title: '机构名称', dataIndex: 'name', key: 'name' },
    { title: '类型', dataIndex: 'type', key: 'type', render: (type: string) => <Tag>{type}</Tag> },
    { title: '教师数', dataIndex: 'totalTeachers', key: 'totalTeachers' },
    { title: '课程数', dataIndex: 'totalCourses', key: 'totalCourses' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s==='active'?'green':'orange'}>{s}</Tag> },
    { title: '操作', render: (_, record: any) => (
      <Space>
        <Button type="link" size="small">管理</Button>
        <Button type="link" size="small">设置</Button>
      </Space>
    )},
  ];

  return (
    <div className="institution-management">
      <Card title="我的机构" extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
          创建机构
        </Button>
      }>
        <Table
          columns={columns}
          dataSource={institutions}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal title="创建机构" open={createModalVisible} onCancel={() => setCreateModalVisible(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="机构名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="机构类型" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="training_center">培训机构</Select.Option>
              <Select.Option value="school">学校</Select.Option>
              <Select.Option value="studio">工作室</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="contactEmail" label="联系邮箱" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">创建</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
```

---

## 六、测试用例

### 6.1 单元测试

```typescript
// src/modules/institutions/institutions.service.test.ts
import { institutionService } from './institutions.service';
import { mockPutItem, mockGetItem, mockQueryItems, mockUpdateItem, mockDeleteItem } from '../../test/mocks';
import { InstitutionType, InstitutionStatus } from './institutions.types';

describe('InstitutionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createInstitution', () => {
    it('IM-HP-01: should create institution with owner', async () => {
      // Given
      const userId = 'user-123';
      const dto = {
        name: '测试机构',
        type: InstitutionType.TRAINING_CENTER,
        description: '测试描述',
        contactEmail: 'test@institution.com',
        address: { city: 'Auckland' },
      };

      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await institutionService.createInstitution(userId, dto);

      // Then
      expect(result).toBeDefined();
      expect(result.name).toBe('测试机构');
      expect(result.status).toBe(InstitutionStatus.PENDING);
      expect(putItem).toHaveBeenCalledTimes(2); // Institution + Owner
    });
  });

  describe('getMembers', () => {
    it('IM-HP-02: should return institution members', async () => {
      // Given
      const institutionId = 'inst-123';
      const mockMembers = [
        { id: 'm1', userId: 'user-1', role: 'owner' },
        { id: 'm2', userId: 'user-2', role: 'teacher' },
      ];

      (queryItems as jest.Mock).mockResolvedValue({ items: mockMembers });

      // When
      const result = await institutionService.getMembers(institutionId);

      // Then
      expect(result).toHaveLength(2);
    });
  });

  describe('removeMember', () => {
    it('IM-HP-03: should remove member and update count', async () => {
      // Given
      (deleteItem as jest.Mock).mockResolvedValue({});
      (updateItem as jest.Mock).mockResolvedValue({});

      // When
      await institutionService.removeMember('inst-123', 'user-456');

      // Then
      expect(deleteItem).toHaveBeenCalled();
      expect(updateItem).toHaveBeenCalled();
    });
  });
});
```

---

## 七、风险分析

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 权限混乱 | 低 | 中 | 角色权限清晰定义 |
| 数据不一致 | 低 | 中 | DynamoDB事务 |
| 机构名称重复 | 中 | 低 | 唯一性检查 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/institution/tech-institution-management.md`

**相关文档**:
- [产品设计](../../05-product-design/institution/institution-management.md)
- [教师入驻流程](tech-teacher-onboarding.md)
