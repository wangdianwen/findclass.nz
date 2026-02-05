# 微信登录功能 - 待完成事项

## 概述

前端已完成微信扫码登录的 UI 和基础逻辑。以下是让微信登录完全工作的完整清单。

## 1. 微信开放平台配置

### 1.1 创建应用
1. 访问 [微信开放平台](https://open.weixin.qq.com/)
2. 注册开发者账号
3. 创建网站应用

### 1.2 获取 AppID 和 AppSecret
创建应用后，你会获得：
- **AppID** - 应用唯一标识
- **AppSecret** - 应用密钥（需妥善保管）

### 1.3 配置授权回调域
在开放平台设置：
- 授权回调域：`findclass.nz`
- 开发环境：`localhost`

## 2. 环境变量配置

### 2.1 开发环境
在 `.env.local` 文件中添加：
```bash
VITE_WECHAT_APP_ID=your-wechat-app-id
VITE_WECHAT_APP_SECRET=your-wechat-app-secret
```

### 2.2 生产环境
在 Vercel 或其他部署平台的环境变量中添加：
```
VITE_WECHAT_APP_ID=your-wechat-app-id
VITE_WECHAT_APP_SECRET=your-wechat-app-secret
```

## 3. 后端 API 实现

### 3.1 创建后端 endpoints

#### 3.1.1 生成登录二维码
```
GET /api/v1/auth/wechat/qrcode
```
返回：
```json
{
  "qrcode_url": "https://open.weixin.qq.com/connect/qrconnect?...",
  "scene_id": "xxx",
  "expire_seconds": 300
}
```

#### 3.1.2 轮询检查登录状态
```
GET /api/v1/auth/wechat/status?scene_id=xxx
```
返回：
```json
{
  "status": "scanning|confirmed|timeout",
  "user_info": {
    "openid": "xxx",
    "nickname": "xxx",
    "avatar": "xxx"
  }
}
```

#### 3.1.3 微信回调处理
```
GET /auth/wechat/callback?code=XXX&state=XXX
```
处理步骤：
1. 用 code 换取 access_token
2. 获取用户信息
3. 创建/更新用户
4. 生成应用 JWT
5. 重定向到前端

### 3.2 微信网页授权流程

```python
# Python (FastAPI/Django) 示例

import requests

def get_wechat_access_token(code):
    url = "https://api.weixin.qq.com/sns/oauth2/access_token"
    params = {
        "appid": WECHAT_APP_ID,
        "secret": WECHAT_APP_SECRET,
        "code": code,
        "grant_type": "authorization_code"
    }
    response = requests.get(url, params=params)
    return response.json()

def get_wechat_user_info(access_token, openid):
    url = "https://api.weixin.qq.com/sns/userinfo"
    params = {
        "access_token": access_token,
        "openid": openid,
        "lang": "zh_CN"
    }
    response = requests.get(url, params=params)
    return response.json()
```

```javascript
// Node.js/Express 示例

async function handleWeChatCallback(req, res) {
  const { code } = req.query;

  // 1. 用 code 换取 access_token
  const tokenResponse = await axios.get('https://api.weixin.qq.com/sns/oauth2/access_token', {
    params: {
      appid: process.env.WECHAT_APP_ID,
      secret: process.env.WECHAT_APP_SECRET,
      code,
      grant_type: 'authorization_code'
    }
  });

  const { access_token, openid } = tokenResponse.data;

  // 2. 获取用户信息
  const userResponse = await axios.get('https://api.weixin.qq.com/sns/userinfo', {
    params: {
      access_token,
      openid,
      lang: 'zh_CN'
    }
  });

  // 3. 创建/更新用户
  const user = await findOrCreateWeChatUser(userResponse.data);

  // 4. 生成 JWT
  const tokens = generateTokens(user);

  // 5. 重定向到前端
  res.redirect(`${FRONTEND_URL}/auth/wechat/callback?token=${tokens.accessToken}`);
}
```

## 4. 前端组件修改

### 4.1 修改 WeChatLoginButton 组件

当前组件已预留二维码 URL 生成逻辑，需要取消注释：

```typescript
// src/components/ui/WeChatLoginButton/index.tsx

// 取消注释并使用此函数
const generateWeChatQRUrl = () => {
  const appId = import.meta.env.VITE_WECHAT_APP_ID;
  const redirectUri = encodeURIComponent(window.location.origin + '/auth/wechat/callback');
  const state = generateRandomState();
  sessionStorage.setItem('wechat_login_state', state);

  return `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login#wechat_redirect`;
};
```

### 4.2 显示真实二维码

替换 mock 二维码：

```tsx
// 使用真实的微信二维码
{qrCodeUrl && <img src={qrCodeUrl} alt="WeChat QR Code" />}
```

### 4.3 轮询登录状态

```typescript
React.useEffect(() => {
  if (loginStatus !== 'polling') return;

  const checkLoginStatus = async () => {
    try {
      const response = await fetch(`/api/v1/auth/wechat/status?scene_id=${sceneId}`);
      const data = await response.json();

      if (data.status === 'confirmed') {
        // 登录成功，保存 token
        localStorage.setItem('auth_token', data.token);
        handleSuccess();
      } else if (data.status === 'timeout') {
        setLoginStatus('error');
      }
    } catch {
      // 继续轮询
    }
  };

  const timer = setInterval(checkLoginStatus, 2000);
  return () => clearInterval(timer);
}, [loginStatus, sceneId]);
```

## 5. 用户数据存储

### 5.1 用户表扩展
```sql
ALTER TABLE users ADD COLUMN wechat_openid VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN wechat_nickname VARCHAR(255);
ALTER TABLE users ADD COLUMN wechat_avatar VARCHAR(500);
```

### 5.2 登录逻辑
```javascript
async function handleWeChatLogin(wechatUserInfo) {
  // 1. 查找用户
  let user = await findUserByWeChatOpenid(wechatUserInfo.openid);

  // 2. 如果用户不存在，创建新用户
  if (!user) {
    user = await createUser({
      email: `${wechatUserInfo.openid}@wechat.local`,
      name: wechatUserInfo.nickname,
      avatar: wechatUserInfo.headimgurl,
      wechat_openid: wechatUserInfo.openid,
      wechat_nickname: wechatUserInfo.nickname,
      wechat_avatar: wechatUserInfo.headimgurl,
    });
  } else {
    // 更新用户信息
    await updateUser(user.id, {
      wechat_nickname: wechatUserInfo.nickname,
      wechat_avatar: wechatUserInfo.headimgurl,
    });
  }

  // 3. 生成 JWT
  const tokens = generateTokens(user);
  return tokens;
}
```

## 6. 当前前端状态

### 6.1 已实现
- [x] WeChatLoginButton UI 组件
- [x] Modal 弹窗
- [x] 模拟二维码显示
- [x] 轮询状态检查（mock）
- [x] 模拟扫码功能（开发环境）
- [x] 国际化文本

### 6.2 待实现
- [ ] 真实微信二维码 URL 生成
- [ ] 后端轮询接口调用
- [ ] 真实登录回调处理

### 6.3 前端代码位置
```
src/components/ui/WeChatLoginButton/index.tsx           # 登录按钮组件
src/components/ui/WeChatLoginButton/WeChatLoginButton.module.scss  # 样式
src/hooks/useAuth.ts                                  # socialLogin hook
src/services/api.ts                                   # socialLogin API
```

## 7. 测试

### 7.1 本地测试步骤
1. 配置 `.env.local` 中的微信 AppID
2. 启动开发服务器：`npm run dev`
3. 访问 `/login` 页面
4. 点击微信登录按钮
5. 点击"模拟扫码"按钮（开发环境）

### 7.2 集成测试
确保后端正确处理：
```bash
# 测试二维码生成
GET /api/v1/auth/wechat/qrcode

# 测试状态检查
GET /api/v1/auth/wechat/status?scene_id=xxx
```

## 8. 注意事项

### 8.1 安全考虑
- AppSecret 必须保存在后端，绝不能暴露到前端
- 使用 HTTPS 在生产环境
- 验证 state 参数防止 CSRF 攻击
- 轮询接口需要限流

### 8.2 微信限制
- 每天生成的二维码数量有限制
- 每个用户每天只能扫一次二维码
- 需要审核通过才能正式使用

### 8.3 用户体验
- 二维码有效期通常为 5 分钟
- 显示清晰的扫码指引
- 超时后提供重试选项

## 9. 相关文档

- [微信网页授权文档](https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login.html)
- [微信开放平台](https://open.weixin.qq.com/)
- [网站应用微信登录开发指南](https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login.html)
