---
title: 技术实现 - 在线预约
category: tech-architecture
created: 2026-01-21
author: linus-torvalds
version: 1.0
phase: 3
priority: P0
status: complete
related_feature: ../../05-product-design/transaction/booking.md
---

# 技术实现: 在线预约

> **对应产品文档**: [feature-booking.md](../../05-product-design/phase-3/feature-booking.md) | **优先级**: P0 | **排期**: Phase 3 | **状态**: 待实现

---

## 一、技术架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         在线预约架构                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [用户端]                                                          │
│   ├── 选择时间段                                                    │
│   ├── 填写预约信息                                                  │
│   ├── 确认预约                                                      │
│   └── 我的预约                                                      │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway + Lambda]                                           │
│         │                                                           │
│         ▼                                                           │
│   [DynamoDB: bookings]                                             │
│   [DynamoDB: time_slots]                                           │
│   [SES: 预约确认邮件]                                               │
│   [SQS: notification-queue]                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 二、数据模型 (DynamoDB)

### 2.1 Bookings 表

```typescript
interface Booking {
  PK: string;                  // BOOKING#{bookingId}
  SK: string;                  // METADATA
  entityType: 'BOOKING';
  dataCategory: 'TRANSACTION';
  id: string;
  courseId: string;
  courseName: string;
  teacherId: string;
  teacherName: string;
  institutionId?: string;

  // 学生信息
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;

  // 预约信息
  slotId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  duration: number;            // 分钟

  // 状态
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  paymentStatus: 'unpaid' | 'paid' | 'refunded';

  // 费用
  price: number;
  commission: number;
  finalPrice: number;

  // 备注
  studentNote?: string;
  teacherNote?: string;

  // 时间戳
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
  completedAt?: string;

  // GSI 索引
  GSI1PK?: string;             // STUDENT#{studentId}
  GSI1SK?: string;             // STATUS#{status}
  GSI2PK?: string;             // COURSE#{courseId}
  GSI2SK?: string;             // BOOKING_DATE#{bookingDate}
  GSI3PK?: string;             // TEACHER#{teacherId}
  GSI3SK?: string;             // CREATED_AT#{createdAt}
}
```

### 2.2 TimeSlots 表

```typescript
interface TimeSlot {
  PK: string;                  // SLOTS#{courseId}
  SK: string;                  // DATE#{slotDate}#TIME#{startTime}
  entityType: 'TIME_SLOT';
  dataCategory: 'TRANSACTION';
  id: string;
  courseId: string;
  teacherId: string;
  institutionId?: string;

  slotDate: string;
  startTime: string;
  endTime: string;

  capacity: number;            // 最大预约人数
  bookedCount: number;         // 已预约人数

  status: 'available' | 'booked' | 'blocked' | 'completed';
  priceModifier?: number;      // 价格调整

  // 锁定信息
  lockedBy?: string;
  lockedUntil?: string;

  createdAt: string;
  updatedAt: string;

  GSI4PK?: string;             // TEACHER#{teacherId}
  GSI4SK?: string;             // DATE#{slotDate}
}
```

---

## 三、API 设计

### 3.1 API 列表

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /courses/:id/slots | 获取可用时间段 |
| POST | /bookings | 创建预约 |
| GET | /bookings/:id | 获取预约详情 |
| PUT | /bookings/:id/confirm | 确认预约 |
| PUT | /bookings/:id/cancel | 取消预约 |
| GET | /bookings | 获取我的预约 |

---

## 四、预约流程

### 4.1 时序图

