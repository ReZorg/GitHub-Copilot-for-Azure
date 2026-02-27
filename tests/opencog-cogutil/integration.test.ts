/**
 * Integration Tests for opencog-cogutil
 * 
 * Tests skill behavior with a real Copilot agent session.
 * These tests require Copilot CLI to be installed and authenticated.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  useAgentRunner,
  isSkillInvoked,
  doesAssistantMessageIncludeKeyword,
  shouldSkipIntegrationTests
} from "../utils/agent-runner";

const SKILL_NAME = "opencog-cogutil";

const describeIntegration = shouldSkipIntegrationTests() ? describe.skip : describe;

describeIntegration(`${SKILL_NAME} - Integration Tests`, () => {
  const agent = useAgentRunner();

  test("invokes skill for cogutil installation prompt", async () => {
    const agentMetadata = await agent.run({
      prompt: "How do I install the OpenCog cogutil library?"
    });

    const isSkillUsed = isSkillInvoked(agentMetadata, SKILL_NAME);
    expect(isSkillUsed).toBe(true);
  });

  test("response contains build instructions", async () => {
    const agentMetadata = await agent.run({
      prompt: "How do I build cogutil from source?"
    });

    const hasCmake = doesAssistantMessageIncludeKeyword(agentMetadata, "cmake");
    const hasMake = doesAssistantMessageIncludeKeyword(agentMetadata, "make");
    expect(hasCmake || hasMake).toBe(true);
  });

  test("invokes skill for logger configuration prompt", async () => {
    const agentMetadata = await agent.run({
      prompt: "How do I configure the cogutil Logger?"
    });

    const isSkillUsed = isSkillInvoked(agentMetadata, SKILL_NAME);
    expect(isSkillUsed).toBe(true);
  });

  test("invokes skill for threading utilities prompt", async () => {
    const agentMetadata = await agent.run({
      prompt: "How do I use the cogutil thread pool?"
    });

    const isSkillUsed = isSkillInvoked(agentMetadata, SKILL_NAME);
    expect(isSkillUsed).toBe(true);
  });
});
