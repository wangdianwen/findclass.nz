---
title: 技术实现 - 课程搜索
category: tech-architecture
created: 2026-01-21
author: linus-torvalds
version: 1.0
phase: 1
priority: P0
status: complete
related_feature: ../../05-product-design/course/course-search.md
---

# 技术实现: 课程搜索

> **对应产品文档**: [course-search.md](../../05-product-design/course/course-search.md) | **优先级**: P0 | **排期**: Phase 1 | **状态**: 已实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                         技术架构层级                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [React/Taro Frontend]                                            │
│         │ 搜索请求                                                   │
│         ▼                                                           │
│   [CloudFront + API Gateway]                                        │
│         │                                                           │
│         ▼                                                           │
│   [Lambda: course-search]  ◄──────┐                                │
│   [Lambda: course-detail]         │                                │
│   [Lambda: course-list]           │                                │
│         │                         │                                │
│         ▼                         │                                │
│   [DynamoDB: courses] ◄──────────┤  搜索结果                       │
│   [DynamoDB: teachers] ◄─────────┤  缓存命中                       │
│         │                         │                                │
│         ▼                         │                                │
│   [DynamoDB: search_cache]         │                                │
│         │                         │                                │
│         └─────────────────────────┘                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 技术选型

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| **数据库** | DynamoDB | 存储课程数据，支持复杂查询 |
| **缓存** | DynamoDB (TTL) | 搜索结果缓存，TTL 5分钟 |
| **搜索** | DynamoDB GSI | 利用全局二级索引实现筛选 |
| **翻译** | Google Translate API | 课程名称/描述翻译 |
| **CDN** | CloudFront | 静态资源加速 |

---

## 二、数据库设计

### 2.1 DynamoDB 表设计

#### Courses 表

```typescript
interface Course {
  id: string;                    // UUID, Partition Key
  title: string;                 // 课程标题
  description: string;           // 课程描述
  price: number;                 // 价格/小时
  price_unit: 'hour' | 'lesson' | 'month';
  
  // 分类维度
  subject: string;               // 科目 (GSI1)
  grade: string;                 // 年级 (GSI2)
  region: string;                // 地区 (GSI3)
  teaching_mode: 'online' | 'offline' | 'hybrid';
  language: 'chinese' | 'english' | 'bilingual';
  
  // 信任与质量
  trust_level: 'S' | 'A' | 'B' | 'C' | 'D';  // 信任等级
  quality_score: number;         // 质量评分 0-100
  data_source: 'first_party' | 'gumtree' | 'facebook' | 'other';
  
  // 教师信息
  teacher_id?: string;
  teacher_name: string;
  
  // 评价
  rating: number;                // 平均评分
  review_count: number;          // 评价数量
  
  // 脱敏信息
  contact_phone?: string;        // 脱敏后
  contact_wechat?: string;       // 脱敏后
  contact_email?: string;        // 脱敏后
  
  // 元数据
  schedule: string;              // 上课时间
  published_at: string;          // 发布日期
  updated_at: string;            // 更新日期
  expires_at?: string;           // 过期日期 (聚合数据)
  status: 'active' | 'inactive' | 'expired';
  
  // 搜索权重因子
  source_weight: number;         // 来源权重
  freshness_weight: number;      // 新鲜度权重
}
```

**DynamoDB 配置**:

```yaml
TableName: courses
KeySchema:
  - AttributeName: id
    KeyType: HASH

GlobalSecondaryIndexes:
  # 按科目筛选
  - IndexName: subject-index
    KeySchema:
      - AttributeName: subject
        KeyType: HASH
      - AttributeName: published_at
        KeyType: RANGE
    Projection:
      ProjectionType: ALL

  # 按地区筛选
  - IndexName: region-index
    KeySchema:
      - AttributeName: region
        KeyType: HASH
      - AttributeName: published_at
        KeyType: RANGE
    Projection:
      ProjectionType: ALL

  # 按评分排序
  - IndexName: rating-index
    KeySchema:
      - AttributeName: trust_level
        KeyType: HASH
      - AttributeName: rating
        KeyType: RANGE
    Projection:
      ProjectionType: ALL

BillingMode: PAY_PER_REQUEST
```

### 2.2 搜索缓存设计 (DynamoDB)

