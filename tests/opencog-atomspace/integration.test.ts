/**
 * Integration Tests for {SKILL_NAME}
 * 
 * Tests skill behavior with a real Copilot agent session.
 * These tests require Copilot CLI to be installed and authenticated.
 * 
 * Prerequisites:
 * 1. npm install -g @github/copilot-cli
 * 2. Run `copilot` and authenticate
 * 
 * Run with: npm run test:integration -- --testPathPattern={skill-name}
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  useAgentRunner,
  isSkillInvoked,
  areToolCallsSuccess,
  doesAssistantMessageIncludeKeyword,
  shouldSkipIntegrationTests
} from "../utils/agent-runner";

// Replace with your skill name
const SKILL_NAME = "opencog-atomspace";

// Use centralized skip logic from agent-runner
const describeIntegration = shouldSkipIntegrationTests() ? describe.skip : describe;

describeIntegration(`${SKILL_NAME}_ - Integration Tests`, () => {
  const agent = useAgentRunner();

  // Verify the skill is invoked for AtomSpace deployment prompt
  test("invokes skill for AtomSpace Azure deployment", async () => {
    const agentMetadata = await agent.run({
      prompt: "How do I deploy OpenCog AtomSpace on Azure VM?"
    });

    const isSkillUsed = isSkillInvoked(agentMetadata, SKILL_NAME);
    expect(isSkillUsed).toBe(true);
  });

  // Verify expected content about pattern matching
  test("response contains AtomSpace concepts", async () => {
    const agentMetadata = await agent.run({
      prompt: "Explain AtomSpace pattern matching with examples"
    });

    const hasAtomSpaceContent = doesAssistantMessageIncludeKeyword(
      agentMetadata,
      "pattern"
    ) || doesAssistantMessageIncludeKeyword(
      agentMetadata,
      "atom"
    );
    expect(hasAtomSpaceContent).toBe(true);
  });
});
