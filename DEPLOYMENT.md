# Vercel 部署指南

## 部署步骤

### 1. 准备 Git 仓库
```bash
cd particle-system
git init
git add .
git commit -m "Initial commit: 3D Particle System"
```

### 2. 推送到 GitHub
```bash
# 在 GitHub 创建新仓库后
git remote add origin https://github.com/YOUR_USERNAME/particle-system.git
git branch -M main
git push -u origin main
```

### 3. 部署到 Vercel
1. 访问 [vercel.com](https://vercel.com)
2. 使用 GitHub 账号登录
3. 点击 "New Project"
4. 导入你的 `particle-system` 仓库
5. 配置如下：
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. 点击 "Deploy"

### 4. 完成
部署完成后，Vercel 会提供一个 URL（如 `https://particle-system.vercel.app`）。

## 注意事项

✅ **已优化的部署问题**：
- ✅ 启动屏幕：用户必须点击"START"才能初始化摄像头和音频（符合浏览器策略）
- ✅ 移动端优化：viewport 设置为禁止缩放，前置摄像头默认
- ✅ 音频上下文：仅在用户交互后初始化
- ✅ 构建成功：无错误，可直接部署

## 本地测试
```bash
npm run build
npm run preview
```

## 环境要求
- Node.js 18+
- 现代浏览器（支持 WebRTC 和 Web Audio API）
- HTTPS 环境（Vercel 自动提供）
