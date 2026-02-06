# Google Play Review Analyzer Backend

这是一个简单的 Node.js 后端服务，用于配合前端页面进行 API 调用测试。

## 快速开始

### 1. 安装依赖

请确保你已经安装了 [Node.js](https://nodejs.org/)。

在 `backend` 目录下打开终端，运行：

```bash
npm install
```

### 2. 启动服务

```bash
npm start
```

如果看到以下输出，说明服务启动成功：

```
Server is running on http://localhost:3000
```

### 3. 配置前端

1. 打开 `index.html`。
2. 点击右上角的齿轮图标 ⚙️。
3. 在 "后端 API 地址" 中输入 `http://localhost:3000`。
4. 点击 "测试" 按钮，应该显示绿色成功信息。
5. 保存配置，并切换到 **REAL** 模式。

## 功能说明

*   **GET /api/reviews**: 返回模拟的差评数据。
*   **POST /api/analyze**: 接收评论并返回模拟的 AI 分析结果。
*   **CORS**: 已配置允许所有跨域请求，方便前端直接调用。
