/**
 * Trigger Tests for {SKILL_NAME}
 * 
 * Tests that verify the skill triggers on appropriate prompts
 * and does NOT trigger on unrelated prompts.
 * 
 * Uses snapshot testing + parameterized tests for comprehensive coverage.
 * Copy this file to /tests/{skill-name}/triggers.test.ts
 */

import { TriggerMatcher } from "../utils/trigger-matcher";
import { loadSkill, LoadedSkill } from "../utils/skill-loader";

// Replace with your skill name
const SKILL_NAME = "opencog-atomspace";

describe(`${SKILL_NAME} - Trigger Tests`, () => {
  let triggerMatcher: TriggerMatcher;
  let skill: LoadedSkill;

  beforeAll(async () => {
    skill = await loadSkill(SKILL_NAME);
    triggerMatcher = new TriggerMatcher(skill);
  });

  describe("Should Trigger", () => {
    // Parameterized tests - prompts that SHOULD trigger this skill
    const shouldTriggerPrompts: string[] = [
      'Help me work with OpenCog atomspace',
      'Deploy atomspace database on Azure',
      'Configure hypergraph database for AGI',
      'Implement atomspace pattern matching',
      'Build OpenCog atomspace from source',
      'Setup distributed atomspace on Azure',
      'Use atomese programming language',
      'Deploy atomspace hypergraph on Azure VMs',
      'Configure DAS distributed atomspace',
      'Integrate atomspace with Azure storage',
      'OpenCog atomspace development guide',
      'atomspace query engine examples',
    ];

    test.each(shouldTriggerPrompts)(
      'triggers on: "%s"',
      (prompt) => {
        const result = triggerMatcher.shouldTrigger(prompt);
        expect(result.triggered).toBe(true);
      }
    );
  });

  describe("Should NOT Trigger", () => {
    // Parameterized tests - prompts that should NOT trigger this skill
    const shouldNotTriggerPrompts: string[] = [
      "What is the weather today?",
      "Help me write a poem",
      "Explain quantum computing theory",
      "Deploy AWS Lambda function",
      "Configure Google Cloud Storage bucket",
      "Neo4j Cypher query tutorial",
      "MongoDB aggregation pipeline",
      "React component lifecycle methods",
      "Python Flask REST API tutorial",
      "Terraform state management tips",
      "CSS grid layout techniques",
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
      // This snapshot helps detect unintended changes to trigger behavior
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
      const longPrompt = "Azure ".repeat(1000);
      const result = triggerMatcher.shouldTrigger(longPrompt);
      // Should not throw, may or may not trigger
      expect(typeof result.triggered).toBe("boolean");
    });

    test("is case insensitive", () => {
      // If your skill triggers on 'azure', it should also trigger on 'AZURE'
      const result1 = triggerMatcher.shouldTrigger("azure");
      const result2 = triggerMatcher.shouldTrigger("AZURE");
      expect(result1.triggered).toBe(result2.triggered);
    });
  });
});