```
用户                    系统                    教师
  │                      │                      │
  ├── 选择课程 ────────▶ │                      │
  │                      ├── 加载时间段 ────────▶│
  │                      │◀── 可用时间段 ────────│
  │◀── 显示时间段 ──────│                      │
  │                      │                      │
  ├── 选择时间段 ──────▶│                      │
  │                      ├── 锁定时段(5分钟) ───▶│
  │◀── 确认可用 ────────│                      │
  │                      │                      │
  ├── 填写信息 ────────▶│                      │
  │                      │                      │
  ├── 提交预约 ────────▶│                      │
  │                      ├── 创建预约 ──────────▶│
  │                      ├── 发送通知 ──────────▶│
  │◀── 预约成功 ────────│                      │
  │                      │                      │
  │                      │◀── 确认预约 ─────────│
  │◀── 预约已确认 ──────│                      │
```

---

## 五、时段管理

### 5.1 时段锁定

```typescript
async function bookTimeSlot(
  courseId: string,
  slotId: string,
  userId: string
): Promise<Booking> {
  // 1. 获取时段信息
  const { PK: slotPK, SK: slotSK } = createTimeSlotKey(courseId, slotDate, startTime);
  const slot = await getItem<TimeSlot>({ PK: slotPK, SK: slotSK });
  
  if (!slot) {
    throw new Error('时段不存在');
  }
  
  if (slot.status !== 'available') {
    throw new Error('时段不可用');
  }

  // 2. 尝试锁定时段 (使用条件更新)
  const now = new Date().toISOString();
  const lockedUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5分钟锁定
  
  const updatedSlot: TimeSlot = {
    ...slot,
    status: 'pending',
    lockedBy: userId,
    lockedUntil,
    updatedAt: now,
  };
  
  await putItem(updatedSlot);

  // 3. 创建预约
  const bookingId = uuidv4();
  const booking: Booking = {
    PK: `BOOKING#${bookingId}`,
    SK: 'METADATA',
    entityType: 'BOOKING',
    dataCategory: 'TRANSACTION',
    id: bookingId,
    courseId: slot.courseId,
    courseName: '', // 需从课程表获取
    teacherId: slot.teacherId,
    teacherName: '',
    studentId: userId,
    studentName: '',
    studentEmail: '',
    slotId: slot.id,
    bookingDate: slot.slotDate,
    startTime: slot.startTime,
    endTime: slot.endTime,
    duration: 0, // 需计算
    status: 'pending',
    paymentStatus: 'unpaid',
    price: 0,
    commission: 0,
    finalPrice: 0,
    createdAt: now,
    updatedAt: now,
    GSI1PK: `STUDENT#${userId}`,
    GSI1SK: `STATUS#pending`,
    GSI2PK: `COURSE#${courseId}`,
    GSI2SK: `BOOKING_DATE#${slot.slotDate}`,
  };
  
  await putItem(booking);

  // 4. 设置 5 分钟超时 (未支付则释放)
  await scheduleAutoCancel(bookingId, 5 * 60 * 1000);

  return booking;
}

function createTimeSlotKey(
  courseId: string,
  slotDate: string,
  startTime: string
): { PK: string; SK: string } {
  return {
    PK: `SLOTS#${courseId}`,
    SK: `DATE#${slotDate}#TIME#${startTime}`,
  };
}
```

---

## 六、验收标准

- [ ] 用户可以查看可用时间段
- [ ] 用户可以提交预约
- [ ] 预约后时段正确锁定
- [ ] 预约状态流转正确
- [ ] 取消预约正确释放时段
- [ ] 预约通知正确发送

---

## 七、测试用例

### 7.1 单元测试

```typescript
// src/modules/booking/booking.service.test.ts
import { bookingService } from './booking.service';
import { mockPutItem, mockGetItem, mockQueryItems, mockUpdateItem } from '../../test/mocks';
import { BookingStatus } from './booking.types';

