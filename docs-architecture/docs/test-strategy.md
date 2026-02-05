---
title: 测试策略文档
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
status: active
---

# 测试策略文档

> **版本**: 1.0 | **更新日期**: 2026-01-26 | **适用范围**: FindClass NZ 全栈项目

---

## 一、测试哲学

### 1.1 核心理念

> **单元测试覆盖所有API逻辑，集成测试只验证端到端用户流程**

```
                    测试金字塔
                       /\
                      /  \
                     / IT \
                    /______\
                   /        \
                  /  Unit    \
                 /____________\

  单元测试 (80%) ──────────────→ 覆盖所有API逻辑
  集成测试 (20%) ──────────────→ 只验证用户故事
```

| 测试类型 | 占比 | 覆盖范围 | 运行频率 | 依赖处理 |
|----------|------|----------|----------|----------|
| Unit Tests | 80% | 所有模块功能、API逻辑、数据验证 | 代码提交时 | **全部Mock** |
| Integration Tests | 20% | 用户故事、端到端流程 | PR合并时 | **TestContainer真数据库** |

### 1.2 测试原则

#### 单元测试原则

1. **Mock所有外部依赖** - 数据库、缓存、外部API全部Mock
2. **单元测试覆盖所有逻辑** - 每个Service方法、Controller方法都要测试
3. **不做重复测试** - 只测试业务逻辑，不测试API路由

#### 集成测试原则

1. **使用TestContainer** - 启动真实的DynamoDB Local/LocalStack容器
2. **禁止Mock** - 集成测试中不Mock任何依赖，使用真实数据操作
3. **测试数据管理** - 通过API或直接操作数据库创建测试数据
4. **只做用户故事** - 验证完整用户流程，不验证单个API
5. **环境隔离** - 每个测试使用独立的表和数据

### 1.3 Mock vs TestContainer 对比

| 维度 | 单元测试 (Mock) | 集成测试 (TestContainer) |
|------|-----------------|--------------------------|
| 数据库 | Mock DynamoDB | 真实 DynamoDB Local |
| 缓存 | Mock Cache | 真实 Redis/Mock |
| 外部API | Mock HTTP | 真实或WireMock |
| 速度 | 快 | 慢 |
| 覆盖率 | 高 | 端到端验证 |
| 测试内容 | 业务逻辑 | 用户流程 |
| 数据操作 | Mock响应 | 真实CRUD |

---

## 二、测试目录结构

```
tests/
├── unit/                                       # 单元测试 (80%)
│   ├── users/
│   │   ├── register.test.ts
│   │   ├── login.test.ts
│   │   └── profile.test.ts
│   ├── courses/
│   │   ├── create-course.test.ts
│   │   ├── search-courses.test.ts
│   │   └── course-detail.test.ts
│   ├── fixtures/                              # 单元测试专用 fixture
│   │   ├── auth.ts
│   │   └── test-users.ts
│   ├── mocks/                                 # 单元测试专用 mocks
│   │   └── logger.mock.ts
│   └── setup.unit.ts                          # 单元测试配置 (Mock设置)
├── integration/                                # 集成测试 (20%)
│   ├── users/
│   │   ├── us1-registration.test.ts
│   │   └── us2-profile-management.test.ts
│   ├── courses/
│   │   ├── us5-search-favorite.test.ts
│   │   └── us6-booking-flow.test.ts
│   ├── fixtures/                              # 集成测试专用 fixture
│   │   ├── auth.ts
│   │   └── test-users.ts
│   ├── config/                                # 集成测试专用配置
│   │   ├── test-containers.ts
│   │   └── dynamodb-setup.ts
│   └── setup.integration.ts                   # 集成测试配置 (TestContainer设置)
```

> **⚠️ 重要**: 单元测试和集成测试的 fixtures、mocks、config 各自独立，不共享根目录配置
>
> **核心原则**:
> - **单元测试**: 所有外部依赖必须 Mock (数据库、缓存、外部API)
> - **集成测试**: 禁止使用任何 Mock，必须使用真实的 TestContainer 环境

### 2.1 目录结构示例

```
tests/
├── unit/
│   ├── users/
│   │   ├── register.test.ts        # → src/modules/users/user.service.ts
│   │   ├── login.test.ts           # → src/modules/users/user.service.ts
│   │   └── profile.test.ts         # → src/modules/users/user.controller.ts
│   ├── courses/
│   │   ├── create-course.test.ts   # → src/modules/courses/course.service.ts
│   │   ├── search-courses.test.ts  # → src/modules/courses/course.service.ts
│   │   └── course-detail.test.ts   # → src/modules/courses/course.controller.ts
│   ├── fixtures/                   # ✅ 单元测试 fixture
│   │   ├── auth.ts
│   │   └── test-users.ts
│   ├── mocks/                      # ✅ 单元测试 mocks (集成测试禁止)
│   │   └── logger.mock.ts
│   └── setup.unit.ts               # ✅ Mock 配置
├── integration/
│   ├── users/
│   │   ├── us1-registration.test.ts
│   │   └── us2-profile-management.test.ts
│   ├── courses/
│   │   ├── us5-search-favorite.test.ts
│   │   └── us6-booking-flow.test.ts
│   ├── fixtures/                   # ✅ 集成测试 fixture
│   │   ├── auth.ts
│   │   └── test-users.ts
│   ├── config/                     # ✅ 集成测试配置 (TestContainer)
│   │   ├── test-containers.ts
│   │   └── dynamodb-setup.ts
│   └── setup.integration.ts        # ✅ TestContainer 配置 (禁止 Mock)
```

