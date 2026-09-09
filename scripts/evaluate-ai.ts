// AI grounding evaluation: for each sample question, run the real
// orchestrator (analyzeQuestion) against the seeded database and check that
// every number appearing in the narration also appears in the structured
// `groundedFacts` block it was built from. This only measures whether the
// active provider path is well-grounded — with no API keys set it exercises
// the mock provider, which is grounded by construction (it echoes the
// evidence block); re-run against a real provider to measure that path.

import { PrismaClient } from "@prisma/client";
import { analyzeQuestion } from "../src/lib/ai/orchestrator";

const prisma = new PrismaClient();

const QUESTIONS = [
  "Why did cash decline?",
  "What are the biggest expense drivers?",
  "Which customers create receivables risk?",
  "What upcoming obligations matter?",
  "Why is liquidity risk increasing?",
];

function extractNumbers(text: string): string[] {
  return (text.match(/[0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]+)?/g) ?? []).filter((n) => n.replace(/,/g, "").length >= 3);
}

async function main() {
  const org = await prisma.organization.findFirstOrThrow();
  let totalNumbers = 0;
  let groundedNumbers = 0;
  let validStructure = 0;

  for (const question of QUESTIONS) {
    const result = await analyzeQuestion(org.id, question);
    const factsJson = JSON.stringify(result.groundedFacts).replace(/,/g, "");
    const numbersInAnswer = extractNumbers(result.detail);
    totalNumbers += numbersInAnswer.length;
    for (const n of numbersInAnswer) {
      if (factsJson.includes(n.replace(/,/g, ""))) groundedNumbers++;
    }
    const structurallyValid = typeof result.agent === "string" && result.evidence.length > 0 && Object.keys(result.groundedFacts).length > 0;
    if (structurallyValid) validStructure++;

    console.log(`- "${question}" -> agent=${result.agent} provider=${result.provider} evidence=${result.evidence.length}`);
  }

  const groundingRate = totalNumbers > 0 ? (groundedNumbers / totalNumbers) * 100 : 100;
  console.log(`\nQuestions evaluated: ${QUESTIONS.length}`);
  console.log(`Structurally valid responses: ${validStructure}/${QUESTIONS.length}`);
  console.log(`Numeric grounding rate: ${groundingRate.toFixed(1)}% (${groundedNumbers}/${totalNumbers} numbers in answers traced to groundedFacts)`);
}

main().finally(() => prisma.$disconnect());
