# 课程管理 (Course Management)

## 1. 概述

课程管理是 FindClass.nz 平台教师端的核心功能，允许已入驻教师管理自己的课程，包括创建新课程、编辑现有课程、上下架课程、查看课程数据统计等。

## 2. 用户流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  教师后台   │ -> │  我的课程   │ -> │  新建/编辑  │ -> │  预览发布   │ -> │  课程管理   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                                   │
                                                                      ┌────────────┴────────────┐
                                                                      │      上架/下架/删除      │
                                                                      └─────────────────────────┘
```

## 3. 功能模块

### 3.1 课程列表 (CourseList)

**功能特性：**
- 展示教师创建的所有课程
- 支持分页显示
- 支持按状态筛选（全部/已发布/草稿/已暂停）
- 支持按关键词搜索
- 显示课程基础信息：标题、科目、年级、价格、状态、创建时间
- 操作按钮：编辑、预览、上下架、删除

### 3.2 课程表单 (CourseForm)

**字段说明：**

| 字段 | 类型 | 必填 | 验证规则 |
|------|------|------|----------|
| 课程标题 | text | 是 | 5-100字符 |
| 副标题 | text | 否 | 最多200字符 |
| 所属科目 | select | 是 | 单选 |
| 适合年级 | select | 是 | 单选或多选 |
| 授课方式 | radio | 是 | 线上/线下 |
| 授课城市 | select | 线下必填 | 单选 |
| 授课区域 | select | 线下必填 | 单选 |
| 总课时数 | number | 是 | 1-200 |
| 单节课时长 | number | 是 | 30-180（分钟） |
| 课程价格 | number | 是 | 0-10000 |
| 课程简介 | textarea | 是 | 50-2000字符 |
| 授课时间安排 | text | 是 | 描述可用时间 |
| 授课语言 | select | 是 | 单选 |
| 课程封面 | image | 是 | JPG/PNG, ≤5MB |

**科目选项：**
- 语文/中文
- 数学
- 英语
- 物理
- 化学
- 生物
- 科学
- 地理
- 历史
- 政治/思想品德
- 音乐
- 美术/艺术
- 体育/健康
- 信息技术/计算机
- 其他

**年级选项：**
- 幼儿园
- 小学 (1-3年级)
- 小学 (4-6年级)
- 初中
- 高中
- 成人

**授课语言选项：**
- 中文授课
- 英文授课
- 中英双语

### 3.3 上下架开关 (StatusToggle)

**功能特性：**
- 切换课程发布状态（发布/暂停）
- 确认弹窗提示
- 状态变更实时保存
- 显示当前状态标签

### 3.4 数据统计 (CourseStats)

**统计指标：**
- 总课程数
- 已发布课程数
- 草稿课程数
- 总学员数
- 总课时数
- 平均评分

## 4. 页面结构

```
CourseManagementPage/
├── index.tsx                        # 主页面组件
├── CourseManagement.module.scss
├── components/
│   ├── CourseStats/
│   │   ├── index.tsx
│   │   └── CourseStats.module.scss
│   ├── CourseList/
│   │   ├── index.tsx
│   │   └── CourseList.module.scss
│   ├── CourseForm/
│   │   ├── index.tsx
│   │   └── CourseForm.module.scss
│   └── StatusToggle/
│       ├── index.tsx
│       └── StatusToggle.module.scss
└── data/
    └── courseManagementData.ts      # Mock 数据
