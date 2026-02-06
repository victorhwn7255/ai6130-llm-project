"""
Extract surface-level features from queries for routing decisions.
Used both by the DistilBERT router (as additional features) and
the feature-only ablation variant (as sole input).
"""
import re
from typing import Dict


# Domain keyword dictionaries
CODE_KEYWORDS = {
    "code", "function", "bug", "debug", "python", "javascript", "java",
    "compile", "syntax", "api", "class", "method", "variable", "loop",
    "algorithm", "sql", "html", "css", "regex", "git", "docker",
    "typescript", "react", "import", "error", "exception", "stack",
}

MATH_KEYWORDS = {
    "calculate", "equation", "integral", "derivative", "matrix",
    "probability", "statistics", "algebra", "geometry", "theorem",
    "proof", "formula", "solve", "compute", "optimization", "sum",
    "average", "median", "regression", "polynomial", "factorial",
}

REASONING_INDICATORS = {
    "why", "explain", "compare", "contrast", "analyze", "evaluate",
    "what if", "how does", "difference between", "pros and cons",
    "implications", "cause", "effect", "reason", "justify",
}


def extract_features(query: str) -> Dict:
    """Extract routing-relevant features from a query string."""
    query_lower = query.lower()
    words = query_lower.split()

    # Token count
    token_count = len(words)

    # Code detection
    has_code_keywords = bool(CODE_KEYWORDS & set(words))
    has_code_block = "```" in query or bool(re.search(r'def |class |import |function |const |var |let ', query))
    has_code = has_code_keywords or has_code_block

    # Math detection
    has_math_keywords = bool(MATH_KEYWORDS & set(words))
    has_math_symbols = bool(re.search(r'[=+\-*/^∫∑∏√]|\d+\s*[+\-*/]\s*\d+', query))
    has_math = has_math_keywords or has_math_symbols

    # Reasoning complexity
    reasoning_count = sum(1 for indicator in REASONING_INDICATORS if indicator in query_lower)
    has_multi_step = bool(re.search(r'(step by step|first.*then|and also|additionally)', query_lower))

    # Question type
    is_question = query.strip().endswith("?") or query_lower.startswith(("what", "how", "why", "when", "where", "who"))
    is_creative = any(w in query_lower for w in ("write", "story", "poem", "essay", "create", "generate", "imagine"))
    is_factual = any(w in query_lower for w in ("what is", "define", "who is", "when did", "list", "name"))

    # Domain classification
    if has_code:
        domain = "coding"
    elif has_math:
        domain = "math"
    elif is_creative:
        domain = "creative"
    elif reasoning_count >= 2 or has_multi_step:
        domain = "reasoning"
    elif is_factual:
        domain = "factual"
    else:
        domain = "general"

    # Complexity score (0-1, heuristic)
    complexity = min(1.0, (
        (token_count / 100) * 0.3 +
        int(has_code) * 0.2 +
        int(has_math) * 0.2 +
        (reasoning_count / 5) * 0.2 +
        int(has_multi_step) * 0.1
    ))

    return {
        "token_count": token_count,
        "has_code": has_code,
        "has_math": has_math,
        "reasoning_depth": reasoning_count,
        "has_multi_step": has_multi_step,
        "is_question": is_question,
        "is_creative": is_creative,
        "is_factual": is_factual,
        "domain": domain,
        "complexity": round(complexity, 3),
    }


def features_to_vector(features: Dict) -> list[float]:
    """Convert feature dict to numeric vector for feature-only router."""
    domain_map = {"coding": 0, "math": 1, "creative": 2, "reasoning": 3, "factual": 4, "general": 5}
    return [
        features["token_count"] / 100.0,       # normalized
        float(features["has_code"]),
        float(features["has_math"]),
        features["reasoning_depth"] / 5.0,      # normalized
        float(features["has_multi_step"]),
        float(features["is_question"]),
        float(features["is_creative"]),
        float(features["is_factual"]),
        domain_map.get(features["domain"], 5) / 5.0,  # normalized
        features["complexity"],
    ]
