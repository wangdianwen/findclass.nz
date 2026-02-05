---
title: 技术实现 - 问卷调查系统
category: tech-architecture
created: 2026-01-26
author: linus-torvalds
version: 1.0
phase: 2
priority: P1
status: complete
related_feature: ../../05-product-design/feedback/survey.md
---

# 技术实现: 问卷调查系统

> **对应产品文档**: [survey.md](../../05-product-design/feedback/survey.md) | **优先级**: P1 | **排期**: Phase 2 | **状态**: 待实现

---

## 一、技术架构

### 1.1 模块位置

```
┌─────────────────────────────────────────────────────────────────────┐
│                      问卷调查系统技术架构                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [客户端层]                                                         │
│   ├── Web (React)                                                   │
│   │   ├── 问卷列表                                                   │
│   │   ├── 问卷详情                                                   │
│   │   ├── 问卷填写                                                   │
│   │   └── 问卷结果                                                   │
│   └── 微信小程序 (Taro)                                              │
│       └── 问卷入口                                                   │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [API Gateway (Express)]                                           │
│   ├── GET /api/v1/surveys                                           │
│   ├── GET /api/v1/surveys/:id                                       │
│   ├── POST /api/v1/surveys                                          │
│   ├── GET /api/v1/surveys/:id/questions                             │
│   ├── POST /api/v1/surveys/:id/responses                            │
│   └── GET /api/v1/surveys/:id/results                               │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [业务服务层]                                                       │
│   ├── SurveyService (问卷服务)                                       │
│   ├── SurveyQuestionService (问题服务)                               │
│   ├── SurveyResponseService (回答服务)                               │
│   └── SurveyAnalyticsService (分析服务)                              │
│                                                                     │
│         │                                                           │
│         ▼                                                           │
│   [数据存储层]                                                       │
│   ├── DynamoDB (FindClass-MainTable)                                │
│   │   ├── SURVEY#{surveyId}                                         │
│   │   ├── SURVEY_QUESTION#{questionId}                              │
│   │   └── SURVEY_RESPONSE#{responseId}                              │
│   └── DynamoDB (缓存)                                                │
│       ├── survey:{surveyId}                                         │
│       └── survey:responses:{surveyId}                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
07-backend/src/modules/surveys/
├── surveys.types.ts                 # 类型定义
├── surveys.service.ts               # 问卷服务
├── surveys.controller.ts            # 问卷API控制器
├── surveys.routes.ts                # 问卷路由
├── survey-questions.service.ts      # 问题服务
├── survey-responses.service.ts      # 回答服务
├── survey-analytics.service.ts      # 分析服务
└── index.ts                         # 模块导出

07-backend/src/lib/surveys/
├── survey-templates.ts              # 问卷模板
├── survey-validator.ts              # 问卷验证
└── survey-analytics.ts              # 分析工具
```

---

## 二、数据模型设计 (DynamoDB)

### 2.1 问卷类型定义