> **📁 目录对应关系**: `tests/unit/[模块]/[功能].test.ts` → `src/modules/[模块]/[功能].service.ts`
>
> **核心规则**:
> - `tests/unit/**/*` → 可以使用 Mock
> - `tests/integration/**/*` → **禁止**使用任何 Mock

---

## 三、单元测试规范

### 3.1 文件命名规则

| 源文件 | 测试文件 | 示例 |
|--------|----------|------|
| `user.service.ts` | `tests/unit/users/user.service.test.ts` | 可选命名 |
| `user.service.ts` | `tests/unit/users/register.test.ts` | ✅ **推荐**: 按功能命名 |
| `user.controller.ts` | `tests/unit/users/profile.test.ts` | 按功能命名 |

> **推荐**: 按功能命名而非按文件命名，便于一个测试文件覆盖多个相关方法

### 3.2 测试结构 (Given-When-Then)

```typescript
// tests/unit/users/register.test.ts

describe('UserService', () => {
  describe('register', () => {
    it('should create user successfully', async () => {
      // Given - 准备测试数据
      const mockUser = createMockUser();
      (scanItems as Mock).mockResolvedValue({ items: [] });
      (putItem as Mock).mockResolvedValue(mockUser);

      // When - 执行测试
      const result = await userService.register({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      });

      // Then - 验证结果
      expect(result.email).toBe('test@example.com');
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
    });

    it('should throw error if email exists', async () => {
      // Given - 准备已有用户
      const existingUser = createMockUser({ email: 'exists@example.com' });
      (scanItems as Mock).mockResolvedValue({ items: [existingUser] });

      // When & Then - 验证错误
      await expect(
        userService.register({ 
          email: 'exists@example.com',
          password: 'Password123',
          name: 'Test User',
        })
      ).rejects.toThrow('Email already registered');
    });

    it('should hash password before saving', async () => {
      // Given
      (scanItems as Mock).mockResolvedValue({ items: [] });
      (putItem as Mock).mockResolvedValue(createMockUser());

      // When
      await userService.register({
        email: 'test@example.com',
        password: 'PlainPassword123',
        name: 'Test User',
      });

      // Then - 验证密码被加密
      expect(putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: expect.stringMatching(/^\$2[ayb]\$.{56}$/), // bcrypt格式
        })
      );
    });
  });

  describe('login', () => {
    it('should return token on valid credentials', async () => {
      // Given
      const mockUser = createMockUser({
        email: 'test@example.com',
        passwordHash: hash('Password123'),
      });
      (getItem as Mock).mockResolvedValue(mockUser);
      (comparePassword as Mock).mockResolvedValue(true);
      (generateToken as Mock).mockReturnValue('jwt-token');

      // When
      const result = await userService.login({
        email: 'test@example.com',
        password: 'Password123',
      });

      // Then
      expect(result.token).toBe('jwt-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error on invalid password', async () => {
      // Given
      const mockUser = createMockUser({
        email: 'test@example.com',
        passwordHash: hash('CorrectPassword'),
      });
      (getItem as Mock).mockResolvedValue(mockUser);
      (comparePassword as Mock).mockResolvedValue(false);

      // When & Then
      await expect(
        userService.login({
          email: 'test@example.com',
          password: 'WrongPassword',
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
```

### 3.2 Mock 模式

```typescript
// tests/unit/courses/create-course.test.ts

describe('CourseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCourse', () => {
    it('should create course with correct data', async () => {
      // Given
      const teacherId = 'teacher-123';
      const input = {
        title: '高中数学',
        category: '数学',
        price: 50,
        teachingMode: 'offline' as const,
        city: 'Auckland',
        timeSlots: ['周六14:00-16:00'],
        duration: 120,
        coverImage: 'https://example.com/cover.jpg',
        description: 'NCEA数学辅导',
      };

      // Mock DynamoDB operations
      (putItem as Mock).mockResolvedValue(createMockCourse(input));

      // When
      const result = await courseService.createCourse(teacherId, input);

      // Then
      expect(result.title).toBe('高中数学');
      expect(result.status).toBe('draft');
      expect(result.teacherId).toBe(teacherId);
      expect(putItem).toHaveBeenCalledTimes(1);
    });

    it('should validate required fields', async () => {
      // Given
      const invalidInput = {
        title: '', // 空标题
        // 缺少必填字段
      };

      // When & Then
      await expect(
        courseService.createCourse('teacher-123', invalidInput as any)
      ).rejects.toThrow('课程标题不能为空');
    });
  });
});
```

### 3.3 错误处理测试

```typescript
describe('BookingService', () => {
  describe('cancelBooking', () => {
    it('should throw error if booking not found', async () => {
      // Given
      (getItem as Mock).mockResolvedValue(null);

      // When & Then
      await expect(
        bookingService.cancelBooking('non-existent-id', 'user-123')
      ).rejects.toThrow('Booking not found');
    });

    it('should throw error if not owner', async () => {
      // Given
      const booking = createMockBooking({ userId: 'other-user' });
      (getItem as Mock).mockResolvedValue(booking);

      // When & Then
      await expect(
        bookingService.cancelBooking('booking-123', 'user-123')
      ).rejects.toThrow('Not authorized to cancel this booking');
    });

    it('should not allow cancelling completed booking', async () => {
      // Given
      const booking = createMockBooking({ 
        userId: 'user-123',
        status: 'completed' 
      });
      (getItem as Mock).mockResolvedValue(booking);

      // When & Then
      await expect(
        bookingService.cancelBooking('booking-123', 'user-123')
      ).rejects.toThrow('Cannot cancel completed booking');
    });
  });
});
```

