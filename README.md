# MCP Local File Reader

一个基于 Model Context Protocol (MCP) 的本地文件读取服务器，允许 AI 模型安全地访问本地文件系统。

## 功能特点

### 资源 (Resources)
- 列出和访问本地文件系统中的文件
- 支持多种文件类型，包括文本文件和二进制文件
- 自动检测文件 MIME 类型，提供适当的内容处理

### 工具 (Tools)
- `read_file` - 读取指定文件的内容
  - 对文本文件返回完整内容
  - 对二进制文件返回文件信息摘要
- `list_files` - 列出指定目录中的所有文件
  - 返回文件名列表
- `get_file_info` - 获取指定文件的详细信息
  - 返回文件大小、类型、创建时间等元数据

## 安装

```bash
npm install mcp-local-file-reader
```

## 使用方法

### 作为命令行工具

安装后，可以直接在命令行中运行：

```bash
npx mcp-local-file-reader
```

### 在代码中使用

```javascript
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 启动 MCP 服务器
const mcpServer = spawn('node', [join(__dirname, 'node_modules/mcp-local-file-reader/build/index.js')], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// 与服务器通信
mcpServer.stdout.on('data', (data) => {
  console.log(`MCP 服务器输出: ${data}`);
});

mcpServer.stderr.on('data', (data) => {
  console.error(`MCP 服务器错误: ${data}`);
});
```

## 与 AI 工具集成

### 在 Windsurf 中使用

1. 在 Windsurf 的 mcp_config.json 配置文件中添加以下配置(FILE_TOOLS_API_KEY暂时还不需要)：

#### 本地化部署

```json
{
  "servers": {
    "file-tools": {
      "command": "cmd",
      "args": [
        "/c",
        "node",
        "path/to/mcp-local-file-reader/build/index.js"
      ],
      "env": {
        "FILE_TOOLS_API_KEY": ""
      }
    }
  }
}
```

#### 使用npm的形式部署

```json
{
  "servers": {
    "file-tools": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "mcp-local-file-reader"
      ],
      "env": {
        "FILE_TOOLS_API_KEY": ""
      }
    }
  }
}
```


点击windsurf对话框的小锤子图标，点击refrsh刷新服务器
官方配置说明：https://docs.codeium.com/windsurf/mcp

2. 重启 Windsurf 以加载新的 MCP 配置

### 在其他 MCP 兼容的 AI 应用中使用

按照特定应用的 MCP 集成指南，添加此服务器作为工具提供者。

## 开发

安装依赖：
```bash
npm install
```

构建服务器：
```bash
npm run build
```

开发模式（自动重新构建）：
```bash
npm run watch
```

使用 MCP Inspector 测试：
```bash
npm run inspector
```

## 安全注意事项

此服务器允许 AI 模型访问本地文件系统，请谨慎使用并确保：

1. 只允许访问必要的目录
2. 不要暴露敏感文件或目录
3. 在生产环境中使用前，考虑添加额外的安全限制

## 许可证

MIT