```typescript
// src/modules/surveys/surveys.types.ts

/**
 * 问卷状态
 */
export enum SurveyStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

/**
 * 问卷类型
 */
export enum SurveyType {
  NPS = 'nps',                       // Net Promoter Score
  SATISFACTION = 'satisfaction',     // 满意度调查
  FEEDBACK = 'feedback',             // 反馈调查
  RESEARCH = 'research',             // 市场研究
  CUSTOM = 'custom',                 // 自定义
}

/**
 * 目标用户类型
 */
export enum SurveyTarget {
  ALL_USERS = 'all_users',
  REGISTERED_USERS = 'registered_users',
  NEW_USERS = 'new_users',
  ACTIVE_USERS = 'active_users',
  STUDENTS = 'students',
  TEACHERS = 'teachers',
  INSTITUTIONS = 'institutions',
}

/**
 * 触发条件
 */
export enum SurveyTrigger {
  MANUAL = 'manual',                 // 手动触发
  SIGNUP = 'signup',                 // 注册后
  BOOKING = 'booking',               // 预订后
  COMPLETION = 'completion',         // 课程完成后
  INACTIVITY = 'inactivity',         // 长期不活跃
  TIME_BASED = 'time_based',         // 定时触发
}

/**
 * 展示规则
 */
export interface SurveyDisplayRule {
  maxResponses?: number;             // 最大回答数
  startDate?: string;                // 开始日期
  endDate?: string;                  // 结束日期
  showOncePerUser?: boolean;         // 每用户只展示一次
  showAfterTriggerDays?: number;     // 触发后多少天展示
  excludePages?: string[];           // 排除页面
}

/**
 * 奖励配置
 */
export interface SurveyReward {
  enabled: boolean;
  type: 'coupon' | 'credit' | 'points';
  value: number;                     // 优惠金额/积分数量
  description?: string;
  conditions?: string;               // 奖励条件
}

/**
 * 问卷 DynamoDB 类型
 */
export interface Survey {
  // DynamoDB 主键
  PK: string;           // SURVEY#{surveyId}
  SK: string;           // METADATA
  
  // 实体类型标识
  entityType: 'SURVEY';
  dataCategory: 'FEEDBACK';
  id: string;
  
  // 基本信息
  title: string;
  titleEn: string;
  description?: string;
  descriptionEn?: string;
  type: SurveyType;
  status: SurveyStatus;
  
  // 配置
  target: SurveyTarget;
  trigger: SurveyTrigger;
  displayRule: SurveyDisplayRule;
  reward?: SurveyReward;
  
  // 样式
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    fontFamily?: string;
  };
  
  // 进度
  totalQuestions: number;
  estimatedTime: number;             // 预计完成时间（分钟）
  
  // 统计
  totalInvited: number;
  totalResponses: number;
  completionRate: number;
  averageScore?: number;
  
  // 管理
  createdBy?: string;
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  closedAt?: string;
  
  // GSI 索引
  GSI35PK?: string;  // STATUS#{status}
  GSI35SK?: string;  // CREATED_AT#{createdAt}
  GSI36PK?: string;  // TYPE#{type}
  GSI36SK?: string;  // CREATED_AT#{createdAt}
}

/**
 * 问卷问题 DynamoDB 类型
 */
export interface SurveyQuestion {
  // DynamoDB 主键
  PK: string;           // SURVEY#{surveyId}
  SK: string;           // QUESTION#{questionId}
  
  // 实体类型标识
  entityType: 'SURVEY_QUESTION';
  dataCategory: 'FEEDBACK';
  id: string;
  
  // 关联
  surveyId: string;
  
  // 问题内容
  questionType: 'nps' | 'rating' | 'single_choice' | 'multiple_choice' | 'text' | 'scale';
  question: string;
  questionEn?: string;
  
  // 选项（选择题）
  options?: Array<{
    id: string;
    label: string;
    labelEn?: string;
    value: string | number;
  }>;
  
  // 配置
  isRequired: boolean;
  isAnonymous: boolean;             // 匿名回答
  order: number;                    // 排序
  
  // 验证规则
  validation?: {
    minLength?: number;
    maxLength?: number;
    minValue?: number;
    maxValue?: number;
  };
  
  // 逻辑规则
  logic?: {
    showIf?: {
      questionId: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
      value: any;
    };
  };
  
  createdAt: string;
  updatedAt: string;
}

/**
 * 问卷回答 DynamoDB 类型
 */
export interface SurveyResponse {
  // DynamoDB 主键
  PK: string;           // SURVEY#{surveyId}
  SK: string;           // RESPONSE#{responseId}
  
  // 实体类型标识
  entityType: 'SURVEY_RESPONSE';
  dataCategory: 'FEEDBACK';
  id: string;
  
  // 关联
  surveyId: string;
  
  // 回答者信息
  userId?: string;
  sessionId: string;
  isAnonymous: boolean;
  
  // 进度
  currentQuestionIndex: number;
  isCompleted: boolean;
  startedAt: string;
  completedAt?: string;
  
  // 答案
  answers: Array<{
    questionId: string;
    value: string | number | string[] | number[];
    answeredAt: string;
  }>;
  
  // 元数据
  deviceType?: string;
  browserInfo?: string;
  duration?: number;                // 完成耗时（秒）
  
  // 分数（NPS等）
  score?: number;
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  // GSI 索引
  GSI37PK?: string;  // USER#{userId}
  GSI37SK?: string;  // COMPLETED_AT#{completedAt}
  GSI38PK?: string;  // SURVEY#{surveyId}
  GSI38SK?: string;  // COMPLETED_AT#{completedAt}
}

/**
 * 问卷回答详情（每个问题的答案）
 */
export interface SurveyAnswerDetail {
  PK: string;           // SURVEY#{surveyId}
  SK: string;           // ANSWER#{responseId}#{questionId}
  
  entityType: 'SURVEY_ANSWER';
  dataCategory: 'FEEDBACK';
  id: string;
  
  surveyId: string;
  responseId: string;
  questionId: string;
  
  // 答案
  answerType: SurveyQuestion['questionType'];
  value: string | number | string[] | number[];
  
  // 时间戳
  answeredAt: string;
}

/**
 * 问卷统计
 */
export interface SurveyStatistics {
  PK: string;           // SURVEY_STATS#{surveyId}
  SK: string;           // METADATA
  
  entityType: 'SURVEY_STATS';
  dataCategory: 'FEEDBACK';
  id: string;
  
  surveyId: string;
  
  // 回答统计
  totalResponses: number;
  completedResponses: number;
  partialResponses: number;
  completionRate: number;
  
  // 分数统计
  averageScore: number;
  scoreDistribution: Record<number, number>;  // 分数 -> 数量
  
  // 问题统计
  questionStats: Array<{
    questionId: string;
    answeredCount: number;
    skippedCount: number;
    averageValue?: number;
    distribution?: Record<string, number>;
  }>;
  
  // 时间分布
  dailyResponses: Array<{
    date: string;
    count: number;
  }>;
  
  // 设备分布
  deviceDistribution: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  
  calculatedAt: string;
}
```

