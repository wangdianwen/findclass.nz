# 技术文档编写指南

> **本文档说明**: 如何创建、修改和维护`06-tech-architecture/`目录下的技术架构文档。

---

## 一、文档类型

### 1.1 技术架构文档 (`tech-*.md`)

主要的技术实现文档，包含完整的架构设计、数据模型、业务逻辑和测试用例。

**位置**: `06-tech-architecture/{module}/tech-{feature}.md`

**示例**:
- `user/tech-user-registration.md` - 用户注册技术实现
- `course/tech-course-detail.md` - 课程详情技术实现

### 1.2 用户故事文档 (`story-*.md`)

对应用户故事(US)的测试规范，用于集成测试。

**位置**: `06-tech-architecture/{module}/story-{feature}.md`

**示例**:
- `auth/story-auth.md` - 认证用户故事测试
- `ads/story-ads.md` - 广告用户故事测试

---

## 二、创建新文档流程

### 2.1 第一步: 创建文件模板

```markdown
---
title: 技术实现 - 功能名称
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 1
priority: P0
status: pending-implementation
related_feature: ../../05-product-design/{module}/feature-name.md
---

# 技术实现: 功能名称

> **对应产品文档**: [feature-name.md](../../05-product-design/{module}/feature-name.md) | **优先级**: P0 | **排期**: Phase 1 | **状态**: 待实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                      模块技术架构                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   ├── Web (React)                                                   │
│   └── 微信小程序 (Taro)                                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express)]                                           │
│   ├── GET /api/v1/...                                               │
│   └── POST /api/v1/...                                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [业务服务层]                                                       │
│   └── ServiceName (服务类)                                           │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   └── DynamoDB (FindClass-MainTable)                                │
│       ├── ENTITY#{id}                                               │
│       └── ...                                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
07-backend/src/modules/{module}/
├── {module}.types.ts        # 类型定义
├── {module}.service.ts      # 业务逻辑
├── {module}.controller.ts   # API 控制器
├── {module}.routes.ts       # 路由配置
└── {module}.test.ts         # 测试文件

06-frontend/src/pages/{module}/
└── FeaturePage.tsx          # 页面组件
```

---

## 二、数据模型设计

### 2.1 定义TypeScript接口

```typescript
// src/modules/{module}/{module}.types.ts

/**
 * 实体状态
 */
export enum EntityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

/**
 * 实体 DynamoDB 类型
 */
export interface EntityName {
  // DynamoDB 主键
  PK: string;           // ENTITY#{entityId}
  SK: string;           // METADATA

  // 实体类型标识
  entityType: 'ENTITY_NAME';
  dataCategory: '{CATEGORY}';
  id: string;

  // 业务字段
  name: string;
  description?: string;
  status: EntityStatus;

  // 统计字段
  count?: number;
  rating?: number;

  // 时间戳
  createdAt: string;
  updatedAt: string;

  // GSI 索引
  GSI1PK?: string;      // INDEX#{value}
  GSI1SK?: string;      // METADATA
}
```

### 2.2 键生成函数

```typescript
import { createEntityKey } from '@shared/db/dynamodb';

/**
 * 生成实体主键
 */
export function createEntityKey(entityId: string): { PK: string; SK: string } {
  return {
    PK: `ENTITY#${entityId}`,
    SK: 'METADATA',
  };
}

/**
 * 生成索引键
 */
export function createEntityIndexKey(value: string): { PK: string; SK: string } {
  return {
    PK: `INDEX#${value}`,
    SK: 'METADATA',
  };
}
```

---

## 三、业务逻辑实现

### 3.1 服务类模板

```typescript
// src/modules/{module}/{module}.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  EntityName,
  EntityStatus,
  createEntityKey,
  createEntityIndexKey,
} from './{module}.types';
import { putItem, getItem, queryItems, updateItem, deleteItem } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache, CacheKeys } from '@shared/db/cache';

export class {Module}Service {
  /**
   * 创建实体
   */
  async createEntity(data: {
    name: string;
    description?: string;
  }): Promise<EntityName> {
    const now = new Date().toISOString();
    const entityId = uuidv4();

    const entity: EntityName = {
      ...createEntityKey(entityId),
      entityType: 'ENTITY_NAME',
      dataCategory: '{CATEGORY}',
      id: entityId,
      name: data.name,
      description: data.description,
      status: EntityStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      GSI1PK: `NAME#${data.name}`,
      GSI1SK: 'METADATA',
    };

    await putItem(entity);
    logger.info('Entity created', { entityId });

    return entity;
  }

  /**
   * 获取实体
   */
  async getEntity(entityId: string): Promise<EntityName | null> {
    const { PK, SK } = createEntityKey(entityId);
    return getItem<EntityName>({ PK, SK });
  }

  /**
   * 更新实体
   */
  async updateEntity(
    entityId: string,
    data: Partial<EntityName>
  ): Promise<EntityName> {
    const now = new Date().toISOString();
    const updated = await updateItem(
      createEntityKey(entityId),
      'SET #name = :name, updatedAt = :now',
      {
        ':name': data.name,
        ':now': now,
      }
    ) as EntityName;

    await deleteCache(CacheKeys.entity(entityId), '{CATEGORY}');
    return updated;
  }