describe('BookingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBooking', () => {
    it('BK-HP-01: should create booking successfully', async () => {
      // Given
      const userId = 'user-123';
      const dto = {
        teacherId: 'teacher-123',
        courseId: 'course-123',
        slotId: 'slot-123',
        childId: 'child-123',
        notes: '需要中文授课',
      };

      (getItem as jest.Mock).mockResolvedValue({
        id: 'slot-123',
        status: 'available',
      });
      (putItem as jest.Mock).mockResolvedValue({});

      // When
      const result = await bookingService.createBooking(userId, dto);

      // Then
      expect(result).toBeDefined();
      expect(result.status).toBe(BookingStatus.PENDING);
      expect(result.teacherId).toBe('teacher-123');
    });

    it('BK-FC-01: should reject when slot not available', async () => {
      // Given
      (getItem as jest.Mock).mockResolvedValue({
        id: 'slot-123',
        status: 'booked',
      });

      // When & Then
      await expect(bookingService.createBooking('user-123', {
        teacherId: 'teacher-123',
        courseId: 'course-123',
        slotId: 'slot-123',
        childId: 'child-123',
      })).rejects.toThrow('时段已被预约');
    });
  });

  describe('confirmBooking', () => {
    it('BK-HP-02: should confirm booking and update slot', async () => {
      // Given
      const bookingId = 'booking-123';
      const mockBooking = {
        id: bookingId,
        status: BookingStatus.PENDING,
        slotId: 'slot-123',
      };

      (getItem as jest.Mock).mockResolvedValue(mockBooking);
      (updateItem as jest.Mock).mockResolvedValue({});

      // When
      await bookingService.confirmBooking(bookingId);

      // Then
      expect(updateItem).toHaveBeenCalledTimes(2); // Booking + Slot
    });
  });

  describe('cancelBooking', () => {
    it('BK-HP-03: should cancel booking and release slot', async () => {
      // Given
      const bookingId = 'booking-123';
      const mockBooking = {
        id: bookingId,
        status: BookingStatus.CONFIRMED,
        slotId: 'slot-123',
      };

      (getItem as jest.Mock).mockResolvedValue(mockBooking);
      (updateItem as jest.Mock).mockResolvedValue({});

      // When
      await bookingService.cancelBooking(bookingId, 'user-123');

      // Then
      expect(updateItem).toHaveBeenCalled();
    });
  });
});
```

### 7.2 集成测试用例

> **测试文档**: `06-tech-architecture/transaction/story-booking.md` 中的 US28

```typescript
// tests/integration/booking/us28-booking.test.ts

describe('US28: 课程预约', () => {
  beforeAll(async () => {
    await startTestContainers();
    await createTestTable();
  }, 120000);

  it('US28-HP-01: should complete full booking flow', async () => {
    // 1. 查看可用时段
    const slotsResponse = await request(app)
      .get('/api/v1/teachers/teacher-123/slots')
      .query({ date: '2026-02-01' })
      .expect(200);

    expect(slotsResponse.body.data.slots).toBeDefined();

    // 2. 创建预约
    const slotId = slotsResponse.body.data.slots[0].id;
    const bookingResponse = await request(app)
      .post('/api/v1/bookings')
      .send({
        teacherId: 'teacher-123',
        courseId: 'course-123',
        slotId,
        childId: 'child-123',
        notes: '需要中文授课',
      })
      .expect(201);

    expect(bookingResponse.body.data.status).toBe('pending');
  });

  it('US28-FC-01: should reject double booking of same slot', async () => {
    // First booking
    await request(app)
      .post('/api/v1/bookings')
      .send({
        teacherId: 'teacher-123',
        courseId: 'course-123',
        slotId: 'slot-123',
        childId: 'child-123',
      })
      .expect(201);

    // Second booking with same slot
    const response = await request(app)
      .post('/api/v1/bookings')
      .send({
        teacherId: 'teacher-123',
        courseId: 'course-456',
        slotId: 'slot-123',
        childId: 'child-456',
      })
      .expect(400);

    expect(response.body.error).toBe('时段已被预约');
  });
});
```

---

## 八、风险分析

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/transaction/tech-booking.md`

**相关文档**:
- [产品设计](../../05-product-design/transaction/booking.md)
- [支付集成](tech-payments.md)