```

## 5. API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| GET `/api/v1/teacher/courses` | 获取我的课程列表 |
| GET `/api/v1/teacher/courses/:id` | 获取课程详情 |
| POST `/api/v1/teacher/courses` | 创建课程 |
| PUT `/api/v1/teacher/courses/:id` | 更新课程 |
| DELETE `/api/v1/teacher/courses/:id` | 删除课程 |
| PUT `/api/v1/teacher/courses/:id/publish` | 发布课程 |
| PUT `/api/v1/teacher/courses/:id/unpublish` | 下架课程 |
| GET `/api/v1/teacher/courses/stats` | 获取课程统计 |

## 6. 状态管理

使用 Zustand 管理课程状态：

```typescript
interface CourseManagementState {
  courses: TeacherCourse[];
  stats: CourseStats;
  currentCourse: TeacherCourse | null;
  loading: boolean;
  error: string | null;
  filters: {
    status: 'all' | 'published' | 'draft' | 'paused';
    keyword: string;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  setCourses: (courses: TeacherCourse[]) => void;
  setStats: (stats: CourseStats) => void;
  setCurrentCourse: (course: TeacherCourse | null) => void;
  setFilters: (filters: Partial<CourseManagementState['filters']>) => void;
  setPagination: (pagination: Partial<CourseManagementState['pagination']>) => void;
  addCourse: (course: TeacherCourse) => void;
  updateCourse: (id: string, updates: Partial<TeacherCourse>) => void;
  removeCourse: (id: string) => void;
}
```

## 7. 权限控制

| 角色 | 访问权限 |
|------|----------|
| 未登录 | 重定向到登录页 |
| 普通用户 | 重定向到教师入驻页 |
| 待审核教师 | 显示审核中状态，不可操作 |
| 已审核教师 | 完整访问权限 |
| 机构管理员 | 不可访问 |

## 8. 国际化

### 英文键名

```json
{
  "courseManagement": {
    "title": "My Courses",
    "pageTitle": "Course Management",
    "subtitle": "Manage your courses and track performance",

    "stats": {
      "totalCourses": "Total Courses",
      "publishedCourses": "Published",
      "draftCourses": "Drafts",
      "pausedCourses": "Paused",
      "totalStudents": "Total Students",
      "totalLessons": "Total Lessons",
      "avgRating": "Average Rating"
    },

    "filters": {
      "all": "All",
      "published": "Published",
      "draft": "Draft",
      "paused": "Paused",
      "searchPlaceholder": "Search courses..."
    },

    "table": {
      "title": "Course Title",
      "subject": "Subject",
      "grade": "Grade",
      "price": "Price",
      "status": "Status",
      "createdAt": "Created",
      "actions": "Actions"
    },

    "status": {
      "published": "Published",
      "draft": "Draft",
      "paused": "Paused"
    },

    "actions": {
      "create": "Create Course",
      "edit": "Edit",
      "preview": "Preview",
      "publish": "Publish",
      "pause": "Pause",
      "delete": "Delete",
      "deleteConfirm": "Are you sure you want to delete this course?",
      "confirm": "Confirm",
      "cancel": "Cancel"
    },

    "empty": {
      "title": "No courses yet",
      "description": "Create your first course to start teaching",
      "action": "Create Course"
    },

    "form": {
      "createTitle": "Create Course",
      "editTitle": "Edit Course",
      "basicInfo": "Basic Information",
      "courseDetails": "Course Details",
      "pricing": "Pricing",
      "schedule": "Schedule",
      "media": "Cover Image",

      "title": "Course Title",
      "titlePlaceholder": "Enter course title",
      "subtitle": "Subtitle",
      "subtitlePlaceholder": "Brief description (optional)",

      "subject": "Subject",
      "grade": "Grade Level",
      "teachingMode": "Teaching Mode",
      "city": "City",
      "region": "Region",
      "lessonCount": "Total Lessons",
      "lessonDuration": "Lesson Duration",
      "price": "Price per Lesson",
      "description": "Description",
      "descriptionPlaceholder": "Describe your course in detail...",
      "schedule": "Schedule",
      "schedulePlaceholder": "e.g., Weekend afternoons",
      "language": "Teaching Language",
      "coverImage": "Cover Image",
      "coverImageUpload": "Upload Cover",

      "saveDraft": "Save as Draft",
      "publish": "Publish",
      "cancel": "Cancel"
    },

    "messages": {
      "createSuccess": "Course created successfully",
      "updateSuccess": "Course updated successfully",
      "deleteSuccess": "Course deleted successfully",
      "publishSuccess": "Course published successfully",
      "pauseSuccess": "Course paused successfully",
      "error": "An error occurred"
    }
  }
}
```

### 中文键名

```json
{
  "courseManagement": {
    "title": "我的课程",
    "pageTitle": "课程管理",
    "subtitle": "管理您的课程并跟踪表现",

    "stats": {
      "totalCourses": "课程总数",
      "publishedCourses": "已发布",
      "draftCourses": "草稿",
      "pausedCourses": "已暂停",
      "totalStudents": "学员总数",
      "totalLessons": "总课时数",
      "avgRating": "平均评分"
    },

    "filters": {
      "all": "全部",
      "published": "已发布",
      "draft": "草稿",
      "paused": "已暂停",
      "searchPlaceholder": "搜索课程..."
    },

    "table": {
      "title": "课程标题",
      "subject": "科目",
      "grade": "年级",
      "price": "价格",
      "status": "状态",
      "createdAt": "创建时间",
      "actions": "操作"
    },

    "status": {
      "published": "已发布",
      "draft": "草稿",
      "paused": "已暂停"
    },

    "actions": {
      "create": "创建课程",
      "edit": "编辑",
      "preview": "预览",
      "publish": "发布",
      "pause": "暂停",
      "delete": "删除",
      "deleteConfirm": "确定要删除这门课程吗？",
      "confirm": "确认",
      "cancel": "取消"
    },

    "empty": {
      "title": "还没有课程",
      "description": "创建第一门课程开始授课吧",
      "action": "创建课程"
    },

    "form": {
      "createTitle": "创建课程",
      "editTitle": "编辑课程",
      "basicInfo": "基本信息",
      "courseDetails": "课程详情",
      "pricing": "价格设置",
      "schedule": "时间安排",
      "media": "封面图片",

      "title": "课程标题",
      "titlePlaceholder": "请输入课程标题",
      "subtitle": "副标题",
      "subtitlePlaceholder": "简短描述（选填）",

      "subject": "教学科目",
      "grade": "适合年级",
      "teachingMode": "授课方式",
      "city": "授课城市",
      "region": "授课区域",
      "lessonCount": "总课时数",
      "lessonDuration": "单节时长",
      "price": "课程价格",
      "description": "课程简介",
      "descriptionPlaceholder": "详细介绍您的课程...",
      "schedule": "授课时间",
      "schedulePlaceholder": "例如：周末下午",
      "language": "授课语言",
      "coverImage": "课程封面",
      "coverImageUpload": "上传封面",

      "saveDraft": "保存草稿",
      "publish": "发布课程",
      "cancel": "取消"
    },

    "messages": {
      "createSuccess": "课程创建成功",
      "updateSuccess": "课程更新成功",
      "deleteSuccess": "课程删除成功",
      "publishSuccess": "课程发布成功",
      "pauseSuccess": "课程已暂停",
      "error": "操作失败，请重试"
    }
  }
}
```

## 9. 验收标准

- [ ] 用户可查看所有已创建的课程列表
- [ ] 用户可按状态筛选课程
- [ ] 用户可搜索课程
- [ ] 用户可创建新课程
- [ ] 用户可编辑现有课程
- [ ] 用户可发布/暂停课程
- [ ] 用户可删除课程
- [ ] 用户可查看课程数据统计
- [ ] 支持中英文切换
- [ ] 响应式布局适配移动端
- [ ] 表单验证完整，错误提示清晰

## 10. 待办事项

- [x] 创建产品文档
- [ ] 实现前端页面
- [ ] 添加单元测试
- [ ] 编写 Storybook 文档
- [ ] 对接后端 API