  /**
   * 列表查询
   */
  async listEntities(options: {
    indexName?: string;
    keyConditionExpression: string;
    expressionAttributeValues: Record<string, unknown>;
    limit?: number;
  }): Promise<EntityName[]> {
    const result = await queryItems<EntityName>(options);
    return result.items;
  }
}

export const {module}Service = new {Module}Service();
```

---

## 四、API设计

### 4.1 API列表表格

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| GET | /api/v1/{module} | 获取列表 | 需认证 |
| POST | /api/v1/{module} | 创建实体 | 需认证 |
| GET | /api/v1/{module}/:id | 获取详情 | 公开 |
| PUT | /api/v1/{module}/:id | 更新实体 | 需认证 |
| DELETE | /api/v1/{module}/:id | 删除实体 | 需认证 |

### 4.2 API响应示例

```json
{
  "success": true,
  "data": {
    "id": "entity-123",
    "name": "实体名称",
    "status": "active",
    "createdAt": "2026-01-26T10:00:00Z"
  }
}
```

---

## 五、测试用例

### 5.1 单元测试模板

```typescript
// src/modules/{module}/{module}.service.test.ts
import { {module}Service } from './{module}.service';
import { mockPutItem, mockGetItem, mockQueryItems, mockUpdateItem } from '../../test/mocks';
import { EntityStatus } from './{module}.types';

describe('{Module}Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEntity', () => {
    it('{TEST_ID}: should create entity successfully', async () => {
      // Given
      const dto = {
        name: '测试实体',
        description: '测试描述',
      };

      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await {module}Service.createEntity(dto);

      // Then
      expect(result).toBeDefined();
      expect(result.name).toBe('测试实体');
      expect(result.status).toBe(EntityStatus.ACTIVE);
    });

    it('{TEST_ID}-FC-001: should handle errors', async () => {
      // Given
      (putItem as jest.Mock).mockRejectedValue(new Error('DB Error'));

      // When & Then
      await expect({module}Service.createEntity({ name: 'test' }))
        .rejects.toThrow('DB Error');
    });
  });
});
```

### 5.2 测试ID命名规则

```
{US}-{TYPE}-{NNN}
```

- **US**: 用户故事编号 (如US1, US22)
- **TYPE**: 测试类型
  - `HP`: Happy Path (正常流程)
  - `FC`: Failed Cases (失败场景)
  - `EC`: Edge Cases (边界情况)
- **NNN**: 序号 (001, 002, ...)

**示例**:
- `US1-HP-001` - US1正常流程第一个测试
- `US1-FC-001` - US1失败场景第一个测试
- `US1-EC-001` - US1边界情况第一个测试

---

## 六、完整文档检查清单

### 6.1 必需章节

- [ ] **一、技术架构**: 模块位置图、目录结构
- [ ] **二、数据模型设计 (DynamoDB)**: TypeScript接口、键生成函数
- [ ] **三、业务逻辑实现**: 服务类实现
- [ ] **四、API设计**: API列表、请求/响应示例
- [ ] **五、前端实现**: React组件
- [ ] **六、测试用例**: 单元测试
- [ ] **七、验收标准**: 功能/安全/性能验收项
- [ ] **八、风险分析**: 风险矩阵

### 6.2 质量要求

- [ ] 所有代码使用TypeScript语法高亮
- [ ] 测试用例使用Given-When-Then模式
- [ ] DynamoDB操作已Mock
- [ ] 路径引用使用相对路径
- [ ] 状态码设为`complete`

---

## 七、修改现有文档

### 7.1 添加新功能

1. 在对应模块目录创建新文档
2. 更新`tech-overview.md`中的模块列表
3. 更新`TECH_ARCHITECTURE_STATUS.md`

### 7.2 修改现有文档

1. 使用Read工具获取当前内容
2. 定位需要修改的部分
3. 使用Edit工具进行修改
4. 确保章节编号连续

### 7.3 更新状态

当文档完成时，更新YAML Front Matter:

```yaml
status: complete  # 从 pending-implementation 或 implementation-ready
```

---

## 八、常用命令

### 统计文档

```bash
# 统计所有技术文档
find /Users/dianwenwang/Project/idea/06-tech-architecture -name "tech-*.md" | wc -l

# 统计用户故事文档
find /Users/dianwenwang/Project/idea/06-tech-architecture -name "story-*.md" | wc -l

# 查找待实现文档
grep -r "status: pending-implementation" /Users/dianwenwang/Project/idea/06-tech-architecture

# 查看文档行数
wc -l /Users/dianwenwang/Project/idea/06-tech-architecture/user/tech-user-registration.md
```

### 检查文档结构

```bash
# 查看文档章节
grep -n "^## " /Users/dianwenwang/Project/idea/06-tech-architecture/user/tech-user-registration.md

# 检查是否包含测试用例
grep -n "## 六、测试用例" /Users/dianwenwang/Project/idea/06-tech-architecture/user/tech-user-registration.md

# 检查是否包含验收标准
grep -n "## 七、验收标准" /Users/dianwenwang/Project/idea/06-tech-architecture/user/tech-user-registration.md
```

---

## 九、参考文档

- [tech-overview.md](tech-overview.md) - 技术架构总览
- [TECH_ARCHITECTURE_STATUS.md](TECH_ARCHITECTURE_STATUS.md) - 完成状态报告
- [docs/test-strategy.md](docs/test-strategy.md) - 测试策略
- [05-product-design/](../05-product-design/) - 产品设计文档

---

*最后更新: 2026-01-26*