---

## 四、集成测试规范 (用户故事)

### 4.1 用户故事测试用例组织规范

集成测试用例按以下三类组织：

| 分类 | 命名 | 说明 |
|------|------|------|
| **Happy Path** | `[功能]-HP-001` | 正常业务流程，测试理想场景 |
| **Failed Cases** | `[功能]-FC-001` | 异常流程，测试错误处理 |
| **Edge Cases** | `[功能]-EC-001` | 边界条件，测试特殊情况 |

### 4.2 用户故事测试结构

```typescript
// tests/integration/users/us1-registration.test.ts

/**
 * US1: 用户注册与登录
 *
 * 用户故事:
 * 作为新用户，我希望能够注册账号并登录
 * 以便使用平台的课程搜索和收藏功能
 */

describe('US1: 用户注册与登录', () => {
  beforeAll(async () => {
    // 启动测试容器
    await startTestContainers();
    // 创建测试表
    await createTestTable();
    // 清理测试数据
    await clearTestData();
  }, 120000);

  afterAll(async () => {
    await stopTestContainers();
  });

  // ==================== Happy Path ====================

  it('US1-HP-01: should complete full registration and login flow', async () => {
    // Step 1: 用户注册
    const registerResult = await register({
      email: 'test@example.com',
      password: 'Pass123456',
      name: 'Test User',
    });

    expect(registerResult.success).toBe(true);
    expect(registerResult.user.email).toBe('test@example.com');
    expect(registerResult.user.name).toBe('Test User');
    expect(registerResult.token).toBeDefined();

    // Step 2: 用户登录
    const loginResult = await login({
      email: 'test@example.com',
      password: 'Pass123456',
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.token).toBeDefined();
    expect(loginResult.user.email).toBe('test@example.com');

    // Step 3: 验证Token有效
    const profileResult = await getProfile(loginResult.token);
    expect(profileResult.user.email).toBe('test@example.com');
  });

  it('US1-HP-02: should login with existing user', async () => {
    // 先注册用户
    await register({
      email: 'existing@example.com',
      password: 'Pass123456',
      name: 'Existing User',
    });

    // 登录
    const loginResult = await login({
      email: 'existing@example.com',
      password: 'Pass123456',
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.token).toBeDefined();
  });

  // ==================== Failed Cases ====================

  it('US1-FC-01: should reject duplicate email registration', async () => {
    // 先注册
    await register({
      email: 'duplicate@example.com',
      password: 'Pass123456',
      name: 'First User',
    });

    // 尝试重复注册
    const result = await register({
      email: 'duplicate@example.com',
      password: 'Pass123456',
      name: 'Second User',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Email already registered');
  });

  it('US1-FC-02: should reject invalid email format', async () => {
    const result = await register({
      email: 'invalid-email',
      password: 'Pass123456',
      name: 'Test User',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid email format');
  });

  it('US1-FC-03: should reject weak password', async () => {
    const result = await register({
      email: 'test@example.com',
      password: '123',
      name: 'Test User',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Password too weak');
  });

  it('US1-FC-04: should reject wrong verification code', async () => {
    // 获取验证码
    await sendVerificationCode('verify@example.com');

    // 使用错误验证码
    const result = await verifyCode({
      email: 'verify@example.com',
      code: '000000',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid verification code');
  });

  it('US1-FC-05: should reject expired verification code', async () => {
    // 使用已过期的验证码
    const result = await verifyCode({
      email: 'expired@example.com',
      code: '123456',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Verification code expired');
  });

  // ==================== Edge Cases ====================

  it('US1-EC-01: should handle concurrent registration', async () => {
    // 并发注册同一邮箱
    const promises = Array(3).fill(null).map(() =>
      register({
        email: 'concurrent@example.com',
        password: 'Pass123456',
        name: 'User',
      })
    );

    const results = await Promise.all(promises);

    // 只有一个成功，其他失败
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(1);
  });

  it('US1-EC-02: should handle special characters in name', async () => {
    const result = await register({
      email: 'special@example.com',
      password: 'Pass123456',
      name: '张老师-Test',
    });

    expect(result.success).toBe(true);
    expect(result.user.name).toBe('张老师-Test');
  });

  it('US1-EC-03: should handle long name within limit', async () => {
    const longName = 'A'.repeat(50);

    const result = await register({
      email: 'longname@example.com',
      password: 'Pass123456',
      name: longName,
    });

    expect(result.success).toBe(true);
    expect(result.user.name).toBe(longName);
  });

  it('US1-EC-04: should reject name exceeding max length', async () => {
    const tooLongName = 'A'.repeat(101);

    const result = await register({
      email: 'toolong@example.com',
      password: 'Pass123456',
      name: tooLongName,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Name too long');
  });

  it('US1-EC-05: should handle rate limiting', async () => {
    // 快速发送多次验证码请求
    const results = [];
    for (let i = 0; i < 5; i++) {
      const result = await sendVerificationCode(`rate${i}@example.com`);
      results.push(result);
    }

    // 应该触发频率限制
    const rateLimited = results.filter(r => r.error?.includes('Rate limit'));
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

### 4.3 业务流程测试（课程搜索与收藏）

```typescript
// tests/integration/courses/us5-search-favorite.test.ts

