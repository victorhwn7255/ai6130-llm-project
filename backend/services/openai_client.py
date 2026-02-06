"""Client for cloud model (GPT-4o-mini) via OpenAI API."""
import time
from typing import AsyncGenerator
from openai import AsyncOpenAI
from config import get_settings


class OpenAIClient:
    def __init__(self):
        self.settings = get_settings()
        self.client = AsyncOpenAI(api_key=self.settings.openai_api_key)

    async def generate(self, prompt: str, system: str = "") -> dict:
        """Non-streaming generation."""
        start = time.perf_counter()
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        resp = await self.client.chat.completions.create(
            model=self.settings.cloud_model,
            messages=messages,
        )
        elapsed_ms = (time.perf_counter() - start) * 1000

        return {
            "text": resp.choices[0].message.content,
            "latency_ms": elapsed_ms,
            "input_tokens": resp.usage.prompt_tokens,
            "output_tokens": resp.usage.completion_tokens,
        }

    async def stream(self, prompt: str, system: str = "") -> AsyncGenerator[str, None]:
        """Streaming generation."""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        stream = await self.client.chat.completions.create(
            model=self.settings.cloud_model,
            messages=messages,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


_openai: OpenAIClient | None = None


def get_openai() -> OpenAIClient:
    global _openai
    if _openai is None:
        _openai = OpenAIClient()
    return _openai