```typescript
// DynamoDB SearchCache 表设计
interface SearchCacheItem {
  id: string;                    // PK: cache:search:{hash(request_params)}
  cache_key: string;             // hash of request params
  results: Course[];
  pagination: { page, pageSize, total, totalPages };
  facets: { regions, subjects, grades, ... };
  expires_at: number;            // TTL: 300 seconds (5 minutes)
  created_at: number;
}

// 搜索结果缓存
// Key: "cache:search:{hash(request_params)}"
// TTL: 300 seconds (5 minutes)

// 热门搜索关键词
// Key: "cache:popular:searches"
// TTL: 3600 seconds (1 hour)

// 搜索建议
// Key: "cache:suggest:{keyword}"
// TTL: 86400 seconds (24 hours)
```

---

## 三、搜索算法设计

### 3.1 排序公式

```
最终分数 = 基础相关性 × 来源权重 × 质量权重 × 新鲜度权重 × 信任权重

各因子说明：
- 基础相关性: 关键词匹配度 (TF-IDF)
- 来源权重: first_party=1.5, gumtree=1.0, facebook=0.8, other=0.6
- 质量权重: S=1.3, A=1.2, B=1.0, C=0.8, D=0.5
- 新鲜度权重: 7天内=1.2, 30天内=1.0, 90天内=0.8, 90天+=0.5
- 信任权重: 平台认证=1.2, 来源验证=1.0, 社群来源=0.8
```

### 3.2 搜索实现

```typescript
interface SearchRequest {
  keyword?: string;
  filters?: {
    subjects?: string[];
    grades?: string[];
    regions?: string[];
    priceMin?: number;
    priceMax?: number;
    teachingMode?: string[];
    language?: string[];
    minRating?: number;
    dataSources?: string[];
    schedule?: string[];
  };
  sortBy?: 'relevance' | 'latest' | 'price_asc' | 'price_desc' | 'rating';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

async function searchCourses(request: SearchRequest): Promise<SearchResponse> {
  // 1. 生成缓存键
  const cacheKey = `cache:search:${hash(request)}`;

  // 2. 检查 DynamoDB 缓存
  const cached = await dynamoDB.get({
    TableName: 'SearchCacheTable',
    Key: { id: cacheKey }
  });
  if (cached.Item && cached.Item.expires_at > Date.now() / 1000) {
    return JSON.parse(cached.Item.cached_data);
  }

  // 3. 构建 DynamoDB 查询
  const params = buildDynamoDBQuery(request);

  // 4. 执行查询
  const results = await dynamodb.query(params).promise();

  // 5. 计算排序分数
  const scoredResults = results.Items.map(calculateScore);

  // 6. 分页返回
  const paginatedResults = paginate(scoredResults, request.page, request.pageSize);

  // 7. 生成 facets
  const facets = await generateFacets(request);

  const result = { results: paginatedResults, pagination, facets };

  // 8. 缓存结果到 DynamoDB (5分钟TTL)
  await dynamoDB.put({
    TableName: 'SearchCacheTable',
    Item: {
      id: cacheKey,
      cache_key: cacheKey,
      cached_data: JSON.stringify(result),
      expires_at: Math.floor(Date.now() / 1000) + 300,
      created_at: Math.floor(Date.now() / 1000)
    }
  });

  return result;
}

function calculateScore(course: Course): CourseScore {
  let score = 1.0;
  
  // 来源权重
  const sourceWeights = {
    'first_party': 1.5,
    'gumtree': 1.0,
    'facebook': 0.8,
    'other': 0.6
  };
  score *= sourceWeights[course.data_source] || 1.0;
  
  // 质量权重
  const qualityWeights = { 'S': 1.3, 'A': 1.2, 'B': 1.0, 'C': 0.8, 'D': 0.5 };
  score *= qualityWeights[course.trust_level] || 1.0;
  
  // 新鲜度权重
  const daysSincePublish = (Date.now() - new Date(course.published_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSincePublish <= 7) score *= 1.2;
  else if (daysSincePublish <= 30) score *= 1.0;
  else if (daysSincePublish <= 90) score *= 0.8;
  else score *= 0.5;
  
  return { ...course, _score: score };
}
```

---

## 四、API 设计

### 4.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| GET | /courses/search | 搜索课程 | 支持关键词和筛选 |
| GET | /courses/suggest | 搜索建议 | 实时搜索建议 |
| GET | /courses/popular | 热门搜索 | 返回热门关键词 |
| GET | /courses/filters | 获取筛选选项 | 返回所有筛选选项 |
| GET | /courses/:id | 课程详情 | 获取课程详细信息 |

