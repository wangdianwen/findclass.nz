# Google OAuth 登录功能 - 待完成事项

## 概述

前端已完成 Google OAuth 登录集成，使用 `@react-oauth/google` 库。以下是让 Google 登录完全工作的完整清单。

## 1. Google Cloud Console 配置

### 1.1 创建项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目

### 1.2 配置 OAuth 2.0 凭证

1. 进入 **APIs & Services** > **Credentials**
2. 点击 **CREATE CREDENTIALS** > **OAuth client ID**
3. 选择 **Web application**
4. 配置以下设置：

#### Authorized JavaScript origins

```
http://localhost:3000      # 开发环境
https://findclass.nz        # 生产环境
```

#### Authorized redirect URIs

```
http://localhost:3000      # 开发环境
https://findclass.nz        # 生产环境
```

### 1.3 获取 Client ID

创建后，你会获得一个 Client ID，格式类似：

```
.apps.googleusercontent.com
```

## 2. 环境变量配置

### 2.1 开发环境

在 `.env.local` 文件中添加：

```bash
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 2.2 生产环境

在 Vercel 或其他部署平台的环境变量中添加：

```
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## 3. 后端 API 实现

### 3.1 创建后端 endpoint

需要在后端实现以下 API 端点：

**POST `/api/v1/auth/social-login`**

请求体：

```json
{
  "provider": "google",
  "credential": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

处理步骤：

1. 验证 Google JWT token
2. 解码 token 获取用户信息 (email, name, picture)
3. 检查用户是否已存在
4. 如果不存在，创建新用户
5. 生成应用 JWT token
6. 返回 accessToken 和 refreshToken

### 3.2 Google JWT 验证

使用 Google 的 OAuth 库验证 token：

```python
# Python (FastAPI/Django) 示例
from google.oauth2 import id_token
from google.auth.transport import requests

def verify_google_token(token: str):
    try:
        id_info = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            CLIENT_ID
        )
        return id_info
    except Exception as e:
        raise ValueError("Invalid token")
```

```javascript
// Node.js/Express 示例
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(CLIENT_ID);

async function verifyGoogleToken(token) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return payload;
}
```

## 4. 用户数据存储

### 4.1 用户表扩展

需要在用户表中添加社交登录字段：

```sql
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN google_avatar VARCHAR(500);
```

### 4.2 注册/登录逻辑

```javascript
// 伪代码
async function handleSocialLogin(provider, credential) {
  // 1. 验证 provider credential
  const userInfo = await verifyCredential(provider, credential);

  // 2. 查找用户
  let user = await findUserBySocialId(provider, userInfo.id);

  // 3. 如果用户不存在，创建新用户
  if (!user) {
    user = await createUser({
      email: userInfo.email,
      name: userInfo.name,
      avatar: userInfo.picture,
      google_id: userInfo.id,
    });
  }

  // 4. 生成 JWT
  const tokens = generateTokens(user);

  return tokens;
}
```

## 5. 当前前端状态

### 5.1 已实现

- [x] GoogleLoginButton 组件
- [x] @react-oauth/google 集成
- [x] socialLogin API 函数
- [x] MSW mock handlers（用于测试）
- [x] Storybook stories

### 5.2 前端代码位置

```
src/components/ui/GoogleLoginButton/index.tsx   # 登录按钮组件
src/hooks/useAuth.ts                          # socialLogin hook
src/services/api.ts                           # socialLogin API
src/features/user/pages/LoginPage/index.tsx   # 登录页面
```

## 6. 测试

### 6.1 本地测试

1. 配置 `.env.local` 中的 `VITE_GOOGLE_CLIENT_ID`
2. 启动开发服务器：`npm run dev`
3. 访问 `/login` 页面
4. 点击 Google 登录按钮

### 6.2 集成测试

确保后端 API 正确处理：

```json
POST /api/v1/auth/social-login
{
  "provider": "google",
  "credential": "..."
}
```

## 7. 注意事项

### 7.1 安全考虑

- 始终在后端验证 Google JWT
- 不要信任前端传递的任何信息
- 使用 HTTPS 在生产环境

### 7.2 Google Play 审核

- 如果应用在 Google Play 上，需要在 Play Console 中添加 OAuth 披露
- 详细说明为什么需要 Google 登录

### 7.3 用户体验

- Google One Tap 会在页面右上角显示登录提示
- 用户可以选择使用或关闭此功能

## 8. 相关文档

- [Google OAuth 文档](https://developers.google.com/identity/protocols/oauth2)
- [@react-oauth/google GitHub](https://github.com/MomenSherif/react-oauth)
- [Google Sign-In for Websites](https://developers.google.com/identity/sign-in/web/sign-in)