/**
 * US5: 课程搜索与收藏
 *
 * 用户故事:
 * 作为家长，我希望能够搜索课程并收藏感兴趣的课程
 * 以便比较和后续报名
 */

describe('US5: 课程搜索与收藏', () => {
  beforeAll(async () => {
    await startTestContainers();
    await createTestTable();
  }, 120000);

  beforeEach(async () => {
    await clearTestData();
    await createTestCourses();
  });

  // ==================== Happy Path ====================

  it('US5-HP-01: should search courses and complete favorite flow', async () => {
    // Step 1: 搜索课程
    const searchResult = await searchCourses({
      keyword: '数学',
      city: 'Auckland',
      category: '数学',
    });

    expect(searchResult.courses.length).toBeGreaterThan(0);
    expect(searchResult.pagination.total).toBeGreaterThan(0);

    // Step 2: 查看课程详情
    const courseId = searchResult.courses[0].id;
    const detailResult = await getCourseDetail(courseId);

    expect(detailResult.course.id).toBe(courseId);
    expect(detailResult.course.title).toBeDefined();

    // Step 3: 收藏课程
    const favoriteResult = await favoriteCourse(courseId);

    expect(favoriteResult.success).toBe(true);

    // Step 4: 验证收藏列表
    const myFavorites = await getMyFavorites();

    expect(myFavorites.courses.length).toBe(1);
    expect(myFavorites.courses[0].id).toBe(courseId);

    // Step 5: 取消收藏
    const unfavoriteResult = await unfavoriteCourse(courseId);

    expect(unfavoriteResult.success).toBe(true);

    // Step 6: 验证收藏已移除
    const finalFavorites = await getMyFavorites();
    expect(finalFavorites.courses.length).toBe(0);
  });

  it('US5-HP-02: should filter courses by multiple criteria', async () => {
    const result = await searchCourses({
      city: 'Auckland',
      category: '数学',
      priceMin: 30,
      priceMax: 60,
      teachingMode: 'offline',
    });

    expect(result.courses.length).toBeGreaterThan(0);
    result.courses.forEach(course => {
      expect(course.city).toBe('Auckland');
      expect(course.category).toBe('数学');
      expect(course.price).toBeGreaterThanOrEqual(30);
      expect(course.price).toBeLessThanOrEqual(60);
    });
  });

  it('US5-HP-03: should sort courses by price', async () => {
    const result = await searchCourses({
      sortBy: 'price_asc',
    });

    for (let i = 1; i < result.courses.length; i++) {
      expect(result.courses[i].price).toBeGreaterThanOrEqual(
        result.courses[i - 1].price
      );
    }
  });

  // ==================== Failed Cases ====================

  it('US5-FC-01: should show empty results for no matches', async () => {
    const result = await searchCourses({
      keyword: '不存在的课程名称12345',
    });

    expect(result.courses.length).toBe(0);
    expect(result.pagination.total).toBe(0);
  });

  it('US5-FC-02: should fail to favorite non-existent course', async () => {
    const result = await favoriteCourse('non-existent-id');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Course not found');
  });

  it('US5-FC-03: should fail to favorite already favorited course', async () => {
    const courseId = 'course-001';
    await favoriteCourse(courseId);

    const result = await favoriteCourse(courseId);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Already favorited');
  });

  it('US5-FC-04: should fail to unfavorite non-favorited course', async () => {
    const result = await unfavoriteCourse('course-001');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Not in favorites');
  });

  // ==================== Edge Cases ====================

  it('US5-EC-01: should handle pagination correctly', async () => {
    const page1 = await searchCourses({ page: 1, pageSize: 2 });
    const page2 = await searchCourses({ page: 2, pageSize: 2 });

    expect(page1.courses.length).toBe(2);
    expect(page2.courses.length).toBeGreaterThan(0);
    expect(page1.courses[1].id).not.toBe(page2.courses[0].id);
  });

  it('US5-EC-02: should handle empty search keyword', async () => {
    const result = await searchCourses({});
    expect(result.courses.length).toBeGreaterThan(0);
  });

  it('US5-EC-03: should handle special characters in keyword', async () => {
    const result = await searchCourses({
      keyword: '数学&英语辅导',
    });

    // 应该能处理或返回空结果，不应报错
    expect(result).toBeDefined();
  });

  it('US5-EC-04: should return facets for filters', async () => {
    const result = await searchCourses({});
    expect(result.facets).toBeDefined();
    expect(result.facets.categories).toBeDefined();
  });
});
```

### 4.4 预约流程测试

```typescript
// tests/integration/bookings/us7-booking-flow.test.ts

/**
 * US7: 课程预约流程
 *
 * 用户故事:
 * 作为家长，我希望能够预约课程试听
 * 以便了解课程是否适合孩子
 */

