#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";

// 定义支持的工具名称常量
const TOOL_NAMES = {
  READ_FILE: "read_file",
  LIST_FILES: "list_files",
  GET_FILE_INFO: "get_file_info"
};

/**
 * 创建 MCP 服务器
 */
const server = new Server(
  {
    name: "mcp-local-file-reader",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

/**
 * 列出 `/data` 目录中的文件
 */
server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
  // 为 ListResourcesRequestSchema 使用默认路径，因为它没有 arguments 参数
  const dataDir = "C:\\Users\\24067\\webProject\\mcp-local-file-reader\\data";
  console.log(`尝试列出目录: ${dataDir}`);

  try {
    const files = fs.readdirSync(dataDir);
    console.log(`列出目录 ${dataDir} 中的文件:`, files);
    return {
      resources: files.map(file => ({
        uri: `file:///${file}`,
        mimeType: getMimeType(file),
        name: file,
        description: `File in data directory: ${file}`,
      }))
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`无法读取目录: ${dataDir}`, error);
    throw new Error(`无法读取目录: ${dataDir} - ${errorMessage}`);
  }
});

/**
 * 读取指定文件
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const url = new URL(request.params.uri);
  const filePath = path.resolve(url.pathname.slice(1));
  console.log(`尝试读取文件: ${filePath}`);

  try {
    if (!fs.existsSync(filePath)) {
      console.error(`文件不存在: ${filePath}`);
      throw new Error(`文件不存在: ${filePath}`);
    }

    const content = readFileContent(filePath);
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: getMimeType(filePath),
          text: content
        }
      ]
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`读取文件失败: ${filePath}`, error);
    throw new Error(`读取文件失败: ${filePath} - ${errorMessage}`);
  }
});

/**
 * 提供工具以便客户端按需读取文件
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.log("列出可用工具");
  return {
    tools: [
      {
        name: TOOL_NAMES.READ_FILE,
        description: "读取指定文件内容",
        inputSchema: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "要读取的文件路径（绝对路径）"
            }
          },
          required: ["filePath"]
        }
      },
      {
        name: TOOL_NAMES.LIST_FILES,
        description: "列出指定目录中的所有文件",
        inputSchema: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "要列出文件的目录路径（绝对路径）"
            }
          },
          required: ["filePath"]
        }
      },
      {
        name: TOOL_NAMES.GET_FILE_INFO,
        description: "获取指定文件的详细信息",
        inputSchema: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "要获取信息的文件路径（绝对路径）"
            }
          },
          required: ["filePath"]
        }
      }
    ]
  };
});

/**
 * 处理工具请求
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.log("工具调用请求:", request.params);
  
  try {
    switch (request.params.name) {
      case TOOL_NAMES.READ_FILE: {
        const filePath = String(request.params.arguments?.filePath || "");
        console.log(`尝试读取文件: ${filePath}`);
        
        if (!filePath) {
          throw new Error("文件路径不能为空");
        }
        
        const fullPath = path.resolve(filePath);
        console.log(`完整文件路径: ${fullPath}`);

        if (!fs.existsSync(fullPath)) {
          console.error(`文件不存在: ${filePath}`);
          throw new Error(`文件不存在: ${filePath}`);
        }

        const content = readFileContent(fullPath);
        return {
          content: [
            {
              type: "text",
              text: content
            }
          ]
        };
      }

      case TOOL_NAMES.LIST_FILES: {
        const filesPath = String(request.params.arguments?.filePath || "");
        console.log(`尝试列出目录: ${filesPath}`);
        
        if (!filesPath) {
          throw new Error("目录路径不能为空");
        }
        
        if (!fs.existsSync(filesPath)) {
          console.error(`目录不存在: ${filesPath}`);
          throw new Error(`目录不存在: ${filesPath}`);
        }
        
        const files = fs.readdirSync(filesPath);
        console.log(`找到文件:`, files);

        return {
          content: [
            {
              type: "text",
              text: files.join("\n")
            }
          ]
        };
      }
      
      case TOOL_NAMES.GET_FILE_INFO: {
        const filePath = String(request.params.arguments?.filePath || "");
        console.log(`尝试获取文件信息: ${filePath}`);
        
        if (!filePath) {
          throw new Error("文件路径不能为空");
        }
        
        const fullPath = path.resolve(filePath);
        
        if (!fs.existsSync(fullPath)) {
          console.error(`文件不存在: ${filePath}`);
          throw new Error(`文件不存在: ${filePath}`);
        }
        
        const stats = fs.statSync(fullPath);
        const info = {
          path: fullPath,
          size: stats.size,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile(),
          created: stats.birthtime,
          modified: stats.mtime,
          extension: path.extname(fullPath),
          mimeType: getMimeType(fullPath)
        };
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(info, null, 2)
            }
          ]
        };
      }

      default:
        console.error(`未知工具: ${request.params.name}`);
        throw new Error(`未知工具: ${request.params.name}。可用工具: ${Object.values(TOOL_NAMES).join(", ")}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("工具调用错误:", error);
    throw new Error(`工具调用错误: ${errorMessage}`);
  }
});

/**
 * 获取文件的MIME类型
 * @param filePath 文件路径
 * @returns MIME类型
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.md': 'text/markdown',
    '.xml': 'application/xml',
    '.zip': 'application/zip',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.wav': 'audio/wav',
    '.avi': 'video/x-msvideo',
    '.csv': 'text/csv'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 读取文件内容，根据文件类型进行适当处理
 * @param filePath 文件路径
 * @returns 文件内容
 */
function readFileContent(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  
  // 二进制文件类型列表
  const binaryExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.zip', '.mp3',
    '.mp4', '.wav', '.avi'
  ];
  
  try {
    if (binaryExtensions.includes(ext)) {
      // 对于二进制文件，返回提示信息
      return `[二进制文件: ${path.basename(filePath)}] - 文件大小: ${fs.statSync(filePath).size} 字节`;
    } else {
      // 对于文本文件，直接读取内容
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`读取文件失败: ${filePath}`, error);
    return `[读取文件失败: ${errorMessage}]`;
  }
}

/**
 * 启动服务器
 */
async function main() {
  console.log("启动 MCP 服务器...");
  console.log(`支持的工具: ${Object.values(TOOL_NAMES).join(", ")}`);
  
  const transport = new StdioServerTransport();
  console.log("连接到传输层...");
  await server.connect(transport);
  console.log("MCP 服务器已启动并准备接收请求");
}

main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error("Server error:", errorMessage);
  process.exit(1);
});
