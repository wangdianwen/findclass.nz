# 页面功能开发追踪清单

> **生成日期**: 2026-02-01 | **状态**: 持续更新
>
> **目的**: 追踪所有产品文档中定义的页面/功能的开发、测试、Storybook和API调用状态
>
> **相关文档**: [开发规范索引](docs/DEVELOPMENT_GUIDELINE.md) | [测试策略](docs/TESTING_STRATEGY.md)

---

## 一、项目结构概览

### 1.1 文档模块分布

| 模块                                  | 文档数量 | 优先级           |
| ------------------------------------- | -------- | ---------------- |
| [基础页面 (pages)](#基础页面)         | 8        | P0 (MVP)         |
| [课程模块 (course)](#二课程模块)      | 4        | P0 (MVP/Phase 1) |
| [用户模块 (user)](#三用户模块)        | 5        | P0 (MVP/Phase 2) |
| [交易模块 (transaction)](#四交易模块) | 4        | P0 (Phase 3)     |
| [教师模块 (teacher)](#五教师模块)     | 2        | P0 (Phase 2)     |
| [机构模块 (institution)](#六机构模块) | 2        | P0 (Phase 2)     |
| [信任模块 (trust)](#七信任模块)       | 4        | P0 (MVP)         |
| [增长模块 (growth)](#八增长模块)      | 3        | P1               |
| [反馈模块 (feedback)](#九反馈模块)    | 1        | P0 (Phase 1)     |
| [广告模块 (ads)](#十广告模块)         | 1        | P1               |
| [管理模块 (admin)](#十一管理模块)     | 2        | P1               |
| [国际化 (i18n)](#十二国际化)          | 1        | P0 (MVP)         |

---

## 基础页面 (pages)

### 基础页面列表

| 页面        | 路由               | 文件位置                        | 状态      | Storybook |
| ----------- | ------------------ | ------------------------------- | --------- | --------- |
| 首页        | `/`                | `src/pages/HomePage/`           | ✅ 已完成 | ✅        |
| 404 页面    | `*`                | `src/pages/NotFoundPage/`       | ✅ 已完成 | ✅        |
| 关于我们    | `/about`           | `src/pages/AboutPage/`          | ✅ 已完成 | ✅        |
| Cookie 政策 | `/cookie-policy`   | `src/pages/CookiePolicyPage/`   | ✅ 已完成 | ✅        |
| 隐私政策    | `/privacy-policy`  | `src/pages/PrivacyPolicyPage/`  | ✅ 已完成 | ✅        |
| 服务条款    | `/terms`           | `src/pages/TermsOfServicePage/` | ✅ 已完成 | ✅        |
| 帮助中心    | `/help`            | `src/pages/HelpCentrePage/`     | ✅ 已完成 | ✅        |
| 联系我们    | `/contact`         | `src/pages/ContactPage/`        | ✅ 已完成 | ✅        |
| 反馈建议    | `/feedback`        | `src/pages/FeedbackPage/`       | ✅ 已完成 | ✅        |
| 课程搜索页  | `/courses`         | `src/pages/CourseSearchPage/`   | ✅ 已完成 | ✅        |
| 课程详情页  | `/courses/:id`     | `src/pages/CourseDetailPage/`   | ✅ 已完成 | ✅        |
| 登录页      | `/login`           | `src/pages/LoginPage/`          | ✅ 已完成 | ✅        |
| 注册页      | `/register`        | `src/pages/RegisterPage/`       | ✅ 已完成 | ✅        |
| 忘记密码页  | `/forgot-password` | `src/pages/ForgotPasswordPage/` | ✅ 已完成 | ✅        |

---

## 二、课程模块

### 2.1 课程搜索 (course-search)

| 属性          | 状态      | 详情                                   |
| ------------- | --------- | -------------------------------------- |
| **产品文档**  | ✅ 已创建 | `docs-product/course/course-search.md` |
| **状态**      | ✅ 已完成 | MVP, Priority P0                       |
| **前端页面**  | ✅ 已完成 | `src/pages/CourseSearchPage/`          |
| **组件拆分**  |           |                                        |
| - 搜索栏      | ✅ 已完成 | CourseSearchPanel.tsx                  |
| - 筛选面板    | ✅ 已完成 | Cascader + Select 组合                 |
| - 课程列表    | ✅ 已完成 | CourseList.tsx (可复用)                |
| - 分页组件    | ✅ 已完成 | CourseList 内置 Prev/Next              |
| - 空状态      | ✅ 已完成 | CourseList 内置 EmptyState             |
| **交互功能**  |           |                                        |
| - 关键字搜索  | ✅ 已完成 | 1秒debounce + IME中文输入支持          |
| - 地区筛选    | ✅ 已完成 | Cascader 三级联动 (城市-区域-子区域)   |
| - 科目筛选    | ✅ 已完成 | Select 下拉选择                        |
| - 年级筛选    | ✅ 已完成 | Select 下拉选择                        |
| - 授课方式    | ✅ 已完成 | Select 下拉选择                        |
| - 排序功能    | ✅ 已完成 | Best Match (默认) + 4种排序            |
| - 清空筛选    | ✅ 已完成 | Clear 按钮，高度匹配 Select            |
| - Home页跳转  | ✅ 已完成 | HeroSection tags 跳转带filter          |
| **单元测试**  | ✅ 已完成 | 137 tests passed                       |
| **Storybook** | ✅ 已完成 | CourseSearchPage.stories.tsx           |
| **API调用**   | ❌ 待对接 | Mock数据已完成                         |

### 2.2 课程详情 (course-detail)

| 属性            | 状态      | 详情                                                                                     |
| --------------- | --------- | ---------------------------------------------------------------------------------------- |
| **产品文档**    | ✅ 已创建 | `docs-product/course/course-detail.md`                                                   |
| **状态**        | ✅ 已完成 | MVP, Priority P0                                                                         |
| **前端页面**    | ✅ 已完成 | `src/pages/CourseDetailPage/`                                                            |
| **组件拆分**    |           |                                                                                          |
| - 课程信息卡片  | ✅ 已实现 | 内置于 CourseDetailPage                                                                  |
| - 教师信息模块  | ✅ 已实现 | Teacher card with avatar, stats                                                          |
| - 评价预览      | ✅ 已实现 | Rating in header                                                                         |
| - 收藏/联系按钮 | ✅ 已实现 | Contact & Save buttons                                                                   |
| - 相似课程推荐  | ✅ 已实现 | SimilarCourses section                                                                   |
| - 图片画廊      | ✅ 已实现 | Main image + thumbnails                                                                  |
| - 标签页        | ✅ 已实现 | About/Teacher/Schedule tabs                                                              |
| - 举报功能      | ✅ 已完成 | ReportModal with dropdown                                                                |
| - 联系功能      | ✅ 已完成 | Contact Now modal with SimpleForm                                                        |
| - 微信联系方式  | ✅ 已完成 | WeChat ID display                                                                        |
| **单元测试**    | ❌ 未创建 |                                                                                          |
| **Storybook**   | ✅ 已完成 | CourseDetailPage.stories.tsx (WithWeChat, ContactAsLoggedInUser, ContactAsLoggedOutUser) |
| **API调用**     | ❌ 待对接 | Mock数据已完成                                                                           |

### 2.3 课程管理 (course-management)

| 属性            | 状态      | 详情                                                                      |
| --------------- | --------- | ------------------------------------------------------------------------- |
| **产品文档**    | ✅ 已创建 | `docs-product/course/course-management.md`                                |
| **状态**        | ✅ 已完成 | Phase 2, Priority P0                                                      |
| **前端页面**    | ✅ 已完成 | `src/pages/CourseManagementPage/`                                         |
| **组件拆分**    |           |                                                                           |
| - 课程列表      | ✅ 已完成 | CourseList (列表、分页、搜索)                                             |
| - 新建/编辑表单 | ✅ 已完成 | CourseForm (5行布局、封面上传、ReactQuill富文本)                          |
| - 上下架开关    | ✅ 已完成 | StatusToggle                                                              |
| - 数据统计      | ✅ 已完成 | CourseStats (4卡片，限制5门提示)                                          |
| **功能特性**    |           |                                                                           |
| - 课程CRUD      | ✅ 已完成 | 创建/编辑/删除/预览                                                       |
| - 状态管理      | ✅ 已完成 | published/draft/paused                                                    |
| - 发布限制      | ✅ 已完成 | 最多5门已发布课程，红色警告                                               |
| - 封面图片      | ✅ 已完成 | ImgCrop裁剪，最多3张                                                      |
| - 富文本描述    | ✅ 已完成 | ReactQuill HTML内容                                                       |
| - 表单验证      | ✅ 已完成 | 标题5-100字、描述20-5000字                                                |
| - 国际化        | ✅ 已完成 | EN + ZH 翻译                                                              |
| **单元测试**    | ✅ 已完成 | CourseStats tests                                                         |
| **Storybook**   | ✅ 已完成 | CourseManagementPage.stories.tsx (Default/LimitExceeded/CreateCourseMode) |
| **API调用**     | ❌ 待对接 | Mock数据已完成                                                            |
| **后端API**     |           |                                                                           |
| - 我的课程列表  | 📋 待开发 | `/api/v1/teacher/courses`                                                 |
| - 创建课程      | 📋 待开发 | POST `/api/v1/teacher/courses`                                            |
| - 更新课程      | 📋 待开发 | PUT `/api/v1/teacher/courses/{id}`                                        |
| - 删除课程      | 📋 待开发 | DELETE `/api/v1/teacher/courses/{id}`                                     |
| - 课程统计      | 📋 待开发 | `/api/v1/teacher/courses/stats`                                           |

### 2.4 课程评价 (course-reviews)

| 属性            | 状态      | 详情                                                         |
| --------------- | --------- | ------------------------------------------------------------ |
| **产品文档**    | ✅ 已创建 | `docs-product/course/course-reviews.md`                      |
| **状态**        | ✅ 已完成 | Phase 3, Priority P0                                         |
| **前端页面**    | ✅ 已完成 | `src/pages/ReviewsPage/`                                     |
| **组件拆分**    |           |                                                              |
| - 评价列表      | ✅ 已完成 | 内置于 ReviewsPage (Tabs)                                    |
| - 评价卡片      | ✅ 已完成 | ReviewCard                                                   |
| - 评价表单      | ✅ 已完成 | ReviewForm                                                   |
| - 评分统计      | ✅ 已完成 | ReviewStats                                                  |
| **功能特性**    |           |                                                              |
| - 综合评分      | ✅ 已完成 | 5星评分展示                                                  |
| - 维度评分      | ✅ 已完成 | 教学/课程/沟通/守时 4个维度                                  |
| - 评分分布      | ✅ 已完成 | 5-1星分布条                                                  |
| - 评价标签      | ✅ 已完成 | 预设标签选择(最多3个)                                        |
| - 筛选排序      | ✅ 已完成 | 星级筛选 + 最近/最热排序                                     |
| - 分页功能      | ✅ 已完成 | Ant Design Pagination (10条/页)                              |
| - 教师回复      | ✅ 已完成 | TeacherRepliesSection (TeacherCentre)                        |
| - 举报功能      | ✅ 已完成 | SimpleForm modal with reason dropdown                        |
| - 点赞功能      | ✅ 已完成 | helpfulCount                                                 |
| - 我的评价      | ✅ 已完成 | UserCenter MyReviews tab with edit modal                     |
| - 课程/教师链接 | ✅ 已完成 | Clickable links to course/teacher detail                     |
| **单元测试**    | ✅ 已完成 | 205 tests passed                                             |
| **Storybook**   | ✅ 已完成 | ReviewsPage.stories.tsx (Default, NoReviews, WithPagination) |
| **API调用**     | ❌ 待对接 | Mock数据已完成                                               |
| **后端API**     |           |                                                              |
| - 评价列表      | 📋 待开发 | `/api/v1/courses/{id}/reviews`                               |
| - 提交评价      | 📋 待开发 | POST `/api/v1/courses/{id}/reviews`                          |
| - 评价统计      | 📋 待开发 | `/api/v1/courses/{id}/reviews/stats`                         |

---

## 三、用户模块

### 3.1 用户注册 (user-registration)

| 属性                     | 状态      | 详情                                                |
| ------------------------ | --------- | --------------------------------------------------- |
| **产品文档**             | ✅ 已创建 | `docs-product/user/user-registration.md`            |
| **状态**                 | ✅ 已完成 | MVP, Priority P0                                    |
| **前端页面**             | ✅ 已完成 | LoginPage, RegisterPage, ForgotPasswordPage         |
| **登录功能**             |           |                                                     |
| - 邮箱验证码登录         | ✅ 已完成 | LoginPage with email/code                           |
| - Google 社交登录        | ✅ 已完成 | Full-color Google icon, mock API                    |
| - WeChat 社交登录        | ✅ 已完成 | WeChat green icon, mock API                         |
| **注册功能**             |           |                                                     |
| - 邮箱验证码注册         | ✅ 已完成 | RegisterPage with email/code                        |
| - 密码字段               | ✅ 已完成 | Password input with visibility toggle               |
| - 确认密码               | ✅ 已完成 | Confirm password with validation                    |
| - 服务条款链接           | ✅ 已完成 | Terms of Service and Privacy Policy                 |
| **忘记密码功能**         |           |                                                     |
| - 简化流程               | ✅ 已完成 | Email + new password + code (same as register)      |
| **密码验证**             |           |                                                     |
| - 最低长度8字符          | ✅ 已完成 | Validation rule                                     |
| - 小写字母               | ✅ 已完成 | Validation rule                                     |
| - 大写字母               | ✅ 已完成 | Validation rule                                     |
| - 数字                   | ✅ 已完成 | Validation rule                                     |
| - 密码不匹配             | ✅ 已完成 | Confirm password validation                         |
| **组件拆分**             |           |                                                     |
| - AuthPageLayout         | ✅ 已完成 | Shared layout for auth pages                        |
| - EmailInput             | ✅ 已完成 | Email input with validation                         |
| - VerificationCodeButton | ✅ 已完成 | 60s countdown button                                |
| - SubmitButton           | ✅ 已完成 | Form submit with validation check                   |
| - GoogleIcon             | ✅ 已完成 | Full-color SVG Google logo                          |
| **i18n支持**             | ✅ 已完成 | EN + ZH translations                                |
| **单元测试**             | ❌ 未创建 |                                                     |
| **Storybook**            | ✅ 已完成 | LoginPage, RegisterPage, ForgotPasswordPage stories |
| **API调用**              | ❌ 待对接 | Mock API implemented                                |

### 3.2 个人中心 (user-center)

| 属性          | 状态      | 详情                                              |
| ------------- | --------- | ------------------------------------------------- |
| **产品文档**  | ✅ 已创建 | `docs-product/user/user-center.md`                |
| **状态**      | ✅ 已完成 | Phase 2, Priority P0                              |
| **前端页面**  | ✅ 已完成 | UserCenterPage at `/user`                         |
| **组件拆分**  |           |                                                   |
| - 个人信息    | ✅ 已完成 | UserProfile (含头像上传、表单编辑)                |
| - 头像上传    | ✅ 已完成 | Upload + ImgCrop 圆形裁剪                         |
| - 密码修改    | ✅ 已完成 | Form 验证 + 确认密码                              |
| - 隐私设置    | ✅ 已完成 | 4个 Switch 开关                                   |
| - 注销账号    | ✅ 已完成 | Danger Zone + 确认弹窗                            |
| - 收藏管理    | ✅ 已完成 | FavoritesList + CourseCard (lite)                 |
| - 学习记录    | ✅ 已完成 | LearningHistory + CourseCardHistory               |
| - 状态标签    | ✅ 已完成 | completed/in_progress/not_started                 |
| - 消息通知    | ✅ 已完成 | NotificationList + 标记已读/删除                  |
| - 设置面板    | ✅ 已完成 | SettingsPanel (备用)                              |
| **功能特性**  |           |                                                   |
| - Tab 切换    | ✅ 已完成 | 4个 Tab: profile/favorites/history/notifications  |
| - 退出登录    | ✅ 已完成 | LogoutOutlined + 确认弹窗                         |
| - 空状态处理  | ✅ 已完成 | Empty + 图标                                      |
| **单元测试**  | ❌ 未创建 |                                                   |
| **Storybook** | ✅ 已完成 | UserCenterPage.stories.tsx with interaction tests |
| **API调用**   | ❌ 待对接 | Mock API implemented                              |
| **后端API**   |           |                                                   |
| - 用户信息    | 📋 待开发 | GET `/api/v1/users/me`                            |
| - 更新信息    | 📋 待开发 | PUT `/api/v1/users/me`                            |
| - 收藏列表    | 📋 待开发 | GET `/api/v1/users/me/favorites`                  |
| - 学习记录    | 📋 待开发 | GET `/api/v1/users/me/learning`                   |
| - 消息列表    | 📋 待开发 | GET `/api/v1/users/me/notifications`              |

### 3.3 个人教师 (personal-teacher)

| 属性           | 状态      | 详情                                                                |
| -------------- | --------- | ------------------------------------------------------------------- |
| **产品文档**   | ✅ 已创建 | `docs-product/user/personal-teacher.md`                             |
| **状态**       | ✅ 已完成 | Phase 2, Priority P0                                                |
| **前端页面**   | ✅ 已完成 | TeacherDashboardPage at `/teacher/dashboard`                        |
| **组件拆分**   |           |                                                                     |
| - 申请入口     | ✅ 已完成 | TeacherApplyButton (UserCenter)                                     |
| - 教师仪表盘   | ✅ 已完成 | TeacherDashboardPage (Profile/Courses/Students/Revenue tabs)        |
| - 我的课程     | ✅ 已完成 | CourseList, CourseForm, CourseStats (My Courses tab)                |
| - 学员管理     | ✅ 已完成 | StudentsSection with Table (Students tab)                           |
| - 收入统计     | ✅ 已完成 | RevenueSection with cards (Revenue tab)                             |
| - 教师资料     | ✅ 已完成 | TeacherProfileSection with ReactQuill bio editor                    |
| **功能特性**   |           |                                                                     |
| - Tab 切换     | ✅ 已完成 | 4个 Tab: profile/courses/students/revenue                           |
| - 课程CRUD     | ✅ 已完成 | 创建/编辑/删除/预览/发布/暂停                                       |
| - 发布限制     | ✅ 已完成 | 最多5门已发布课程，红/黄/绿状态卡片                                 |
| - 富文本编辑   | ✅ 已完成 | ReactQuill for course description and teacher bio                   |
| - 预览模态框   | ✅ 已完成 | Rich HTML content rendering in modal                                |
| - 国际化       | ✅ 已完成 | EN + ZH translations with proper namespaces                         |
| **单元测试**   | ✅ 已完成 | CourseStats tests                                                   |
| **Storybook**  | ✅ 已完成 | TeacherDashboardPage.stories.tsx (Overview/NoCourses/Limit stories) |
| **API调用**    | ❌ 待对接 | Mock data implemented                                               |
| **后端API**    |           |                                                                     |
| - 申请成为教师 | 📋 待开发 | POST `/api/v1/users/me/apply-teacher`                               |
| - 教师信息     | 📋 待开发 | GET `/api/v1/teachers/me`                                           |
| - 学员列表     | 📋 待开发 | GET `/api/v1/teachers/me/students`                                  |
| - 收入记录     | 📋 待开发 | GET `/api/v1/teachers/me/revenue`                                   |

### 3.4 子女管理 (children-management)

| 属性          | 状态      | 详情                                          |
| ------------- | --------- | --------------------------------------------- |
| **产品文档**  | ✅ 已更新 | `docs-product/user/parental-controls.md` v2.0 |
| **状态**      | ✅ 已完成 | Phase 2, Priority P0                          |
| **前端入口**  | ✅ 已完成 | UserCenterPage Tab: `/user` (children tab)    |
| **组件拆分**  |           |                                               |
| - 子女列表    | ✅ 已完成 | ChildrenList                                  |
| - 添加表单    | ✅ 已完成 | ChildForm (Modal)                             |
| - 编辑表单    | ✅ 已完成 | ChildForm (Modal)                             |
| - 删除确认    | ✅ 已完成 | DeleteConfirmation                            |
| **功能特性**  |           |                                               |
| - 添加子女    | ✅ 已完成 | 姓名、性别、年级                              |
| - 编辑子女    | ✅ 已完成 | 修改子女信息                                  |
| - 删除子女    | ✅ 已完成 | 确认弹窗                                      |
| - 空状态      | ✅ 已完成 | Empty component                               |
| - 年级选择    | ✅ 已完成 | 幼儿园-高中分组                               |
| **单元测试**  | ❌ 未创建 |                                               |
| **Storybook** | ✅ 已完成 | ChildrenManagement.stories.tsx                |
| **API调用**   | ❌ 待对接 | Mock data implemented                         |
| **后端API**   |           |                                               |
| - 子女列表    | 📋 待开发 | GET `/api/v1/children`                        |
| - 添加子女    | 📋 待开发 | POST `/api/v1/children`                       |
| - 更新子女    | 📋 待开发 | PUT `/api/v1/children/:id`                    |
| - 删除子女    | 📋 待开发 | DELETE `/api/v1/children/:id`                 |

### 3.5 用户角色生命周期 (role-lifecycle)

| 属性          | 状态      | 详情                                  |
| ------------- | --------- | ------------------------------------- |
| **产品文档**  | ✅ 已创建 | `docs-product/user/role-lifecycle.md` |
| **状态**      | 待开发    | Priority P1                           |
| **功能说明**  |           | RBAC权限模型                          |
| **组件拆分**  |           |                                       |
| - 角色显示    | ❌ 未创建 | RoleBadge                             |
| - 权限检查    | ❌ 未创建 | PermissionGuard                       |
| - 角色切换    | ❌ 未创建 | RoleSwitcher                          |
| **单元测试**  | ❌ 未创建 |                                       |
| **Storybook** | ❌ 未创建 |                                       |
| **API调用**   | ❌ 无     |                                       |

---

## 四、交易模块

### 4.1 在线预约 (booking)

| 属性           | 状态      | 详情                                  |
| -------------- | --------- | ------------------------------------- |
| **产品文档**   | ✅ 已创建 | `docs-product/transaction/booking.md` |
| **状态**       | 待开发    | Phase 3, Priority P0                  |
| **前端页面**   | ❌ 未创建 | 需要BookingPage                       |
| **组件拆分**   |           |                                       |
| - 时间选择器   | ❌ 未创建 | TimeSlotPicker                        |
| - 预约表单     | ❌ 未创建 | BookingForm                           |
| - 预约确认     | ❌ 未创建 | BookingConfirmation                   |
| - 预约列表     | ❌ 未创建 | BookingList                           |
| - 预约状态管理 | ❌ 未创建 | BookingStatus                         |
| **单元测试**   | ❌ 未创建 |                                       |
| **Storybook**  | ❌ 未创建 |                                       |
| **API调用**    | ❌ 无     |                                       |
| **后端API**    |           |                                       |
| - 可用时间查询 | 📋 待开发 | GET `/api/v1/bookings/slots`          |
| - 创建预约     | 📋 待开发 | POST `/api/v1/bookings`               |
| - 预约列表     | 📋 待开发 | GET `/api/v1/bookings`                |
| - 取消预约     | 📋 待开发 | PUT `/api/v1/bookings/{id}/cancel`    |
| - 确认预约     | 📋 待开发 | PUT `/api/v1/bookings/{id}/confirm`   |

### 4.2 支付系统 (payments)

| 属性           | 状态      | 详情                                   |
| -------------- | --------- | -------------------------------------- |
| **产品文档**   | ✅ 已创建 | `docs-product/transaction/payments.md` |
| **状态**       | 待开发    | Phase 3, Priority P0                   |
| **前端页面**   | ❌ 未创建 | 需要PaymentPage                        |
| **组件拆分**   |           |                                        |
| - 支付方式选择 | ❌ 未创建 | PaymentMethodSelector                  |
| - 支付表单     | ❌ 未创建 | PaymentForm                            |
| - 支付结果     | ❌ 未创建 | PaymentResult                          |
| - 退款申请     | ❌ 未创建 | RefundRequest                          |
| **单元测试**   | ❌ 未创建 |                                        |
| **Storybook**  | ❌ 未创建 |                                        |
| **API调用**    | ❌ 无     |                                        |
| **后端API**    |           |                                        |
| - 创建支付单   | 📋 待开发 | POST `/api/v1/payments`                |
| - 支付状态查询 | 📋 待开发 | GET `/api/v1/payments/{id}`            |
| - 发起退款     | 📋 待开发 | POST `/api/v1/payments/{id}/refund`    |
| - 退款列表     | 📋 待开发 | GET `/api/v1/payments/refunds`         |

### 4.3 套餐购买 (packages)

| 属性          | 状态      | 详情                                   |
| ------------- | --------- | -------------------------------------- |
| **产品文档**  | ✅ 已创建 | `docs-product/transaction/packages.md` |
| **状态**      | 待开发    | Phase 3, Priority P0                   |
| **前端页面**  | ❌ 未创建 | 需要PackagesPage                       |
| **组件拆分**  |           |                                        |
| - 套餐列表    | ❌ 未创建 | PackageList                            |
| - 套餐卡片    | ❌ 未创建 | PackageCard                            |
| - 套餐详情    | ❌ 未创建 | PackageDetail                          |
| - 购买流程    | ❌ 未创建 | PurchaseFlow                           |
| **单元测试**  | ❌ 未创建 |                                        |
| **Storybook** | ❌ 未创建 |                                        |
| **API调用**   | ❌ 无     |                                        |
| **后端API**   |           |                                        |
| - 套餐列表    | 📋 待开发 | GET `/api/v1/packages`                 |
| - 套餐详情    | 📋 待开发 | GET `/api/v1/packages/{id}`            |
| - 购买套餐    | 📋 待开发 | POST `/api/v1/packages/purchase`       |
| - 我的套餐    | 📋 待开发 | GET `/api/v1/users/me/packages`        |

### 4.4 退款处理 (refunds)

| 属性           | 状态      | 详情                                  |
| -------------- | --------- | ------------------------------------- |
| **产品文档**   | ✅ 已创建 | `docs-product/transaction/refunds.md` |
| **状态**       | 待开发    | Phase 3, Priority P0                  |
| **前端页面**   | ❌ 未创建 | 需要RefundsPage                       |
| **组件拆分**   |           |                                       |
| - 退款申请表单 | ❌ 未创建 | RefundForm                            |
| - 退款进度     | ❌ 未创建 | RefundProgress                        |
| - 退款历史     | ❌ 未创建 | RefundHistory                         |
| - 退款政策说明 | ❌ 未创建 | RefundPolicy                          |
| **单元测试**   | ❌ 未创建 |                                       |
| **Storybook**  | ❌ 未创建 |                                       |
| **API调用**    | ❌ 无     |                                       |

---

## 五、教师模块

### 5.1 教师入驻 (teacher-onboarding)

| 属性           | 状态      | 详情                                         |
| -------------- | --------- | -------------------------------------------- |
| **产品文档**   | ✅ 已创建 | `docs-product/teacher/teacher-onboarding.md` |
| **状态**       | ✅ 已完成 | Phase 2, Priority P0                         |
| **前端页面**   | ✅ 已完成 | `/teacher/onboarding`                        |
| **组件拆分**   |           |                                              |
| - 入驻申请表单 | ✅ 已完成 | TeacherApplicationForm                       |
| - 资质上传     | ✅ 已完成 | QualificationUpload                          |
| - 审核状态     | ✅ 已完成 | ApplicationStatus                            |
| - 入驻成功页   | ✅ 已完成 | OnboardingSuccess                            |
| **功能特性**   |           |                                              |
| - 分步引导     | ✅ 已完成 | 3步流程：基本信息 -> 资质上传 -> 确认提交    |
| - 表单验证     | ✅ 已完成 | Ant Design Form 验证                         |
| - 文件上传     | ✅ 已完成 | 图片/PDF 上传预览                            |
| - 状态展示     | ✅ 已完成 | 待审核/已通过/已拒绝                         |
| **单元测试**   | ❌ 未创建 |                                              |
| **Storybook**  | ✅ 已完成 | TeacherOnboardingPage.stories.tsx            |
| **API调用**    | ❌ 待对接 | Mock data implemented                        |
| **后端API**    |           |                                              |
| - 提交申请     | 📋 待开发 | POST `/api/v1/teachers/apply`                |
| - 更新申请     | 📋 待开发 | PUT `/api/v1/teachers/apply`                 |
| - 查询审核状态 | 📋 待开发 | GET `/api/v1/teachers/apply/status`          |
| - 上传资质     | 📋 待开发 | POST `/api/v1/teachers/qualifications`       |

### 5.2 教师回复 (teacher-replies)

| 属性          | 状态      | 详情                                                         |
| ------------- | --------- | ------------------------------------------------------------ |
| **产品文档**  | ✅ 已创建 | `docs-product/teacher/teacher-replies.md`                    |
| **状态**      | ✅ 已完成 | 已集成到 TeacherCentre (TeacherDashboardPage 的 Reviews Tab) |
| **前端入口**  | ✅ 已完成 | TeacherDashboardPage `/teacher/dashboard` (Reviews Tab)      |
| **组件拆分**  |           |                                                              |
| - 评价筛选    | ✅ 已完成 | 星级筛选 + 待回复/已回复筛选                                 |
| - 回复编辑器  | ✅ 已完成 | ReviewReplyForm (内嵌于评价卡片)                             |
| - 回复列表    | ✅ 已完成 | TeacherRepliesSection (整合到 Reviews Tab)                   |
| **功能特性**  |           |                                                              |
| - 筛选功能    | ✅ 已完成 | 星级筛选 + 待回复/已回复状态筛选                             |
| - 回复功能    | ✅ 已完成 | 输入框 + 提交按钮，回复后更新状态                            |
| - 删除回复    | ✅ 已完成 | 删除按钮，确认弹窗                                           |
| - 国际化      | ✅ 已完成 | EN + ZH 翻译                                                 |
| **单元测试**  | ❌ 未创建 |                                                              |
| **Storybook** | ❌ 未创建 |                                                              |
| **API调用**   | ❌ 待对接 | Mock数据已完成                                               |
| **后端API**   |           |                                                              |
| - 收到的评价  | 📋 待开发 | GET `/api/v1/teachers/me/reviews`                            |
| - 发送回复    | 📋 待开发 | POST `/api/v1/teachers/me/reviews/{id}/reply`                |
| - 删除回复    | 📋 待开发 | DELETE `/api/v1/teachers/me/reviews/{id}/reply`              |

---

## 六、机构模块

### 6.1 机构入驻 (institution-onboarding)

| 属性           | 状态      | 详情                                                 |
| -------------- | --------- | ---------------------------------------------------- |
| **产品文档**   | ✅ 已创建 | `docs-product/institution/institution-onboarding.md` |
| **状态**       | 待开发    | Phase 2, Priority P0                                 |
| **前端页面**   | ❌ 未创建 | 需要InstitutionOnboardingPage                        |
| **组件拆分**   |           |                                                      |
| - 入驻申请表单 | ❌ 未创建 | InstitutionApplicationForm                           |
| - 机构信息     | ❌ 未创建 | InstitutionInfoForm                                  |
| - 资质上传     | ❌ 未创建 | InstitutionQualifications                            |
| - 套餐选择     | ❌ 未创建 | PackageSelection                                     |
| **单元测试**   | ❌ 未创建 |                                                      |
| **Storybook**  | ❌ 未创建 |                                                      |
| **API调用**    | ❌ 无     |                                                      |
| **后端API**    |           |                                                      |
| - 提交申请     | 📋 待开发 | POST `/api/v1/institutions/apply`                    |
| - 更新申请     | 📋 待开发 | PUT `/api/v1/institutions/apply`                     |
| - 查询状态     | 📋 待开发 | GET `/api/v1/institutions/apply/status`              |
| - 套餐列表     | 📋 待开发 | GET `/api/v1/institutions/packages`                  |

### 6.2 机构管理 (institution-management)

| 属性          | 状态      | 详情                                                 |
| ------------- | --------- | ---------------------------------------------------- |
| **产品文档**  | ✅ 已创建 | `docs-product/institution/institution-management.md` |
| **状态**      | 待开发    | Phase 2, Priority P0                                 |
| **前端页面**  | ❌ 未创建 | 需要InstitutionDashboardPage                         |
| **组件拆分**  |           |                                                      |
| - 机构仪表盘  | ❌ 未创建 | InstitutionDashboard                                 |
| - 课程管理    | ❌ 未创建 | InstitutionCourseManagement                          |
| - 团队管理    | ❌ 未创建 | TeamManagement                                       |
| - 数据统计    | ❌ 未创建 | InstitutionStats                                     |
| - 套餐管理    | ❌ 未创建 | PackageManagement                                    |
| **单元测试**  | ❌ 未创建 |                                                      |
| **Storybook** | ❌ 未创建 |                                                      |
| **API调用**   | ❌ 无     |                                                      |
| **后端API**   |           |                                                      |
| - 机构信息    | 📋 待开发 | GET `/api/v1/institutions/me`                        |
| - 更新信息    | 📋 待开发 | PUT `/api/v1/institutions/me`                        |
| - 团队成员    | 📋 待开发 | GET `/api/v1/institutions/me/team`                   |
| - 数据统计    | 📋 待开发 | GET `/api/v1/institutions/me/stats`                  |

---

## 七、信任模块

### 7.1 信任标识 (trust-badges)

| 属性           | 状态      | 详情                                                                                |
| -------------- | --------- | ----------------------------------------------------------------------------------- |
| **产品文档**   | ✅ 已创建 | `docs-product/trust/trust-badges.md`                                                |
| **状态**       | 开发中    | MVP, Priority P0                                                                    |
| **组件**       |           |                                                                                     |
| - 信任徽章     | ✅ 已创建 | TrustBadge (src/components/ui/TrustBadge/)                                          |
| - 徽章说明     | ✅ 已创建 | TrustBadgeTooltip                                                                   |
| - 徽章筛选     | ✅ 已创建 | TrustLevelFilter                                                                    |
| - 配置与类型   | ✅ 已创建 | trustBadgeConfig.ts                                                                 |
| **单元测试**   | ✅ 已创建 | TrustBadge.test.tsx, TrustLevelFilter.test.tsx, TrustBadge.config.test.ts           |
| **Storybook**  | ✅ 已创建 | TrustBadge.stories.tsx, TrustBadgeTooltip.stories.tsx, TrustLevelFilter.stories.tsx |
| **i18n**       | ✅ 已创建 | en/zh search.json                                                                   |
| **API调用**    | ❌ 无     |                                                                                     |
| **后端API**    |           |                                                                                     |
| - 信任等级计算 | 📋 待开发 | `/api/v1/trust/calculate`                                                           |

### 7.2 数据聚合 (data-aggregation)

| 属性           | 状态      | 详情                                     |
| -------------- | --------- | ---------------------------------------- |
| **产品文档**   | ✅ 已创建 | `docs-product/trust/data-aggregation.md` |
| **状态**       | 待开发    | MVP, Priority P0                         |
| **说明**       |           | 后端数据抓取，前端展示数据来源           |
| **组件**       |           |                                          |
| - 数据来源标识 | ❌ 未创建 | DataSourceBadge                          |
| - 数据新鲜度   | ❌ 未创建 | DataFreshnessIndicator                   |
| **单元测试**   | ❌ 未创建 |                                          |
| **Storybook**  | ❌ 未创建 |                                          |
| **API调用**    | ❌ 无     |                                          |

### 7.3 数据质量 (data-quality)

| 属性          | 状态      | 详情                                 |
| ------------- | --------- | ------------------------------------ |
| **产品文档**  | ✅ 已创建 | `docs-product/trust/data-quality.md` |
| **状态**      | 待开发    | MVP, Priority P0                     |
| **组件**      |           |                                      |
| - 质量评分    | ❌ 未创建 | QualityScore                         |
| - 质量标签    | ❌ 未创建 | QualityBadge                         |
| **单元测试**  | ❌ 未创建 |                                      |
| **Storybook** | ❌ 未创建 |                                      |
| **API调用**   | ❌ 无     |                                      |

### 7.4 数据脱敏 (desensitization)

| 属性          | 状态  | 详情                                             |
| ------------- | ----- | ------------------------------------------------ |
| **产品文档**  | ✅ 已创建 | `docs-product/trust/desensitization.md`           |
| **状态**      | N/A   | 后端实现，前端仅展示脱敏后的数据                 |
| **说明**      |       | 脱敏必须在后端完成，前端不处理敏感数据           |
| **组件**      |       |                                                  |
| - 脱敏手机号  | ✅ 已实现 | 后端返回已脱敏数据                               |
| - 脱敏邮箱    | ✅ 已实现 | 后端返回已脱敏数据                               |
| - 脱敏姓名    | ✅ 已实现 | 后端返回已脱敏数据                               |
| **前端逻辑**  | ❌ 无 | 仅展示API返回的脱敏数据                          |

---

## 八、增长模块

### 8.1 消息通知 (notifications)

| 属性          | 状态      | 详情                                             |
| ------------- | --------- | ------------------------------------------------ |
| **产品文档**  | ✅ 已创建 | `docs-product/growth/notifications.md`           |
| **状态**      | ✅ 已完成 | 已集成到 UserCenterPage (Notifications Tab)       |
| **前端入口**  | ✅ 已完成 | UserCenterPage `/user` (notifications tab)       |
| **组件**      |           |                                                  |
| - 通知列表    | ✅ 已完成 | NotificationList component                       |
| - 通知详情    | ✅ 已完成 | 内嵌于 NotificationList (展开/折叠)              |
| - 标记已读    | ✅ 已完成 | 单条/全部标记已读功能                           |
| - 删除通知    | ✅ 已完成 | 删除按钮功能                                     |
| **功能**      |           |                                                  |
| - 未读统计    | ✅ 已完成 | 显示未读消息数量                                |
| - 时间格式化   | ✅ 已完成 | 相对时间显示                                    |
| - 空状态      | ✅ 已完成 | Empty 组件展示                                   |
| - 类型分类    | ✅ 已完成 | system/course/promotion/reminder                 |
| **单元测试**  | ✅ 已创建 | NotificationList tests                        |
| **Storybook** | ✅ 已创建 | NotificationList.stories.tsx                 |
| **API调用**   | ❌ 待对接 | Mock数据已完成                                   |
| **后端API**   |           |                                                  |
| - 通知列表    | 📋 待开发 | GET `/api/v1/notifications`                      |
| - 标记已读    | 📋 待开发 | PUT `/api/v1/notifications/{id}/read`            |
| - 全部已读    | 📋 待开发 | PUT `/api/v1/notifications/read-all`             |
| - 删除通知    | 📋 待开发 | DELETE `/api/v1/notifications/{id}`              |

### 8.2 推荐奖励 (referral)

| 属性           | 状态      | 详情                              |
| -------------- | --------- | --------------------------------- |
| **产品文档**   | ✅ 已创建 | `docs-product/growth/referral.md` |
| **状态**       | 待开发    | Priority P1                       |
| **前端页面**   | ❌ 未创建 | 需要ReferralPage                  |
| **组件拆分**   |           |                                   |
| - 邀请码展示   | ❌ 未创建 | ReferralCode                      |
| - 邀请记录     | ❌ 未创建 | ReferralHistory                   |
| - 奖励统计     | ❌ 未创建 | ReferralStats                     |
| - 邀请好友表单 | ❌ 未创建 | InviteFriendForm                  |
| **单元测试**   | ❌ 未创建 |                                   |
| **Storybook**  | ❌ 未创建 |                                   |
| **API调用**    | ❌ 无     |                                   |
| **后端API**    |           |                                   |
| - 获取邀请码   | 📋 待开发 | GET `/api/v1/referral/code`       |
| - 邀请记录     | 📋 待开发 | GET `/api/v1/referral/history`    |
| - 奖励统计     | 📋 待开发 | GET `/api/v1/referral/stats`      |
| - 使用邀请码   | 📋 待开发 | POST `/api/v1/referral/use`       |

### 8.3 捐赠系统 (donations)

| 属性          | 状态      | 详情                               |
| ------------- | --------- | ---------------------------------- |
| **产品文档**  | ✅ 已创建 | `docs-product/growth/donations.md` |
| **状态**      | 待开发    | Priority P1                        |
| **前端页面**  | ❌ 未创建 | 需要DonationsPage                  |
| **组件拆分**  |           |                                    |
| - 捐赠入口    | ❌ 未创建 | DonationEntry                      |
| - 捐赠记录    | ❌ 未创建 | DonationHistory                    |
| - 捐赠证书    | ❌ 未创建 | DonationCertificate                |
| **单元测试**  | ❌ 未创建 |                                    |
| **Storybook** | ❌ 未创建 |                                    |
| **API调用**   | ❌ 无     |                                    |
| **后端API**   |           |                                    |
| - 捐赠记录    | 📋 待开发 | GET `/api/v1/donations`            |
| - 发起捐赠    | 📋 待开发 | POST `/api/v1/donations`           |

---

## 九、反馈模块

### 9.1 用户反馈 (user-feedback)

| 属性           | 状态      | 详情                                     |
| -------------- | --------- | ---------------------------------------- |
| **产品文档**   | ✅ 已创建 | `docs-product/feedback/user-feedback.md` |
| **状态**       | ✅ 已完成 | Phase 1, Priority P0                     |
| **前端页面**   | ✅ 已完成 | `src/pages/FeedbackPage/`                |
| **组件拆分**   |           |                                          |
| - 反馈表单     | ✅ 已完成 | ContactForm (reused)                     |
| - 反馈类型选择 | ✅ 已完成 | Dropdown in ContactForm                  |
| **功能**       |           |                                          |
| - 课程过期     | ✅ 已完成 | Subject option                           |
| - 信息错误     | ✅ 已完成 | Subject option                           |
| - 虚假信息     | ✅ 已完成 | Subject option                           |
| - 无效联系方式 | ✅ 已完成 | Subject option                           |
| - 不当内容     | ✅ 已完成 | Subject option                           |
| - 其他         | ✅ 已完成 | Subject option                           |
| **i18n**       | ✅ 已完成 | EN + ZH translations                     |
| **单元测试**   | ❌ 未创建 |                                          |
| **Storybook**  | ✅ 已完成 | FeedbackPage.stories.tsx                 |
| **API调用**    | ❌ 待对接 | Mock API                                 |

---

## 十、广告模块

### 10.1 Google广告 (google-ads)

| 属性          | 状态      | 详情                             |
| ------------- | --------- | -------------------------------- |
| **产品文档**  | ✅ 已创建 | `docs-product/ads/google-ads.md` |
| **状态**      | 待开发    | Phase 1, Priority P1             |
| **组件**      |           |                                  |
| - 广告位组件  | ❌ 未创建 | AdBanner                         |
| - 广告配置    | ❌ 未创建 | AdConfig                         |
| - 广告统计    | ❌ 未创建 | AdStats                          |
| **单元测试**  | ❌ 未创建 |                                  |
| **Storybook** | ❌ 未创建 |                                  |
| **API调用**   | ❌ 无     |                                  |
| **后端API**   |           |                                  |
| - 广告配置    | 📋 待开发 | GET `/api/v1/ads/config`         |
| - 广告统计    | 📋 待开发 | GET `/api/v1/ads/stats`          |

---

## 十一、管理模块

### 11.1 管理员后台 (admin-backend)

| 属性          | 状态      | 详情                                  |
| ------------- | --------- | ------------------------------------- |
| **产品文档**  | ✅ 已创建 | `docs-product/admin/admin-backend.md` |
| **状态**      | 待开发    | Priority P1                           |
| **前端页面**  | ❌ 未创建 | 需要AdminDashboardPage                |
| **组件拆分**  |           |                                       |
| - 管理员登录  | ❌ 未创建 | AdminLogin                            |
| - 仪表盘      | ❌ 未创建 | AdminDashboard                        |
| - 用户管理    | ❌ 未创建 | UserManagement                        |
| - 内容审核    | ❌ 未创建 | ContentModeration                     |
| - 系统配置    | ❌ 未创建 | SystemConfig                          |
| **单元测试**  | ❌ 未创建 |                                       |
| **Storybook** | ❌ 未创建 |                                       |
| **API调用**   | ❌ 无     |                                       |
| **后端API**   |           |                                       |
| - 管理员认证  | 📋 待开发 | `/api/v1/admin/auth`                  |
| - 用户管理    | 📋 待开发 | `/api/v1/admin/users`                 |
| - 内容审核    | 📋 待开发 | `/api/v1/admin/moderation`            |
| - 系统配置    | 📋 待开发 | `/api/v1/admin/config`                |

### 11.2 数据统计 (analytics)

| 属性          | 状态      | 详情                              |
| ------------- | --------- | --------------------------------- |
| **产品文档**  | ✅ 已创建 | `docs-product/admin/analytics.md` |
| **状态**      | 待开发    | Priority P1                       |
| **前端页面**  | ❌ 未创建 | 需要AnalyticsPage                 |
| **组件拆分**  |           |                                   |
| - 数据概览    | ❌ 未创建 | AnalyticsOverview                 |
| - 图表组件    | ❌ 未创建 | ChartComponents                   |
| - 报表导出    | ❌ 未创建 | ReportExport                      |
| - 实时数据    | ❌ 未创建 | RealTimeStats                     |
| **单元测试**  | ❌ 未创建 |                                   |
| **Storybook** | ❌ 未创建 |                                   |
| **API调用**   | ❌ 无     |                                   |
| **后端API**   |           |                                   |
| - 统计数据    | 📋 待开发 | GET `/api/v1/analytics`           |
| - 报表生成    | 📋 待开发 | POST `/api/v1/analytics/reports`  |

---

## 十二、国际化

### 12.1 多语言支持 (multilingual)

| 属性          | 状态      | 详情                                |
| ------------- | --------- | ----------------------------------- |
| **产品文档**  | ✅ 已创建 | `docs-product/i18n/multilingual.md` |
| **状态**      | ✅ 已完成 | MVP, Priority P0                    |
| **实现情况**  | ✅ 已配置 | i18n框架已搭建                      |
| **组件**      |           |                                     |
| - 语言切换器  | ✅ 已实现 | Header.tsx中                        |
| - 翻译文件    | ✅ 已完成 | locales/en/_.json, zh/_.json        |
| - 日期格式化  | ❌ 未创建 | DateFormatter                       |
| - 数字格式化  | ❌ 未创建 | NumberFormatter                     |
| **单元测试**  | ❌ 未创建 |                                     |
| **Storybook** | ❌ 未创建 |                                     |
| **后端API**   |           |                                     |
| - 翻译文件    | 📋 待开发 | GET `/api/v1/i18n/{lang}`           |

---

## 十三、已实现组件汇总

### 13.1 已实现的页面

| 页面名称              | 文件路径                                         | 状态    | 测试 | Storybook |
| --------------------- | ------------------------------------------------ | ------- | ---- | --------- |
| HomePage              | `src/pages/HomePage/`                            | ✅ 完成 | ✅   | ✅        |
| NotFoundPage          | `src/pages/NotFoundPage/`                        | ✅ 完成 | ✅   | ✅        |
| AboutPage             | `src/pages/AboutPage/`                           | ✅ 完成 | ✅   | ✅        |
| CookiePolicyPage      | `src/pages/CookiePolicyPage/`                    | ✅ 完成 | ✅   | ✅        |
| PrivacyPolicyPage     | `src/pages/PrivacyPolicyPage/`                   | ✅ 完成 | ✅   | ✅        |
| TermsOfServicePage    | `src/pages/TermsOfServicePage/`                  | ✅ 完成 | ✅   | ✅        |
| HelpCentrePage        | `src/pages/HelpCentrePage/`                      | ✅ 完成 | ✅   | ✅        |
| ContactPage           | `src/pages/ContactPage/`                         | ✅ 完成 | ✅   | ✅        |
| FeedbackPage          | `src/pages/FeedbackPage/`                        | ✅ 完成 | ✅   | ✅        |
| CourseSearchPage      | `src/pages/CourseSearchPage/`                    | ✅ 完成 | ✅   | ✅        |
| CourseDetailPage      | `src/pages/CourseDetailPage/`                    | ✅ 完成 | ✅   | ✅        |
| CourseManagementPage  | `src/pages/CourseManagementPage/`                | ✅ 完成 | ✅   | ✅        |
| ReviewsPage           | `src/pages/ReviewsPage/`                         | ✅ 完成 | ✅   | ✅        |
| TeacherOnboardingPage | `src/pages/TeacherOnboardingPage/`               | ✅ 完成 | ✅   | ✅        |
| LoginPage             | `src/pages/LoginPage/`                           | ✅ 完成 | ✅   | ✅        |
| RegisterPage          | `src/pages/RegisterPage/`                        | ✅ 完成 | ✅   | ✅        |
| ForgotPasswordPage    | `src/pages/ForgotPasswordPage/`                  | ✅ 完成 | ✅   | ✅        |
| UserCenterPage        | `src/pages/UserCenterPage/`                      | ✅ 完成 | ✅   | ✅        |
| MyReviews             | `src/pages/UserCenterPage/components/MyReviews/` | ✅ 完成 | ✅   | ✅        |

### 13.2 已实现的UI组件

| 组件名称               | 文件路径                                                             | 状态    | 测试 | Storybook |
| ---------------------- | -------------------------------------------------------------------- | ------- | ---- | --------- |
| Header                 | `src/components/shared/Header/`                                      | ✅ 完成 | ✅   | ✅        |
| Footer                 | `src/components/shared/Footer/`                                      | ✅ 完成 | ❌   | ✅        |
| AnnouncementBar        | `src/components/shared/AnnouncementBar/`                             | ✅ 完成 | ✅   | ✅        |
| HeroSection            | `src/pages/HomePage/sections/HeroSection/`                           | ✅ 完成 | ✅   | ✅        |
| FeaturedCoursesSection | `src/pages/HomePage/sections/FeaturedCoursesSection/`                | ✅ 完成 | ✅   | ✅        |
| FeaturesSection        | `src/pages/HomePage/sections/FeaturesSection/`                       | ✅ 完成 | ❌   | ✅        |
| ValueSection           | `src/pages/HomePage/sections/ValueSection/`                          | ✅ 完成 | ❌   | ✅        |
| CTASection             | `src/pages/HomePage/sections/CTASection/`                            | ✅ 完成 | ✅   | ✅        |
| InstitutionSection     | `src/pages/HomePage/sections/InstitutionSection/`                    | ✅ 完成 | ✅   | ✅        |
| CourseCard             | `src/components/ui/CourseCard/`                                      | ✅ 完成 | ✅   | ✅        |
| CourseCardHistory      | `src/components/ui/CourseCard/CourseCardHistory.tsx`                 | ✅ 完成 | ❌   | ❌        |
| TrustBadge             | `src/components/ui/TrustBadge/`                                      | ✅ 完成 | ✅   | ✅        |
| Loading                | `src/components/ui/Loading/`                                         | ✅ 完成 | ✅   | ✅        |
| ErrorFallback          | `src/components/ui/ErrorFallback/`                                   | ✅ 完成 | ✅   | ✅        |
| ContactForm            | `src/components/contact/ContactForm/`                                | ✅ 完成 | ✅   | ✅        |
| AuthPageLayout         | `src/components/layout/AuthPageLayout/`                              | ✅ 完成 | ❌   | ❌        |
| ContentPageTemplate    | `src/components/layout/ContentPageTemplate/`                         | ✅ 完成 | ❌   | ❌        |
| PageBreadcrumb         | `src/components/ui/PageBreadcrumb/`                                  | ✅ 完成 | ❌   | ❌        |
| PolicySection          | `src/components/ui/PolicySection/`                                   | ✅ 完成 | ❌   | ❌        |
| CopyableEmail          | `src/components/ui/CopyableEmail/`                                   | ✅ 完成 | ❌   | ❌        |
| EmailInput             | `src/components/ui/EmailInput/`                                      | ✅ 完成 | ❌   | ❌        |
| VerificationCodeButton | `src/components/ui/VerificationCodeButton/`                          | ✅ 完成 | ❌   | ❌        |
| SubmitButton           | `src/components/ui/SubmitButton/`                                    | ✅ 完成 | ❌   | ❌        |
| GoogleIcon             | `src/components/ui/GoogleIcon/`                                      | ✅ 完成 | ❌   | ❌        |
| UserProfile            | `src/pages/UserCenterPage/components/UserProfile/`                   | ✅ 完成 | ❌   | ❌        |
| FavoritesList          | `src/pages/UserCenterPage/components/FavoritesList/`                 | ✅ 完成 | ❌   | ❌        |
| LearningHistory        | `src/pages/UserCenterPage/components/LearningHistory/`               | ✅ 完成 | ❌   | ❌        |
| NotificationList       | `src/pages/UserCenterPage/components/NotificationList/`              | ✅ 完成 | ❌   | ❌        |
| SettingsPanel          | `src/pages/UserCenterPage/components/SettingsPanel/`                 | ✅ 完成 | ❌   | ❌        |
| ChildrenManagement     | `src/pages/UserCenterPage/components/ChildrenManagement/`            | ✅ 完成 | ❌   | ✅        |
| MyReviews              | `src/pages/UserCenterPage/components/MyReviews/`                     | ✅ 完成 | ✅   | ✅        |
| TeacherApplicationForm | `src/pages/TeacherOnboardingPage/components/TeacherApplicationForm/` | ✅ 完成 | ❌   | ✅        |
| QualificationUpload    | `src/pages/TeacherOnboardingPage/components/QualificationUpload/`    | ✅ 完成 | ❌   | ✅        |
| ApplicationStatus      | `src/pages/TeacherOnboardingPage/components/ApplicationStatus/`      | ✅ 完成 | ❌   | ✅        |
| CourseList             | `src/pages/CourseManagementPage/components/CourseList/`              | ✅ 完成 | ❌   | ✅        |
| CourseForm             | `src/pages/CourseManagementPage/components/CourseForm/`              | ✅ 完成 | ❌   | ❌        |
| CourseStats            | `src/pages/CourseManagementPage/components/CourseStats/`             | ✅ 完成 | ✅   | ❌        |
| StatusToggle           | `src/pages/CourseManagementPage/components/StatusToggle/`            | ✅ 完成 | ❌   | ❌        |
| TeacherDashboardPage   | `src/features/teacher/pages/TeacherDashboardPage/`                   | ✅ 完成 | ❌   | ✅        |
| TeacherProfileSection  | `src/features/teacher/components/TeacherProfileSection/`             | ✅ 完成 | ❌   | ❌        |
| StudentsSection        | `src/features/teacher/pages/TeacherDashboardPage/` (inline)          | ✅ 完成 | ❌   | ❌        |
| RevenueSection         | `src/features/teacher/pages/TeacherDashboardPage/` (inline)          | ✅ 完成 | ❌   | ❌        |
| ReviewCard             | `src/components/review/ReviewCard/`                                  | ✅ 完成 | ❌   | ✅        |
| ReviewForm             | `src/components/review/ReviewForm/`                                  | ✅ 完成 | ❌   | ❌        |
| ReviewStats            | `src/components/review/ReviewStats/`                                 | ✅ 完成 | ❌   | ✅        |

### 13.3 测试与Storybook统计（2026-02-03更新）

| 类别              | 数量 | 说明                                      |
| ----------------- | ---- | ----------------------------------------- |
| **已实现页面**    | 21   | + TeacherDashboardPage, + CourseList page |
| **已实现组件**    | 46   | + TeacherDashboard related                |
| **Storybook文件** | 41   | + TeacherDashboardPage.stories.tsx        |
| **翻译文件**      | 14   | + courseManagement (EN + ZH)              |
| **测试用例**      | 205  | All passing                               |

---

## 十四、开发优先级排序

### MVP阶段 (Phase 1) - 优先级 P0

| 序号 | 功能           | 模块   | 状态      | 预计工时 |
| ---- | -------------- | ------ | --------- | -------- |
| 1    | 用户注册/登录  | 用户   | ✅ 已完成 | 3天      |
| 2    | 社交登录       | 用户   | ✅ 已完成 | 1天      |
| 3    | 密码复杂度验证 | 用户   | ✅ 已完成 | 0.5天    |
| 4    | 课程搜索       | 课程   | ✅ 已完成 | 5天      |
| 5    | 课程详情       | 课程   | ✅ 已完成 | 3天      |
| 6    | 用户反馈       | 反馈   | ✅ 已完成 | 2天      |
| 7    | 多语言支持     | 国际化 | ⚠️ 部分   | 2天      |

### Phase 2 (2-3个月) - 优先级 P0

| 序号 | 功能     | 模块 | 状态      | 预计工时 |
| ---- | -------- | ---- | --------- | -------- |
| 8    | 个人中心 | 用户 | ✅ 已完成 | 5天      |
| 9    | 教师入驻 | 教师 | ✅ 已完成 | 3天      |
| 10   | 课程管理 | 课程 | ✅ 已完成 | 5天      |
| 11   | 机构入驻 | 机构 | ❌ 未开发 | 3天      |
| 12   | 机构管理 | 机构 | ❌ 未开发 | 5天      |

### Phase 3 (2-3个月) - 优先级 P0

| 序号 | 功能     | 模块 | 状态      | 预计工时 |
| ---- | -------- | ---- | --------- | -------- |
| 13   | 在线预约 | 交易 | ❌ 未开发 | 5天      |
| 14   | 支付系统 | 交易 | ❌ 未开发 | 5天      |
| 15   | 套餐购买 | 交易 | ❌ 未开发 | 3天      |
| 16   | 退款处理 | 交易 | ❌ 未开发 | 2天      |
| 17   | 课程评价 | 课程 | ✅ 已完成 | 3天      |

---

## 十五、更新日志

| 日期       | 更新内容                                                                                                      | 更新人   |
| ---------- | ------------------------------------------------------------------------------------------------------------- | -------- |
| 2026-01-28 | 初始化文档，整理所有模块                                                                                      | ben-wang |
| 2026-01-28 | 添加已实现组件统计                                                                                            | ben-wang |
| 2026-01-28 | 添加测试和Storybook状态                                                                                       | ben-wang |
| 2026-01-29 | 添加技术基础设施待办事项                                                                                      | ben-wang |
| 2026-01-31 | 更新测试统计，重构文档结构                                                                                    | ben-wang |
| 2026-01-31 | 标记课程搜索页完成，添加 CourseList/CourseSearchPanel                                                         | ben-wang |
| 2026-02-01 | 修复 i18n 问题，更新测试统计(166 tests)，添加 TrustBadge 状态                                                 | claude   |
| 2026-02-01 | 标记课程详情页完成，更新已实现页面统计(10个)                                                                  | claude   |
| 2026-02-01 | 实现用户登录/注册/忘记密码页面，更新MVP统计(13个页面)                                                         | claude   |
| 2026-02-01 | 添加密码字段到注册页，简化忘记密码流程                                                                        | claude   |
| 2026-02-01 | 添加密码复杂度验证（8位+大小写字母+数字）                                                                     | claude   |
| 2026-02-01 | 添加 Google 和微信社交登录，全彩 Google logo                                                                  | claude   |
| 2026-02-01 | 更新已实现组件统计（22个组件），添加 TermsOfServicePage                                                       | claude   |
| 2026-02-01 | 增强 UserCenterPage：状态标签、简化UI、头像上传、CourseCardLite/CourseCardHistory                             | claude   |
| 2026-02-01 | 实现子女管理 ChildrenManagement：添加/编辑/删除子女信息，简化产品文档                                         | ben-wang |
| 2026-02-02 | 标记课程管理和教师入驻为已完成，更新统计(17页/37组件)                                                         | claude   |
| 2026-02-02 | 实现课程评价模块：ReviewsPage, ReviewCard, ReviewForm, ReviewStats (18页/40组件)                              | claude   |
| 2026-02-03 | 添加MyReviews组件到UserCenter：编辑功能、课程/教师链接、移除多余分割线、使用Ant Design Icons                  | claude   |
| 2026-02-03 | 完成教师仪表盘 TeacherDashboardPage：Profile/Courses/Students/Revenue tabs、课程CRUD、发布限制、国际化翻译    | claude   |
| 2026-02-03 | 添加Contact Now功能：联系表单modal、登录提示、微信ID显示；添加ReviewsPage分页(10条/页)；添加Storybook stories | claude   |

---