describe('US7: 课程预约流程', () => {
  beforeAll(async () => {
    await startTestContainers();
    await createTestTable();
    await createTestCourses();
    await createTestTimeSlots();
  }, 120000);

  // ==================== Happy Path ====================

  it('US7-HP-01: should complete full booking flow', async () => {
    // Step 1: 选择课程和时段
    const slotsResult = await getAvailableSlots('course-123', '2026-02-01');

    expect(slotsResult.slots.length).toBeGreaterThan(0);
    const selectedSlot = slotsResult.slots[0];

    // Step 2: 提交预约
    const bookingResult = await createBooking({
      courseId: 'course-123',
      slotId: selectedSlot.id,
      studentName: '张三',
      studentPhone: '021-123-4567',
      note: '想预约试听',
    });

    expect(bookingResult.success).toBe(true);
    expect(bookingResult.booking.status).toBe('pending');
    expect(bookingResult.booking.slotId).toBe(selectedSlot.id);

    // Step 3: 验证时段已被锁定
    const slotResult = await getSlot(selectedSlot.id);
    expect(slotResult.slot.status).toBe('pending');

    // Step 4: 查看我的预约
    const myBookings = await getMyBookings();

    expect(myBookings.bookings.length).toBe(1);
    expect(myBookings.bookings[0].courseId).toBe('course-123');
  });

  it('US7-HP-02: should confirm booking successfully', async () => {
    // 先创建预约
    const booking = await createBooking({
      courseId: 'course-123',
      slotId: 'slot-001',
      studentName: '李四',
      studentPhone: '021-987-6543',
    });

    // 教师确认预约
    const confirmResult = await confirmBooking(booking.booking.id);

    expect(confirmResult.success).toBe(true);
    expect(confirmResult.booking.status).toBe('confirmed');
  });

  // ==================== Failed Cases ====================

  it('US7-FC-01: should fail to book unavailable slot', async () => {
    const result = await createBooking({
      courseId: 'course-123',
      slotId: 'booked-slot-id',
      studentName: '王五',
      studentPhone: '021-555-6666',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Slot not available');
  });

  it('US7-FC-02: should fail to book non-existent course', async () => {
    const result = await createBooking({
      courseId: 'non-existent-course',
      slotId: 'slot-001',
      studentName: '测试',
      studentPhone: '021-111-2222',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Course not found');
  });

  it('US7-FC-03: should fail to cancel confirmed booking', async () => {
    // 先创建并确认预约
    const booking = await createBooking({
      courseId: 'course-123',
      slotId: 'slot-002',
      studentName: '赵六',
      studentPhone: '021-333-4444',
    });
    await confirmBooking(booking.booking.id);

    // 尝试取消已确认的预约
    const result = await cancelBooking(booking.booking.id);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Cannot cancel confirmed booking');
  });

  it('US7-FC-04: should fail to cancel others booking', async () => {
    // 尝试取消其他用户的预约
    const result = await cancelBooking('other-user-booking-id');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Not authorized');
  });

  // ==================== Edge Cases ====================

  it('US7-EC-01: should handle concurrent booking same slot', async () => {
    // 并发预约同一时段
    const promises = [
      createBooking({
        courseId: 'course-123',
        slotId: 'available-slot',
        studentName: '用户1',
        studentPhone: '021-001-001',
      }),
      createBooking({
        courseId: 'course-123',
        slotId: 'available-slot',
        studentName: '用户2',
        studentPhone: '021-002-002',
      }),
    ];

    const results = await Promise.all(promises);

    // 只有一个成功
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(1);
  });

  it('US7-EC-02: should handle booking with special characters in name', async () => {
    const result = await createBooking({
      courseId: 'course-123',
      slotId: 'slot-003',
      studentName: '张老师-测试',
      studentPhone: '021-123-4567',
    });

    expect(result.success).toBe(true);
    expect(result.booking.studentName).toBe('张老师-测试');
  });

  it('US7-EC-03: should handle booking with empty note', async () => {
    const result = await createBooking({
      courseId: 'course-123',
      slotId: 'slot-004',
      studentName: '无备注用户',
      studentPhone: '021-123-4567',
      note: '',
    });

    expect(result.success).toBe(true);
    expect(result.booking.note).toBe('');
  });

  it('US7-EC-04: should handle booking list pagination', async () => {
    // 创建多个预约
    for (let i = 0; i < 5; i++) {
      await createBooking({
        courseId: 'course-123',
        slotId: `slot-pagination-${i}`,
        studentName: `用户${i}`,
        studentPhone: `021-${i}-${i}`,
      });
    }

    const page1 = await getMyBookings({ page: 1, pageSize: 3 });
    const page2 = await getMyBookings({ page: 2, pageSize: 3 });

    expect(page1.bookings.length).toBe(3);
    expect(page2.bookings.length).toBe(2);
  });
});
```

---

## 四、集成测试用例命名规范

### 4.5 用例ID命名规则

| 分类 | 前缀 | 格式 | 示例 |
|------|------|------|------|
| Happy Path | US{X}-HP | US{X}-HP-序号 | US1-HP-01, US5-HP-02 |
| Failed Cases | US{X}-FC | US{X}-FC-序号 | US1-FC-01, US5-FC-02 |
| Edge Cases | US{X}-EC | US{X}-EC-序号 | US1-EC-01, US5-EC-02 |

### 4.6 用例分类说明

| 分类 | 说明 | 示例场景 |
|------|------|----------|
| **Happy Path** | 正常业务流程，测试理想场景 | 正常注册、登录、搜索、收藏 |
| **Failed Cases** | 异常流程，测试错误处理 | 重复注册、参数无效、权限不足 |
| **Edge Cases** | 边界条件，测试特殊情况 | 并发处理、特殊字符、超长输入 |

### 4.7 推荐测试覆盖比例

| 分类 | 建议占比 | 说明 |
|------|----------|------|
| Happy Path | 40% | 核心流程必须完整覆盖 |
| Failed Cases | 35% | 异常情况要全面考虑 |
| Edge Cases | 25% | 边界条件确保系统稳定 |

---

## 五、测试配置

### 5.1 Vitest 配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    root: '.',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      reportsDirectory: 'coverage',
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    projects: [
      {
        test: {
          include: ['tests/unit/**/*.test.ts'],
          setupFiles: ['tests/unit/setup.unit.ts'],
        },
        plugins: [tsconfigPaths()],
      },
      {
        test: {
          include: ['tests/integration/**/*.test.ts'],
          setupFiles: ['tests/integration/setup.integration.ts'],
        },
        plugins: [tsconfigPaths()],
      },
    ],
  },
});
```

> **关键配置**: `projects` 数组定义了单元测试和集成测试分别使用独立的 setup 文件

### 5.2 单元测试设置文件 (Mock配置)

单元测试必须在 `setup.unit.ts` 中配置所有 Mock，禁止在集成测试中使用 Mock。

```typescript
// tests/unit/setup.unit.ts
import { vi } from 'vitest';

// 导出 mock 对象供测试使用
export const putItem = vi.fn();
export const getItem = vi.fn();
export const updateItem = vi.fn();
export const deleteItem = vi.fn();
export const queryItems = vi.fn();
export const scanItems = vi.fn();
export const batchGetItems = vi.fn();

// Mock Logger
export const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  http: vi.fn(),
};

vi.mock('@core/logger', () => ({
  logger: mockLogger,
}));

// Mock DynamoDB - 所有依赖必须 Mock
vi.mock('@src/shared/db/dynamodb', () => ({
  putItem: vi.fn(),
  getItem: vi.fn(),
  queryItems: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  scanItems: vi.fn(),
  batchGetItems: vi.fn(),
  batchWriteItems: vi.fn(),
  createEntityKey: vi.fn((type, id, sortKey) => ({
    PK: `${type}#${id}`,
    SK: sortKey || 'METADATA',
  })),
  getTableName: vi.fn(),
  TABLE_NAME: 'FindClass-TestTable',
}));

