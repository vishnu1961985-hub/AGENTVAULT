import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({
  name: "agentvault-test-client",
  version: "1.0.0",
});

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/agent/src/mcp/server.js"],
});

await client.connect(transport);

const result = await client.listTools();

console.log("=== AgentVault MCP Tools ===");

for (const tool of result.tools) {
  console.log(`Tool: ${tool.name}`);
  console.log(`Description: ${tool.description ?? ""}`);
  console.log(
    "Input schema:",
    JSON.stringify(tool.inputSchema, null, 2),
  );
}

await client.close();