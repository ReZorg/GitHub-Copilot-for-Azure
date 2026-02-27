/**
 * Trigger Tests for opencog-cogutil
 * 
 * Tests that verify the skill triggers on appropriate prompts
 * and does NOT trigger on unrelated prompts.
 */

import { TriggerMatcher } from "../utils/trigger-matcher";
import { loadSkill, LoadedSkill } from "../utils/skill-loader";

const SKILL_NAME = "opencog-cogutil";

describe(`${SKILL_NAME} - Trigger Tests`, () => {
  let triggerMatcher: TriggerMatcher;
  let skill: LoadedSkill;

  beforeAll(async () => {
    skill = await loadSkill(SKILL_NAME);
    triggerMatcher = new TriggerMatcher(skill);
  });

  describe("Should Trigger - Installation & Build", () => {
    const installPrompts: string[] = [
      "How do I install the cogutil library?",
      "Help me build OpenCog cogutil from source",
      "What are the cogutil build dependencies?",
      "Show me cogutil installation steps",
      "Configure cmake for cogutil build",
    ];

    test.each(installPrompts)(
      'triggers on: "%s"',
      (prompt) => {
        const result = triggerMatcher.shouldTrigger(prompt);
        expect(result.triggered).toBe(true);
      }
    );
  });

  describe("Should Trigger - Logger", () => {
    const loggerPrompts: string[] = [
      "How do I configure the OpenCog cogutil logger?",
      "Help me use the cogutil Logger class",
      "Set cogutil logger debug level",
      "Configure logger functionality in cogutil",
    ];

    test.each(loggerPrompts)(
      'triggers on: "%s"',
      (prompt) => {
        const result = triggerMatcher.shouldTrigger(prompt);
        expect(result.triggered).toBe(true);
      }
    );
  });

  describe("Should Trigger - Threading", () => {
    const threadingPrompts: string[] = [
      "How to use the cogutil thread pool?",
      "OpenCog cogutil threading utilities",
      "Configure cogutil concurrent queue",
      "Help with cogutil threading utilities",
    ];

    test.each(threadingPrompts)(
      'triggers on: "%s"',
      (prompt) => {
        const result = triggerMatcher.shouldTrigger(prompt);
        expect(result.triggered).toBe(true);
      }
    );
  });

  describe("Should NOT Trigger", () => {
    const shouldNotTriggerPrompts: string[] = [
      "What is the weather today?",
      "Write a poem about clouds",
      "How do I use AWS Lambda?",
      "Help me with React components",
      "What is machine learning?",
      "Set up Express.js server",
      "Configure nginx reverse proxy",
    ];

    test.each(shouldNotTriggerPrompts)(
      'does not trigger on: "%s"',
      (prompt) => {
        const result = triggerMatcher.shouldTrigger(prompt);
        expect(result.triggered).toBe(false);
      }
    );
  });

  describe("Trigger Keywords Snapshot", () => {
    test("skill keywords match snapshot", () => {
      expect(triggerMatcher.getKeywords()).toMatchSnapshot();
    });

    test("skill description triggers match snapshot", () => {
      expect({
        name: skill.metadata.name,
        description: skill.metadata.description,
        extractedKeywords: triggerMatcher.getKeywords()
      }).toMatchSnapshot();
    });
  });

  describe("Edge Cases", () => {
    test("handles empty prompt", () => {
      const result = triggerMatcher.shouldTrigger("");
      expect(result.triggered).toBe(false);
    });

    test("handles very long prompt", () => {
      const longPrompt = "cogutil thread pool logger ".repeat(100);
      const result = triggerMatcher.shouldTrigger(longPrompt);
      expect(typeof result.triggered).toBe("boolean");
    });

    test("is case insensitive for cogutil terms", () => {
      const result1 = triggerMatcher.shouldTrigger("COGUTIL LOGGER");
      const result2 = triggerMatcher.shouldTrigger("cogutil logger");
      expect(result1.triggered).toBe(result2.triggered);
    });

    test("distinguishes between cogutil and unrelated tools", () => {
      const cogutilResult = triggerMatcher.shouldTrigger("Configure cogutil logger settings");
      const unrelatedResult = triggerMatcher.shouldTrigger("Configure nginx settings");
      expect(cogutilResult.triggered).toBe(true);
      expect(unrelatedResult.triggered).toBe(false);
    });
  });
});
