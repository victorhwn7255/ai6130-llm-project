"""LLM-as-Judge: scores response quality on 1-10 scale."""
from openai import AsyncOpenAI
from config import get_settings

JUDGE_PROMPT = """You are an expert evaluator. Given a user query and an AI assistant's response, rate the response quality.

Consider: accuracy, completeness, helpfulness, coherence.

First, explain your reasoning step-by-step in 2-3 sentences.
Then output a score from 1-10 on the last line as:
Score: X

[User Query]: {query}
[Assistant Response]: {response}"""

PAIRWISE_PROMPT = """Compare these two responses to the user's query.

[User Query]: {query}

[Response A]: {response_a}

[Response B]: {response_b}

Which response better addresses the user's needs?
First, explain your reasoning in 2-3 sentences.
Then output exactly one of: A, B, or TIE on the last line."""


class Judge:
    def __init__(self):
        self.settings = get_settings()
        self.client = AsyncOpenAI(api_key=self.settings.openai_api_key)
        # Read judge model from settings (allows switching via .env)
        self.judge_model = self.settings.judge_model

    async def score(self, query: str, response: str) -> float:
        """Score a single response on 1-10 scale."""
        result = await self.score_with_reasoning(query, response)
        return result["score"]

    async def score_with_reasoning(self, query: str, response: str) -> dict:
        """Score a single response on 1-10 scale and return reasoning."""
        resp = await self.client.chat.completions.create(
            model=self.judge_model,
            messages=[{"role": "user", "content": JUDGE_PROMPT.format(
                query=query, response=response
            )}],
            temperature=0.0,
        )
        text = resp.choices[0].message.content
        score = 5.0  # fallback
        reasoning = text.strip()

        # Extract score from last line
        lines = text.strip().split("\n")
        for line in reversed(lines):
            if "score:" in line.lower():
                try:
                    score = float(line.split(":")[-1].strip())
                    # Remove score line from reasoning
                    reasoning = "\n".join(l for l in lines if "score:" not in l.lower()).strip()
                    break
                except ValueError:
                    continue

        return {"score": score, "reasoning": reasoning}

    async def pairwise(self, query: str, response_a: str, response_b: str) -> str:
        """Compare two responses. Returns 'A', 'B', or 'TIE'."""
        resp = await self.client.chat.completions.create(
            model=self.judge_model,
            messages=[{"role": "user", "content": PAIRWISE_PROMPT.format(
                query=query, response_a=response_a, response_b=response_b
            )}],
            temperature=0.0,
        )
        text = resp.choices[0].message.content.strip()
        last_line = text.split("\n")[-1].strip().upper()
        if "TIE" in last_line:
            return "TIE"
        elif "A" in last_line and "B" not in last_line:
            return "A"
        elif "B" in last_line:
            return "B"
        return "TIE"  # fallback