---

## 三、业务逻辑实现

### 3.1 问卷服务

```typescript
// src/modules/surveys/surveys.service.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@core/logger';
import {
  Survey,
  SurveyQuestion,
  SurveyResponse,
  SurveyStatistics,
  SurveyStatus,
  SurveyType,
  SurveyTarget,
  SurveyTrigger,
  createSurveyKey,
  createSurveyQuestionKey,
  createResponseKey,
} from './surveys.types';
import { putItem, getItem, queryItems, updateItem } from '@shared/db/dynamodb';
import { getFromCache, setCache, deleteCache } from '@shared/db/cache';

/**
 * 问卷服务类
 */
export class SurveyService {
  /**
   * 创建问卷
   */
  async createSurvey(data: {
    title: string;
    titleEn: string;
    description?: string;
    descriptionEn?: string;
    type: SurveyType;
    target: SurveyTarget;
    trigger: SurveyTrigger;
    displayRule?: any;
    reward?: any;
    theme?: any;
    createdBy?: string;
  }): Promise<Survey> {
    const surveyId = uuidv4();
    const now = new Date().toISOString();

    const survey: Survey = {
      ...createSurveyKey(surveyId),
      SK: 'METADATA',
      entityType: 'SURVEY',
      dataCategory: 'FEEDBACK',
      id: surveyId,
      ...data,
      status: SurveyStatus.DRAFT,
      totalQuestions: 0,
      estimatedTime: 0,
      totalInvited: 0,
      totalResponses: 0,
      completionRate: 0,
      createdAt: now,
      updatedAt: now,
      GSI35PK: `STATUS#${SurveyStatus.DRAFT}`,
      GSI35SK: `CREATED_AT#${now}`,
      GSI36PK: `TYPE#${data.type}`,
      GSI36SK: `CREATED_AT#${now}`,
    };

    await putItem(survey);

    logger.info('Survey created', { surveyId, type: data.type });

    return survey;
  }

  /**
   * 获取问卷
   */
  async getSurvey(surveyId: string): Promise<Survey | null> {
    const cacheKey = `survey:${surveyId}`;
    const cached = await getFromCache<Survey>(cacheKey, 'FEEDBACK');
    if (cached) return cached;

    const { PK, SK } = createSurveyKey(surveyId);
    const survey = await getItem<Survey>({ PK, SK });

    if (survey) {
      await setCache(cacheKey, 'FEEDBACK', survey, 300);
    }

    return survey;
  }

  /**
   * 获取问卷列表
   */
  async getSurveys(params: {
    status?: SurveyStatus;
    type?: SurveyType;
    page?: number;
    limit?: number;
  }): Promise<{ surveys: Survey[]; total: number }> {
    const { page = 1, limit = 20 } = params;

    if (params.status) {
      const result = await queryItems<Survey>({
        indexName: 'GSI35-SurveysByStatus',
        keyConditionExpression: 'GSI35PK = :pk',
        expressionAttributeValues: {
          ':pk': `STATUS#${params.status}`,
        },
        limit,
        scanIndexForward: false,
      });
      return { surveys: result.items, total: result.count };
    }

    const result = await queryItems<Survey>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': 'SURVEY',
        ':sk': 'METADATA',
      },
      limit,
      scanIndexForward: false,
    });

    return { surveys: result.items, total: result.count };
  }

  /**
   * 激活问卷
   */
  async activateSurvey(surveyId: string): Promise<Survey> {
    const survey = await this.getSurvey(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    if (survey.status !== SurveyStatus.DRAFT && survey.status !== SurveyStatus.PAUSED) {
      throw new Error('Survey cannot be activated');
    }

    const now = new Date().toISOString();

    const updated = await updateItem(
      createSurveyKey(surveyId),
      `SET #status = :status, startedAt = :now, GSI35PK = :pk, GSI35SK = :sk, updatedAt = :now`,
      {
        ':status': SurveyStatus.ACTIVE,
        ':now': now,
        ':pk': `STATUS#${SurveyStatus.ACTIVE}`,
        ':sk': `CREATED_AT#${survey.createdAt}`,
      },
      { '#status': 'status' }
    ) as Survey;

    await deleteCache(`survey:${surveyId}`, 'FEEDBACK');

    logger.info('Survey activated', { surveyId });

    return updated;
  }

  /**
   * 关闭问卷
   */
  async closeSurvey(surveyId: string): Promise<Survey> {
    const survey = await this.getSurvey(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    const now = new Date().toISOString();

    const updated = await updateItem(
      createSurveyKey(surveyId),
      `SET #status = :status, closedAt = :now, GSI35PK = :pk, GSI35SK = :sk, updatedAt = :now`,
      {
        ':status': SurveyStatus.CLOSED,
        ':now': now,
        ':pk': `STATUS#${SurveyStatus.CLOSED}`,
        ':sk': `CREATED_AT#${survey.createdAt}`,
      },
      { '#status': 'status' }
    ) as Survey;

    // 计算最终统计
    await this.calculateSurveyStats(surveyId);

    await deleteCache(`survey:${surveyId}`, 'FEEDBACK');

    logger.info('Survey closed', { surveyId });

    return updated;
  }

  /**
   * 添加问题
   */
  async addQuestion(surveyId: string, data: Omit<SurveyQuestion, 'PK' | 'SK' | 'entityType' | 'dataCategory' | 'id' | 'surveyId' | 'createdAt' | 'updatedAt'>): Promise<SurveyQuestion> {
    const survey = await this.getSurvey(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    const questionId = uuidv4();
    const now = new Date().toISOString();

    const question: SurveyQuestion = {
      PK: `SURVEY#${surveyId}`,
      SK: `QUESTION#${questionId}`,
      entityType: 'SURVEY_QUESTION',
      dataCategory: 'FEEDBACK',
      id: questionId,
      surveyId,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    await putItem(question);

    // 更新问卷问题数量
    await updateItem(
      createSurveyKey(surveyId),
      'SET totalQuestions = totalQuestions + :inc, updatedAt = :now',
      { ':inc': 1, ':now': now }
    );

    await deleteCache(`survey:${surveyId}`, 'FEEDBACK');

    logger.info('Survey question added', { surveyId, questionId });

    return question;
  }

  /**
   * 获取问卷问题
   */
  async getQuestions(surveyId: string): Promise<SurveyQuestion[]> {
    const cacheKey = `survey:${surveyId}:questions`;
    const cached = await getFromCache<SurveyQuestion[]>(cacheKey, 'FEEDBACK');
    if (cached) return cached;

    const result = await queryItems<SurveyQuestion>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': `SURVEY#${surveyId}`,
        ':sk': 'QUESTION#',
      },
      scanIndexForward: true,
    });

    const sorted = result.items.sort((a, b) => a.order - b.order);
    await setCache(cacheKey, 'FEEDBACK', sorted, 300);

    return sorted;
  }

  /**
   * 计算问卷统计
   */
  async calculateSurveyStats(surveyId: string): Promise<SurveyStatistics> {
    // 获取所有回答
    const responses = await this.getCompletedResponses(surveyId);

    // 计算统计
    const totalResponses = responses.length;
    const avgScore = this.calculateAverageScore(responses);
    const scoreDistribution = this.calculateScoreDistribution(responses);
    const questionStats = await this.calculateQuestionStats(surveyId, responses);

    const stats: SurveyStatistics = {
      PK: `SURVEY_STATS#${surveyId}`,
      SK: 'METADATA',
      entityType: 'SURVEY_STATS',
      dataCategory: 'FEEDBACK',
      id: surveyId,
      surveyId,
      totalResponses,
      completedResponses: totalResponses,
      partialResponses: 0,
      completionRate: 100,
      averageScore: avgScore,
      scoreDistribution,
      questionStats,
      dailyResponses: [],
      deviceDistribution: { desktop: 0, mobile: 0, tablet: 0 },
      calculatedAt: new Date().toISOString(),
    };

    await putItem(stats);

    // 更新问卷统计
    await updateItem(
      createSurveyKey(surveyId),
      'SET totalResponses = :total, averageScore = :avg, updatedAt = :now',
      { ':total': totalResponses, ':avg': avgScore, ':now': new Date().toISOString() }
    );

    return stats;
  }

  private async getCompletedResponses(surveyId: string): Promise<SurveyResponse[]> {
    const result = await queryItems<SurveyResponse>({
      keyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionAttributeValues: {
        ':pk': `SURVEY#${surveyId}`,
        ':sk': 'RESPONSE#',
      },
    });
    return result.items.filter(r => r.isCompleted);
  }

  private calculateAverageScore(responses: SurveyResponse[]): number {
    const scores = responses.filter(r => r.score !== undefined).map(r => r.score!);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10;
  }

  private calculateScoreDistribution(responses: SurveyResponse[]): Record<number, number> {
    const distribution: Record<number, number> = {};
    responses.forEach(r => {
      if (r.score !== undefined) {
        distribution[r.score] = (distribution[r.score] || 0) + 1;
      }
    });
    return distribution;
  }

  private async calculateQuestionStats(surveyId: string, responses: SurveyResponse[]): Promise<any[]> {
    const questions = await this.getQuestions(surveyId);
    
    return questions.map(q => ({
      questionId: q.id,
      answeredCount: responses.filter(r => 
        r.answers.some(a => a.questionId === q.id)
      ).length,
      skippedCount: responses.length - responses.filter(r => 
        r.answers.some(a => a.questionId === q.id)
      ).length,
    }));
  }
}

