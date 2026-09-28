export class AgentService {
  health() {
    return {
      service: "agent-service",
      status: "ok",
      environment: process.env.NODE_ENV ?? "development",
    };
  }
}