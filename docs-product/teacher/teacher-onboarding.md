# 教师入驻 (Teacher Onboarding)

## 1. 概述

教师入驻是 FindClass.nz 平台教师端的核心功能，允许个人教师申请入驻平台，开设课程并招收学员。

## 2. 用户流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  入驻入口   │ -> │  填写信息   │ -> │  上传资质   │ -> │  提交审核   │ -> │  等待结果   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                          │         │
                                                                    ┌──────┴─────┐    │
                                                                    │   审核通过  │    │   审核拒绝
                                                                    └────────────┘    │
                                                                             │        │
                                                                       ┌─────▼─────┐    │
                                                                       │  开设课程  │    │  修改重试
                                                                       └───────────┘    │
```

## 3. 功能模块

### 3.1 入驻申请表单 (TeacherApplicationForm)

**字段说明：**

| 字段 | 类型 | 必填 | 验证规则 |
|------|------|------|----------|
| 真实姓名 | text | 是 | 2-20字符 |
| 身份证号 | text | 是 | 身份证格式 |
| 教学科目 | select | 是 | 单选 |
| 教学经验(年) | number | 是 | 0-50 |
| 最高学历 | select | 是 | 单选 |
| 毕业院校 | text | 是 | 2-50字符 |
| 教学简介 | textarea | 是 | 50-500字符 |
| 可授课区域 | select | 是 | 多选 |

**教学科目选项：**
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

**学历选项：**
- 高中/中专
- 大专
- 本科
- 硕士
- 博士
- 其他

### 3.2 资质上传 (QualificationUpload)

**上传要求：**

| 资质类型 | 必填 | 文件格式 | 文件大小 | 说明 |
|----------|------|----------|----------|------|
| 身份证正面 | 是 | JPG/PNG | ≤5MB | 个人身份证明 |
| 身份证反面 | 是 | JPG/PNG | ≤5MB | 个人身份证明 |
| 学历证书 | 是 | JPG/PDF | ≤10MB | 最高学历证明 |
| 教师资格证 | 否 | JPG/PDF | ≤10MB | 如有则提供 |
| 其他资质证明 | 否 | JPG/PDF | ≤10MB | 获奖证书等 |

**功能特性：**
- 拖拽上传
- 预览已上传图片
- 删除重新上传
- 文件名规范化处理

### 3.3 审核状态 (ApplicationStatus)

**状态流转：**

```
草稿 -> 待审核 -> 审核中 -> 审核通过/审核拒绝
                 ↓
            补充材料
```

**状态展示：**
- 审核中：显示进度条，预计审核时间
- 审核通过：显示成功信息，引导开设课程
- 审核拒绝：显示拒绝原因，提供修改入口

### 3.4 入驻成功页 (OnboardingSuccess)

**展示内容：**
- 恭喜入驻成功
- 快捷操作：开设课程、查看收益、学员管理
- 平台使用指南链接
- 客服联系方式

## 4. 页面结构

```
TeacherOnboardingPage/
├── index.tsx              # 主页面组件
├── TeacherOnboarding.module.scss
├── components/
│   ├── ApplicationForm/
│   │   ├── index.tsx
│   │   └── ApplicationForm.module.scss
│   ├── QualificationUpload/
│   │   ├── index.tsx
│   │   └── QualificationUpload.module.scss
│   ├── ApplicationStatus/
│   │   ├── index.tsx
│   │   └── ApplicationStatus.module.scss
│   └── OnboardingSuccess/
│       ├── index.tsx
│       └── OnboardingSuccess.module.scss
```

## 5. API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| POST `/api/v1/teachers/apply` | 提交入驻申请 |
| PUT `/api/v1/teachers/apply` | 更新申请信息 |
| GET `/api/v1/teachers/apply/status` | 查询审核状态 |
| POST `/api/v1/teachers/qualifications` | 上传资质文件 |
| GET `/api/v1/teachers/qualifications` | 获取资质列表 |
| DELETE `/api/v1/teachers/qualifications/:id` | 删除资质 |

## 6. 状态管理

使用 Zustand 管理入驻状态：

```typescript
interface TeacherOnboardingState {
  application: TeacherApplication | null;
  qualifications: Qualification[];
  currentStep: number;
  submissionStatus: 'draft' | 'pending' | 'approved' | 'rejected';
  setApplication: (app: TeacherApplication) => void;
  addQualification: (qual: Qualification) => void;
  removeQualification: (id: string) => void;
  setStep: (step: number) => void;
  setSubmissionStatus: (status: TeacherOnboardingState['submissionStatus']) => void;
}
```

## 7. 权限控制

| 角色 | 访问权限 |
|------|----------|
| 未登录 | 显示登录提示，引导注册/登录 |
| 普通用户 | 可访问入驻页面，提交申请 |
| 待审核教师 | 可查看状态，不可重复申请 |
| 已审核教师 | 跳转至教师仪表盘 |
| 机构管理员 | 不可访问 |

## 8. 国际化

### 英文键名

```json
{
  "teacherOnboarding": {
    "title": "Become a Teacher",
    "subtitle": "Share your knowledge and inspire students",
    "steps": {
      "basicInfo": "Basic Information",
      "qualifications": "Qualifications",
      "review": "Review & Submit"
    },
    "form": {
      "name": "Full Name",
      "namePlaceholder": "Enter your legal name",
      "idCard": "ID Number",
      "subject": "Teaching Subject",
      "experience": "Years of Experience"
    }
  }
}
```

### 中文键名

```json
{
  "teacherOnboarding": {
    "title": "申请成为教师",
    "subtitle": "分享知识，成就学生",
    "steps": {
      "basicInfo": "基本信息",
      "qualifications": "资质证明",
      "review": "确认提交"
    }
  }
}
```

## 9. 验收标准

- [ ] 用户可完成入驻申请表单填写
- [ ] 用户可上传并管理资质文件
- [ ] 显示正确的审核状态
- [ ] 审核通过后可访问教师仪表盘
- [ ] 支持中英文切换
- [ ] 响应式布局适配移动端
- [ ] 表单验证完整，错误提示清晰

## 10. 待办事项

- [ ] 创建产品文档
- [ ] 设计 UI/UX
- [ ] 实现前端页面
- [ ] 实现文件上传
- [ ] 对接后端 API
- [ ] 编写单元测试
- [ ] 编写 Storybook 文档
