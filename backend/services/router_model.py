"""
DistilBERT-based binary router: predicts whether the local model
can handle a query sufficiently (1) or needs cloud routing (0).
"""
import time
import torch
import numpy as np
from pathlib import Path
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification
from services.feature_extractor import extract_features
from config import get_settings
from schemas.api import Route, RoutingDecision


class RouterModel:
    def __init__(self):
        self.settings = get_settings()
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = None
        self.tokenizer = None
        self._load_model()

    def _load_model(self):
        model_path = Path(self.settings.router_model_path)
        if model_path.exists():
            self.tokenizer = DistilBertTokenizer.from_pretrained(model_path)
            self.model = DistilBertForSequenceClassification.from_pretrained(model_path)
            self.model.to(self.device).eval()
        else:
            # Fallback: load base model (untrained — for dev/testing)
            self.tokenizer = DistilBertTokenizer.from_pretrained("distilbert-base-uncased")
            self.model = DistilBertForSequenceClassification.from_pretrained(
                "distilbert-base-uncased", num_labels=2
            )
            self.model.to(self.device).eval()

    def predict(self, query: str, threshold: float | None = None) -> RoutingDecision:
        """Route a query. Returns decision with confidence and features."""
        threshold = threshold or self.settings.routing_threshold
        start = time.perf_counter()

        features = extract_features(query)

        # DistilBERT inference
        inputs = self.tokenizer(
            query, return_tensors="pt", truncation=True, max_length=512, padding=True
        ).to(self.device)

        with torch.no_grad():
            logits = self.model(**inputs).logits
            probs = torch.softmax(logits, dim=-1)
            local_confidence = probs[0, 1].item()  # class 1 = local-sufficient

        elapsed_ms = (time.perf_counter() - start) * 1000

        route = Route.LOCAL if local_confidence >= threshold else Route.CLOUD

        return RoutingDecision(
            route=route,
            confidence=round(local_confidence, 4),
            features=features,
            router_latency_ms=round(elapsed_ms, 2),
        )


class FeatureOnlyRouter:
    """Ablation variant: routes using only handcrafted features, no embeddings."""

    def __init__(self, model_path: str = "data/models/feature_router.pkl"):
        import pickle
        self.model_path = Path(model_path)
        self.clf = None
        if self.model_path.exists():
            with open(self.model_path, "rb") as f:
                self.clf = pickle.load(f)

    def predict(self, query: str, threshold: float = 0.6) -> RoutingDecision:
        from services.feature_extractor import features_to_vector
        start = time.perf_counter()
        features = extract_features(query)
        vec = np.array([features_to_vector(features)])

        if self.clf:
            prob = self.clf.predict_proba(vec)[0, 1]
        else:
            prob = 0.5  # untrained fallback

        elapsed_ms = (time.perf_counter() - start) * 1000
        route = Route.LOCAL if prob >= threshold else Route.CLOUD
        return RoutingDecision(
            route=route,
            confidence=round(prob, 4),
            features=features,
            router_latency_ms=round(elapsed_ms, 2),
        )


# Singleton
_router: RouterModel | None = None


def get_router() -> RouterModel:
    global _router
    if _router is None:
        _router = RouterModel()
    return _router