// Mock Cache
vi.mock('@src/shared/db/cache', () => ({
  getFromCache: vi.fn(),
  setCache: vi.fn(),
  deleteFromCache: vi.fn(),
  incrementRateLimit: vi.fn(),
  getRateLimit: vi.fn(),
  CacheKeys: {
    search: vi.fn((query: string) => `search:${query}`),
    facet: vi.fn((query: string) => `facet:${query}`),
    course: vi.fn((id: string) => `course:${id}`),
    user: vi.fn((id: string) => `user:${id}`),
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  // 重置 logger mocks
  mockLogger.info.mockReset();
  mockLogger.error.mockReset();
  mockLogger.warn.mockReset();
});

afterAll(() => {
  vi.clearAllMocks();
});
```

#### 5.2.1 Mocks目录

对于复杂的 mock 配置，可以使用独立的 mock 文件：

```typescript
// tests/unit/mocks/logger.mock.ts
import { vi } from 'vitest';

export const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

vi.mock('@core/logger', () => ({
  logger: mockLogger,
}));

export const resetLoggerMocks = () => {
  mockLogger.info.mockReset();
  mockLogger.error.mockReset();
  mockLogger.warn.mockReset();
  mockLogger.debug.mockReset();
};
```

> **⚠️ 重要**: mock 文件只能用于单元测试，集成测试禁止使用任何 mock

### 5.3 TestContainer 集成测试环境

#### 5.3.1 为什么使用 TestContainer

> **⚠️ 重要**: 集成测试必须使用真实的 TestContainer 环境，禁止使用 Mock

| 测试类型 | 数据库 | 缓存 | HTTP | 说明 |
|----------|--------|------|------|------|
| Unit Tests | ❌ Mock | ❌ Mock | ❌ Mock | 快速、隔离、验证逻辑 |
| Integration Tests | ✅ 真实 | ✅ 真实 | ✅ 真实/Stub | 端到端验证真实行为 |

#### 5.3.2 TestContainer 配置

```typescript
// tests/integration/config/test-containers.ts
import { TestContainers } from 'testcontainers';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

let dynamodbContainer: any;
let started = false;

export async function startDynamoDBContainer(): Promise<any> {
  if (started) {
    return dynamodbContainer;
  }

  // 启动 DynamoDB Local 容器
  dynamodbContainer = await new TestContainers.GenericContainer(
    'amazon/dynamodb-local:latest'
  )
    .withExposedPorts(8000)
    .withStartupTimeout(120000)
    .start();

  started = true;
  return dynamodbContainer;
}

export async function stopDynamoDBContainer(): Promise<void> {
  if (dynamodbContainer && started) {
    await dynamodbContainer.stop();
    started = false;
  }
}

export function getDynamoDBClient(): DynamoDBDocumentClient {
  const host = dynamodbContainer.getHost();
  const port = dynamodbContainer.getMappedPort(8000);

  const client = new DynamoDBClient({
    endpoint: `http://${host}:${port}`,
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'fakeAccessKeyId',
      secretAccessKey: 'fakeSecretAccessKey',
    },
  });

  return DynamoDBDocumentClient.from(client);
}
```

#### 5.3.3 测试数据管理

```typescript
// tests/integration/config/test-data.ts
import { getDynamoDBClient } from './test-containers';

const dynamoDB = getDynamoDBClient();
const TABLE_NAME = 'FindClass-MainTable-test';

export interface TestUser {
  PK: string;
  SK: string;
  entityType: string;
  dataCategory: string;
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt: string;
}

export async function createTestUser(user: TestUser): Promise<void> {
  await dynamoDB.put({
    TableName: TABLE_NAME,
    Item: user,
  });
}

export async function getTestUser(userId: string): Promise<TestUser | null> {
  const result = await dynamoDB.get({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: 'METADATA',
    },
  });
  return result.Item as TestUser | null;
}

