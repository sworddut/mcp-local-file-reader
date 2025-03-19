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
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const dataDir = path.resolve(__dirname, "data");

  try {
    const files = fs.readdirSync(dataDir);
    return {
      resources: files.map(file => ({
        uri: `file:///${file}`,
        mimeType: "text/plain",
        name: file,
        description: `File in data directory: ${file}`,
      }))
    };
  } catch (error) {
    throw new Error(`无法读取目录: ${dataDir}`);
  }
});

/**
 * 读取指定文件
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const url = new URL(request.params.uri);
  const filePath = path.resolve(__dirname, "data", url.pathname.slice(1));

  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf8");
  return {
    contents: [
      {
        uri: request.params.uri,
        mimeType: "text/plain",
        text: content
      }
    ]
  };
});

/**
 * 提供工具以便客户端按需读取文件
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "read_file",
        description: "读取指定文件内容",
        inputSchema: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "要读取的文件路径"
            }
          },
          required: ["filePath"]
        }
      },
      {
        name: "list_files",
        description: "列出 data 目录中的所有文件"
      }
    ]
  };
});

/**
 * 处理工具请求
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "read_file": {
      const filePath = String(request.params.arguments?.filePath);
      const fullPath = path.resolve(__dirname, "data", filePath);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }

      const content = fs.readFileSync(fullPath, "utf8");
      return {
        content: [
          {
            type: "text",
            text: content
          }
        ]
      };
    }

    case "list_files": {
      const dataDir = path.resolve(__dirname, "data");
      const files = fs.readdirSync(dataDir);

      return {
        content: [
          {
            type: "text",
            text: files.join("\n")
          }
        ]
      };
    }

    default:
      throw new Error("未知工具");
  }
});

/**
 * 启动服务器
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
