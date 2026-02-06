"""Client for local Phi-3.5-mini via Ollama."""
import time
import httpx
from typing import AsyncGenerator
from config import get_settings


class OllamaClient:
    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.ollama_base_url

    async def generate(self, prompt: str, system: str = "") -> dict:
        """
        Non-streaming generation. Returns full response + metadata.

        Fix 1 Applied: Build messages list conditionally to avoid [None, {...}]
        when system is empty. This matches the pattern used in stream().
        """
        start = time.perf_counter()

        # Build messages list conditionally (Fix 1)
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.settings.ollama_model,
                    "messages": messages,
                    "stream": False,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        elapsed_ms = (time.perf_counter() - start) * 1000
        return {
            "text": data["message"]["content"],
            "latency_ms": elapsed_ms,
            "input_tokens": data.get("prompt_eval_count", 0),
            "output_tokens": data.get("eval_count", 0),
        }

    async def stream(self, prompt: str, system: str = "") -> AsyncGenerator[str, None]:
        """Streaming generation. Yields text chunks."""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json={"model": self.settings.ollama_model, "messages": messages, "stream": True},
            ) as resp:
                import json
                async for line in resp.aiter_lines():
                    if line:
                        chunk = json.loads(line)
                        if content := chunk.get("message", {}).get("content", ""):
                            yield content


_ollama: OllamaClient | None = None


def get_ollama() -> OllamaClient:
    global _ollama
    if _ollama is None:
        _ollama = OllamaClient()
    return _ollama