export async function deleteTestUser(userId: string): Promise<void> {
  await dynamoDB.delete({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: 'METADATA',
    },
  });
}

export async function clearAllTestData(): Promise<void> {
  // 扫描并删除所有测试数据
  const result = await dynamoDB.scan({
    TableName: TABLE_NAME,
  });

  for (const item of result.Items || []) {
    await dynamoDB.delete({
      TableName: TABLE_NAME,
      Key: {
        PK: item.PK,
        SK: item.SK,
      },
    });
  }
}
```

#### 5.3.4 禁止的 Mock 模式 (集成测试)

> **⚠️ 核心原则**: 集成测试**必须**使用真实的 TestContainer 环境，**禁止**使用任何 Mock

```typescript
// ❌ 禁止: 在集成测试中使用 Mock
describe('User Registration Integration', () => {
  beforeAll(async () => {
    // 禁止: Mock 数据库
    vi.mock('@shared/db/dynamodb', () => ({
      putItem: vi.fn().mockResolvedValue({}),
    }));
  });
});

// ❌ 禁止: 在集成测试中 Mock 外部 API
describe('Payment Integration', () => {
  beforeAll(async () => {
    // 禁止: Mock HTTP 请求
    vi.mock('axios', () => ({
      post: vi.fn().mockResolvedValue({ data: {} }),
    }));
  });
});

