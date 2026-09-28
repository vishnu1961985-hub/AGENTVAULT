import { AgentService } from "./service/agent-service.js";

const service = new AgentService();

console.log("AgentVault Agent Service");
console.log(service.health());