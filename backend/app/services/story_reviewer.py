import json
import re

from app.services.llm.base import BaseLLMProvider

SYSTEM_PROMPT = """You are an expert agile coach and QA analyst. Your task is to review a user story for quality issues.

Evaluate each story against these criteria:
1. Clarity — Is the story unambiguous and easy to understand?
2. Completeness — Does it have a clear role, goal, and benefit?
3. Testability — Are the acceptance criteria specific and testable?
4. Independence — Can it be developed independently?
5. Value — Does it deliver clear business value?

Return ONLY valid JSON with this structure:
{
  "overall_status": "clear" | "ambiguous" | "incomplete",
  "feedback": {
    "clarity": {"score": 1-5, "comment": "..."},
    "completeness": {"score": 1-5, "comment": "..."},
    "testability": {"score": 1-5, "comment": "..."},
    "independence": {"score": 1-5, "comment": "..."},
    "value": {"score": 1-5, "comment": "..."}
  },
  "suggestions": "Specific rewrite suggestions or improvements"
}"""


USER_PROMPT_TEMPLATE = """Review this user story:

Title: {title}

Description: {description}

Acceptance Criteria:
{acceptance_criteria}

Return your review as JSON."""


async def review_story(
    title: str,
    description: str,
    acceptance_criteria: str | None,
    provider: BaseLLMProvider,
) -> dict:
    user_prompt = USER_PROMPT_TEMPLATE.format(
        title=title,
        description=description,
        acceptance_criteria=acceptance_criteria or "Not provided",
    )
    raw = await provider.complete(SYSTEM_PROMPT, user_prompt)
    raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            raise ValueError(f"LLM did not return valid JSON. Response: {raw[:500]}")
        result = json.loads(match.group())

    return result
