"""Cost calculations for cloud vs local routing."""
import sys
sys.path.insert(0, ".")

from schemas.api import Route


# GPT-4o-mini pricing (per 1M tokens)
CLOUD_INPUT_COST = 0.15 / 1_000_000
CLOUD_OUTPUT_COST = 0.60 / 1_000_000


def compute_cost(route: Route, input_tokens: int, output_tokens: int) -> float:
    if route == Route.LOCAL:
        return 0.0  # local inference is effectively free
    return (input_tokens * CLOUD_INPUT_COST) + (output_tokens * CLOUD_OUTPUT_COST)


def compute_savings(input_tokens: int, output_tokens: int) -> float:
    """What routing locally saves vs sending to cloud."""
    return compute_cost(Route.CLOUD, input_tokens, output_tokens)