// ✅ 正确: 集成测试使用真实数据操作
describe('User Registration Integration', () => {
  beforeAll(async () => {
    // 启动真实的 TestContainer
    await startTestContainers();
    // 创建真实的测试表
    await createTestTable();
  });

  it('should register user with real database', async () => {
    // 直接操作真实数据库
    await createTestUser({
      PK: 'USER#test-123',
      SK: 'METADATA',
      entityType: 'USER',
      dataCategory: 'USER',
      id: 'test-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'customer',
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    // 通过 API 注册
    const response = await registerUser({ email: 'new@example.com' });

    // 验证数据真实写入数据库
    const savedUser = await getTestUser('new-123');
    expect(savedUser).not.toBeNull();
    expect(savedUser.email).toBe('new@example.com');
  });
});
```

> **总结**: 单元测试可以使用 Mock，集成测试必须使用真实环境 (TestContainer)

### 5.5 集成测试设置文件 (禁止Mock)

> **⚠️ 重要**: 集成测试**禁止**使用任何 Mock，必须使用真实的 TestContainer 环境

集成测试使用 `setup.integration.ts` 启动真实的 TestContainer：

```typescript
// tests/integration/setup.integration.ts
import 'reflect-metadata';
import { beforeAll, afterAll, beforeEach } from 'vitest';
import {
  requireTestContainers,
  startTestContainers,
  stopTestContainers,
} from './config/test-containers';
import { createTestTable, clearTableData } from './config/dynamodb-setup';
import { createApp } from '@src/app';

let _app: ReturnType<typeof createApp>;

export const getApp = () => _app;

beforeAll(async () => {
  // 启动真实的 TestContainer (禁止 Mock)
  const containers = await startTestContainers();
  // 创建真实的测试表
  await createTestTable(containers.dynamodb.docClient);

  // 创建真实的 App 实例
  _app = createApp();

  // 清理测试数据
  await clearTableData(containers.dynamodb.docClient);
}, 180000);

afterAll(async () => {
  // 停止 TestContainer
  await stopTestContainers();
}, 60000);

beforeEach(async () => {
  // 每个测试前清理数据
  const containers = await requireTestContainers();
  await clearTableData(containers.dynamodb.docClient);
});
```

> **禁止模式**: 集成测试中**绝对不能**使用 `vi.mock()` 或 `vi.fn()` Mock 任何依赖

### 5.6 测试数据工厂

```typescript
// tests/unit/fixtures/test-data.ts

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    PK: 'USER#usr_123',
    SK: 'METADATA',
    entityType: 'USER',
    dataCategory: 'USER',
    id: 'usr_123',
    email: 'test@example.com',
    name: 'Test User',
    phone: '021-123-4567',
    role: 'parent',
    status: 'active',
    emailVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockCourse(overrides: Partial<Course> = {}): Course {
  return {
    PK: 'COURSE#course_123',
    SK: 'METADATA',
    entityType: 'COURSE',
    dataCategory: 'COURSE',
    id: 'course_123',
    teacherId: 'teacher_123',
    title: '高中数学提高班',
    category: '数学',
    price: 50,
    priceUnit: 'hour',
    teachingMode: 'offline',
    city: 'Auckland',
    status: 'published',
    viewCount: 0,
    favoriteCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    PK: 'BOOKING#booking_123',
    SK: 'METADATA',
    entityType: 'BOOKING',
    dataCategory: 'TRANSACTION',
    id: 'booking_123',
    courseId: 'course_123',
    teacherId: 'teacher_123',
    studentId: 'user_123',
    studentName: '张三',
    studentEmail: 'zhangsan@example.com',
    slotId: 'slot_123',
    bookingDate: '2026-02-01',
    startTime: '14:00',
    endTime: '16:00',
    duration: 120,
    status: 'pending',
    paymentStatus: 'unpaid',
    price: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
```

---

## 六、运行测试

### 6.1 npm 脚本

```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:coverage:unit": "vitest run tests/unit --coverage",
    "test:coverage:integration": "vitest run tests/integration --coverage",
    "test:ui": "vitest --ui"
  }
}
```

### 6.2 运行命令

```bash
# 运行所有测试
npm test

# 只运行单元测试 (主要)
npm run test:unit

# 只运行集成测试
npm run test:integration

# 监视模式运行单元测试
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 只生成单元测试覆盖率
npm run test:coverage:unit

# 使用 UI 界面运行测试
npm run test:ui
```

### 6.3 CI/CD 配置

```yaml
# .github/workflows/test.yml

name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      - name: Run Unit Tests
        run: npm run test:unit
      
      - name: Generate Coverage Report
        run: npm run test:coverage:unit
        if: always()
      
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
        if: always()
      
      - name: Run Integration Tests
        run: npm run test:integration
        if: always()
```

---

## 七、测试覆盖率要求

### 7.1 覆盖率阈值

| 指标 | 单元测试 | 集成测试 |
|------|----------|----------|
| Lines | ≥80% | - |
| Functions | ≥80% | - |
| Branches | ≥80% | - |
| Statements | ≥80% | - |

### 7.2 覆盖率报告

```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   85.23 |    78.45 |   89.12 |   85.23 |
 src/modules/users  |   92.31 |    85.71 |   95.00 |   92.31 |
 src/modules/course |   88.88 |    80.00 |   90.00 |   88.88 |
```

### 7.3 覆盖率检查

```bash
# 检查覆盖率是否达标
npm run test:coverage

# 如果覆盖率下降，测试将失败
# 需要补充测试或调整阈值
```

---

## 八、最佳实践

### 8.1 单元测试最佳实践

| 实践 | 说明 |
|------|------|
| 每个方法至少一个测试 | 确保所有公开方法都被测试 |
| 测试边界条件 | 空值、极大值、极小值 |
| 测试错误情况 | 所有可能的错误路径 |
| 使用描述性测试名 | should..., when..., then... |
| 避免测试实现细节 | 只测试公开行为 |

### 8.2 集成测试最佳实践

| 实践 | 说明 |
|------|------|
| 每个用户故事一个测试 | 覆盖完整用户流程 |
| 使用真实业务流程 | 从用户视角测试 |
| 独立测试数据 | 每个测试使用独立数据 |
| 清理测试数据 | 测试后清理，避免污染 |
| 使用真实环境配置 | 确保测试环境与生产一致 |
| 按 HP/FC/EC 组织用例 | 便于理解和维护 |

### 8.3 测试用例命名规范

> **详细规范**: 请参考 [第四章 - 集成测试用例命名规范](#四集成测试用例命名规范)

集成测试用例按以下规则组织：

| 分类 | 前缀 | 示例 |
|------|------|------|
| Happy Path | HP | US1-HP-01, US5-HP-02 |
| Failed Cases | FC | US1-FC-01, US5-FC-02 |
| Edge Cases | EC | US1-EC-01, US5-EC-02 |

### 8.4 禁止的测试模式

```typescript
// ❌ Bad: 测试实现细节
it('should call putItem with correct params', () => {
  await userService.register(input);
  expect(putItem).toHaveBeenCalledWith({
    PK: 'USER#test',
    SK: 'METADATA',
    // ... 具体实现细节
  });
});

// ❌ Bad: 每个API都写集成测试
describe('Users API Integration', () => {
  it('should get users via API', async () => {
    const response = await request(app).get('/api/v1/users');
    expect(response.status).toBe(200);
  });
  it('should get user by id', async () => {
    const response = await request(app).get('/api/v1/users/123');
    expect(response.status).toBe(200);
  });
});

// ✅ Good: 在单元测试中覆盖所有逻辑
describe('UserService', () => {
  it('should register user', async () => {
    // 测试业务逻辑，不测试API路由
  });
});

// ✅ Good: 集成测试只做用户故事
describe('US1: 用户注册', () => {
  it('should complete registration flow', async () => {
    // 端到端验证用户流程
  });
});
```

---

## 九、相关文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 技术规范 | [technical-standards.md](./technical-standards.md) | 代码、API、数据库规范 |
| API规范 | [openapi.yaml](../../07-backend/docs/api/openapi.yaml) | RESTful API 定义 |
| DynamoDB设计 | 模块技术文档 | 各模块数据模型 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/docs/test-strategy.md`

**相关文档**:
- [技术规范](./technical-standards.md)
- [API规范](../../07-backend/docs/api/openapi.yaml)