export const surveyService = new SurveyService();
```

---

## 四、API 设计

### 4.1 API 列表

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| **问卷操作** |
| GET | /api/v1/surveys | 获取问卷列表 | 公开 |
| GET | /api/v1/surveys/:id | 获取问卷详情 | 公开 |
| POST | /api/v1/surveys | 创建问卷 | 需登录/管理员 |
| PUT | /api/v1/surveys/:id | 更新问卷 | 需登录/管理员 |
| PUT | /api/v1/surveys/:id/activate | 激活问卷 | 需登录/管理员 |
| PUT | /api/v1/surveys/:id/close | 关闭问卷 | 需登录/管理员 |
| **问题操作** |
| GET | /api/v1/surveys/:id/questions | 获取问题列表 | 公开 |
| POST | /api/v1/surveys/:id/questions | 添加问题 | 需登录/管理员 |
| PUT | /api/v1/surveys/:id/questions/:qid | 更新问题 | 需登录/管理员 |
| **回答操作** |
| POST | /api/v1/surveys/:id/responses | 提交回答 | 需登录/公开 |
| GET | /api/v1/surveys/:id/responses/my | 我的回答 | 需登录 |
| **结果查询** |
| GET | /api/v1/surveys/:id/results | 获取统计结果 | 需登录/管理员 |
| GET | /api/v1/surveys/:id/export | 导出结果 | 需登录/管理员 |

### 4.2 API 详细设计

#### 4.2.1 POST /api/v1/surveys/:id/responses

**请求体**:
```json
{
  "answers": [
    {
      "questionId": "q1",
      "value": 9
    },
    {
      "questionId": "q2",
      "value": "非常满意"
    },
    {
      "questionId": "q3",
      "value": ["功能完善", "易于使用"]
    }
  ],
  "isAnonymous": false
}
```

**响应示例** (201):
```json
{
  "success": true,
  "data": {
    "responseId": "550e8400-e29b-41d4-a716-446655440000",
    "isCompleted": true,
    "score": 9,
    "reward": {
      "type": "coupon",
      "value": 10,
      "code": "SURVEY10OFF"
    }
  }
}
```

#### 4.2.2 GET /api/v1/surveys/:id/results

**响应示例** (200):
```json
{
  "success": true,
  "data": {
    "totalResponses": 1250,
    "completionRate": 85.5,
    "averageScore": 7.8,
    "nps": 42,
    "questionStats": [
      {
        "questionId": "q1",
        "question": "您对平台的整体满意度",
        "answeredCount": 1248,
        "averageValue": 8.2
      }
    ],
    "scoreDistribution": {
      "9": 450,
      "8": 380,
      "7": 220,
      "6": 100,
      "5": 50,
      "1": 50
    }
  }
}
```

---

## 五、前端实现

### 5.1 问卷组件

```typescript
// src/components/surveys/SurveyForm.tsx
import React, { useState, useEffect } from 'react';
import { Card, Button, Progress, Radio, Checkbox, Input, Slider, message } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { surveyApi } from '../../api/survey';
import { Survey, SurveyQuestion } from '../../types/survey';