### 4.2 请求/响应示例

#### GET /courses/search

**请求**:
```
GET /api/v1/courses/search?keyword=数学&regions=Auckland&minRating=4.0&page=1&pageSize=20
```

**响应 (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "course-001",
      "title": "高中数学提高班",
      "price": 50,
      "rating": 4.9,
      "reviewCount": 128,
      "region": "Auckland CBD",
      "subject": "数学",
      "grade": "高中",
      "trustLevel": "S",
      "dataSource": "first_party"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 128,
    "totalPages": 7
  },
  "facets": {
    "regions": [
      {"value": "Auckland", "count": 85},
      {"value": "Wellington", "count": 30}
    ],
    "subjects": [
      {"value": "数学", "count": 45},
      {"value": "英语", "count": 38}
    ]
  }
}
```

---

## 五、前端集成

### 5.1 搜索组件

```typescript
// 搜索请求 Hook
function useCourseSearch() {
  const [results, setResults] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0 });
  
  const search = useCallback(async (params: SearchParams) => {
    setLoading(true);
    try {
      const response = await api.get('/courses/search', { params });
      setResults(response.data.data);
      setPagination(response.data.pagination);
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { results, loading, pagination, search };
}

// 搜索结果组件
function SearchResults() {
  const { results, loading, search } = useCourseSearch();
  
  useEffect(() => {
    search({ keyword: '数学' });
  }, []);
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <div className="course-list">
      {results.map(course => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
}
```

### 5.2 筛选面板

```typescript
interface FilterPanelProps {
  facets: Facets;
  onFilterChange: (filters: SearchFilters) => void;
}

function FilterPanel({ facets, onFilterChange }: FilterPanelProps) {
  return (
    <div className="filter-panel">
      <FilterSection title="地区">
        {facets.regions.map(region => (
          <Checkbox
            key={region.value}
            checked={selectedRegions.includes(region.value)}
            onChange={() => toggleRegion(region.value)}
          >
            {region.value} ({region.count})
          </Checkbox>
        ))}
      </FilterSection>
      
      <FilterSection title="科目">
        {facets.subjects.map(subject => (
          <Checkbox
            key={subject.value}
            checked={selectedSubjects.includes(subject.value)}
            onChange={() => toggleSubject(subject.value)}
          >
            {subject.value} ({subject.count})
          </Checkbox>
        ))}
      </FilterSection>
      
      <PriceRangeFilter
        min={0}
        max={200}
        onChange={(min, max) => onFilterChange({ priceMin: min, priceMax: max })}
      />
    </div>
  );
}
```

---

## 六、性能优化

### 6.1 缓存策略

| 缓存项 | 缓存位置 | TTL | 说明 |
|--------|----------|-----|------|
| 搜索结果 | DynamoDB | 5分钟 | 热门搜索结果 |
| 课程详情 | CloudFront | 1小时 | 详情页静态内容 |
| 筛选 facets | DynamoDB | 1小时 | 聚合统计数据 |
| 搜索建议 | DynamoDB | 24小时 | 自动补全数据 |

### 6.2 性能指标

| 指标 | 目标值 | 监控方式 |
|------|--------|----------|
| 搜索响应时间 | < 500ms | CloudWatch Metrics |
| 筛选响应时间 | < 300ms | CloudWatch Metrics |
| 分页加载时间 | < 200ms | CloudWatch Metrics |
| 并发搜索能力 | 1000 QPS | 负载测试 |

### 6.3 优化策略

```typescript
// 1. 批量查询优化
async function searchWithBatch(request: SearchRequest) {
  // 使用并行查询获取不同维度的数据
  const [subjectResults, regionResults] = await Promise.all([
    dynamodb.query(getSubjectQuery(request)).promise(),
    dynamodb.query(getRegionQuery(request)).promise()
  ]);
  
  // 合并结果
  return mergeResults(subjectResults, regionResults);
}

// 2. 懒加载筛选 facets
async function getFacetsLazy(request: SearchRequest) {
  const cacheKey = `cache:facets:${hash(request)}`;
  // 仅在用户展开筛选面板时加载
  const cached = await dynamoDB.get({
    TableName: 'SearchCacheTable',
    Key: { id: cacheKey }
  });
  if (cached.Item && cached.Item.expires_at > Date.now() / 1000) {
    return JSON.parse(cached.Item.cached_data);
  }
  const facets = await generateFacets(request);

  // 缓存 facets
  await dynamoDB.put({
    TableName: 'SearchCacheTable',
    Item: {
      id: cacheKey,
      cached_data: JSON.stringify(facets),
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      created_at: Math.floor(Date.now() / 1000)
    }
  });
  return facets;
}

// 3. 图片懒加载
function CourseCard({ course }: { course: Course }) {
  return (
    <div className="course-card">
      <img 
        src={course.imageUrl} 
        loading="lazy" 
        alt={course.title}
      />
      {/* 其他内容 */}
    </div>
  );
}
```

---

## 七、测试策略

### 7.1 单元测试

```typescript
describe('Search Service', () => {
  it('should calculate correct score for first party course', () => {
    const course = createMockCourse({ dataSource: 'first_party', trustLevel: 'S' });
    const score = calculateScore(course);
    expect(score._score).toBe(1.5 * 1.3 * 1.0); // 1.95
  });

  it('should return cached results on repeated search', async () => {
    const request = { keyword: '数学' };
    const cached = await searchCourses(request);
    const cached2 = await searchCourses(request);
    expect(cached2.fromCache).toBe(true);
  });

  it('should handle empty results', async () => {
    const results = await searchCourses({ keyword: 'xyz123none' });
    expect(results.data).toHaveLength(0);
    expect(results.pagination.total).toBe(0);
  });
});
```

### 7.2 性能测试

```typescript
describe('Search Performance', () => {
  it('should respond within 500ms', async () => {
    const start = Date.now();
    await searchCourses({ keyword: '数学' });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });

  it('should handle 1000 concurrent requests', async () => {
    const requests = Array(1000).fill(null).map(() => 
      searchCourses({ keyword: '数学' })
    );
    const results = await Promise.all(requests);
    expect(results).toHaveLength(1000);
  });
});
```

---

## 八、Lambda 函数设计

### 8.1 函数配置

```yaml
Functions:
  course-search:
    Handler: src/handlers/courses/search.handler
    Timeout: 10s
    Memory: 512MB
    Environment:
      - DYNAMODB_CACHE_TABLE: ${self:service}-cache-${self:provider.stage}
      - DYNAMODB_COURSES_TABLE: ${self:service}-courses-${self:provider.stage}
    Events:
      - http:
          path: courses/search
          method: get
          cors: true
          authorizer:
            type: COGNITO_USER_POOLS
            authorizerId: !Ref ApiGatewayAuthorizer

  course-suggest:
    Handler: src/handlers/courses/suggest.handler
    Timeout: 5s
    Memory: 256MB
```

### 8.2 代码结构

```
src/handlers/courses/
├── search.ts          # 搜索主逻辑
├── suggest.ts         # 搜索建议
├── detail.ts          # 课程详情
├── list.ts            # 课程列表
└── facets.ts          # 筛选 facets

src/services/
├── searchService.ts   # 搜索服务
├── cacheService.ts    # 缓存服务
├── scoringService.ts  # 排序评分
└── facetService.ts    # Facet 服务

src/utils/
├── dynamodb.ts        # DynamoDB 工具
├── cache.ts           # 缓存服务 (DynamoDB)
└── scoring.ts         # 评分算法
```

---

## 九、验收标准

- [ ] 关键词搜索正常，分词准确
- [ ] 多条件筛选功能正常（地区、科目、年级、价格、评分等）
- [ ] 排序功能正确（综合、最新、价格、评分）
- [ ] 注册用户课程优先展示（来源权重 1.5x）
- [ ] 搜索响应时间 < 500ms
- [ ] 中英文切换正常
- [ ] 移动端适配正常
- [ ] 单元测试覆盖率 80%+

---

## 十、风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 搜索性能问题 | 中 | 高 | DynamoDB 缓存，GSI 优化 |
| 中文分词不准确 | 低 | 中 | 使用专业中文分词库 |
| 排序效果不佳 | 中 | 中 | A/B 测试，持续优化 |
| 缓存击穿 | 低 | 中 | 布隆过滤器，空值缓存 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/mvp/tech-search.md`

**相关文档**:
- [产品设计](../../05-product-design/mvp/feature-search.md)
- [数据库设计](database-design.md)
- [API规范](api-specification.md)