const { TextArea } = Input;

interface SurveyFormProps {
  surveyId: string;
  onComplete?: (responseId: string, reward?: any) => void;
  onClose?: () => void;
}

export const SurveyForm: React.FC<SurveyFormProps> = ({
  surveyId,
  onComplete,
  onClose,
}) => {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSurvey();
  }, [surveyId]);

  const loadSurvey = async () => {
    setLoading(true);
    try {
      const [surveyData, questionsData] = await Promise.all([
        surveyApi.getSurvey(surveyId),
        surveyApi.getQuestions(surveyId),
      ]);
      setSurvey(surveyData);
      setQuestions(questionsData);
    } catch (error: any) {
      message.error('加载问卷失败');
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleAnswer = (value: any) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion!.id]: value,
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const answerList = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value,
      }));

      const result = await surveyApi.submitResponse(surveyId, {
        answers: answerList,
        isAnonymous: false,
      });

      message.success('感谢您的参与！');
      onComplete?.(result.responseId, result.reward);
    } catch (error: any) {
      message.error(error.message || '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = currentQuestion?.isRequired ? answers[currentQuestion.id] !== undefined : true;

  if (loading) {
    return <div>加载中...</div>;
  }

  if (!survey) {
    return <div>问卷不存在</div>;
  }

  return (
    <Card className="survey-form">
      {/* 进度条 */}
      <Progress percent={progress} showInfo={false} strokeColor="#1890ff" />
      
      {/* 问卷说明 */}
      <div className="survey-header">
        <h2>{survey.title}</h2>
        {survey.description && <p>{survey.description}</p>}
        {survey.reward?.enabled && (
          <div className="reward-badge">
            完成后可获得 {survey.reward.value} NZD 优惠券
          </div>
        )}
      </div>

      {/* 问题 */}
      <div className="question-container">
        <div className="question-number">
          问题 {currentIndex + 1} / {questions.length}
        </div>
        <h3 className="question-title">{currentQuestion?.question}</h3>

        {/* NPS 题 */}
        {currentQuestion?.questionType === 'nps' && (
          <div className="nps-scale">
            <div className="scale-labels">
              <span>完全不会</span>
              <span>一定会</span>
            </div>
            <Slider
              min={0}
              max={10}
              value={answers[currentQuestion.id]}
              onChange={handleAnswer}
              marks={{
                0: '0', 3: '3', 5: '5', 7: '7', 10: '10'
              }}
            />
            <div className="nps-classification">
              您的推荐意愿: {
                answers[currentQuestion.id] >= 9 ? '推荐者' :
                answers[currentQuestion.id] >= 7 ? '被动推荐者' :
                answers[currentQuestion.id] >= 6 ? '中立者' : '贬损者'
              }
            </div>
          </div>
        )}

        {/* 单选 */}
        {currentQuestion?.questionType === 'single_choice' && (
          <Radio.Group
            value={answers[currentQuestion.id]}
            onChange={(e) => handleAnswer(e.target.value)}
          >
            <div className="options">
              {currentQuestion.options?.map(opt => (
                <Radio key={opt.id} value={opt.value}>
                  {opt.label}
                </Radio>
              ))}
            </div>
          </Radio.Group>
        )}

        {/* 多选 */}
        {currentQuestion?.questionType === 'multiple_choice' && (
          <Checkbox.Group
            value={answers[currentQuestion.id]}
            onChange={(values) => handleAnswer(values)}
          >
            <div className="options">
              {currentQuestion.options?.map(opt => (
                <Checkbox key={opt.id} value={opt.value}>
                  {opt.label}
                </Checkbox>
              ))}
            </div>
          </Checkbox.Group>
        )}

        {/* 文本 */}
        {currentQuestion?.questionType === 'text' && (
          <TextArea
            rows={4}
            value={answers[currentQuestion.id]}
            onChange={(e) => handleAnswer(e.target.value)}
            placeholder="请输入您的回答..."
            maxLength={currentQuestion.validation?.maxLength || 1000}
          />
        )}
      </div>

      {/* 导航 */}
      <div className="survey-navigation">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          上一题
        </Button>
        <Button
          type="primary"
          onClick={handleNext}
          disabled={!canProceed}
          loading={submitting}
        >
          {currentIndex === questions.length - 1 ? '提交' : '下一题'}
          <ArrowRightOutlined />
        </Button>
      </div>
    </Card>
  );
};
```

---

## 六、测试用例

### 6.1 单元测试

```typescript
// src/modules/surveys/surveys.service.test.ts
import { surveyService } from './surveys.service';
import { mockPutItem, mockGetItem, mockQueryItems, mockUpdateItem } from '../../test/mocks';

describe('SurveyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSurvey', () => {
    it('should create survey successfully', async () => {
      (putItem as jest.Mock).mockResolvedValue({});

      const result = await surveyService.createSurvey({
        title: '用户满意度调查',
        titleEn: 'User Satisfaction Survey',
        type: 'satisfaction',
        target: 'all_users',
        trigger: 'manual',
      });

      expect(result).toBeDefined();
      expect(result.title).toBe('用户满意度调查');
      expect(result.status).toBe('draft');
    });
  });

  describe('activateSurvey', () => {
    it('should activate draft survey', async () => {
      const mockSurvey = {
        id: 'survey-123',
        status: 'draft',
        createdAt: new Date().toISOString(),
      };

      (getItem as jest.Mock).mockResolvedValueOnce(mockSurvey);
      (updateItem as jest.Mock).mockResolvedValue({
        ...mockSurvey,
        status: 'active',
      });

      const result = await surveyService.activateSurvey('survey-123');

      expect(result.status).toBe('active');
    });

    it('should reject activating closed survey', async () => {
      (getItem as jest.Mock).mockResolvedValueOnce({
        id: 'survey-123',
        status: 'closed',
      });

      await expect(
        surveyService.activateSurvey('survey-123')
      ).rejects.toThrow('Survey cannot be activated');
    });
  });

  describe('calculateSurveyStats', () => {
    it('should calculate correct average score', async () => {
      const mockResponses = [
        { id: 'r1', score: 9, answers: [] },
        { id: 'r2', score: 7, answers: [] },
        { id: 'r3', score: 8, answers: [] },
      ];

      (queryItems as jest.Mock)
        .mockResolvedValueOnce({ items: mockResponses })  // getCompletedResponses
        .mockResolvedValueOnce({ items: [] });            // getQuestions

      const result = await surveyService.calculateSurveyStats('survey-123');

      expect(result.averageScore).toBe(8);
    });
  });
});
```

---

## 七、验收标准

- [ ] 问卷创建和管理功能正常
- [ ] 问题创建和排序正确
- [ ] 问卷填写流程顺畅
- [ ] 回答提交和统计正确
- [ ] NPS 计算准确
- [ ] 奖励发放正确
- [ ] 问卷结果导出正常

---

## 八、风险分析

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 问卷回答率低 | 中 | 中 | 奖励机制，优化问卷长度 |
| 刷问卷 | 中 | 中 | IP 限制，登录验证 |
| 数据丢失 | 低 | 高 | 定期备份，多副本存储 |
| 问卷加载慢 | 低 | 中 | 缓存优化，CDN 加速 |

---

**文档路径**: `/Users/dianwenwang/Project/idea/06-tech-architecture/feedback/tech-feedback-survey.md`

**相关文档**:
- [产品设计](../../05-product-design/feedback/survey.md)
- [用户反馈系统](tech-feedback.md)
