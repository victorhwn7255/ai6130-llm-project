"""
E3 (ablation): Train feature-only router (no embeddings).
Uses sklearn LogisticRegression on handcrafted features.

Fix 6 Applied:
- Uses shared split function from utils/data_splits.py
- Verifies test set hash matches DistilBERT's hash

Usage:
  python scripts/train_feature_router.py --data data/labeled/train_5k.jsonl
"""
import json
import pickle
import argparse
import numpy as np
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score, classification_report

# Add parent to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from utils.data_splits import load_and_split_data, verify_test_hash
from backend.services.feature_extractor import extract_features, features_to_vector


def main(data_path: str):
    # Load data using shared split function (Fix 6)
    print(f"Loading data from {data_path}")
    (train_texts, train_labels,
     val_texts, val_labels,
     test_texts, test_labels,
     test_hash) = load_and_split_data(data_path)

    print(f"\n*** Test set hash (Fix 6): {test_hash} ***")

    # Verify hash matches DistilBERT's if available
    distilbert_results_path = Path("data/results/router_accuracy.json")
    if distilbert_results_path.exists():
        with open(distilbert_results_path) as f:
            distilbert_results = json.load(f)
        expected_hash = distilbert_results.get("test_hash")
        if expected_hash:
            try:
                verify_test_hash(expected_hash, test_hash)
                print("*** Hash verification PASSED: Using identical test set as DistilBERT ***")
            except AssertionError as e:
                print(f"WARNING: {e}")
    else:
        print("Note: DistilBERT results not found. Run train_router.py first for hash verification.")

    # Featurize all data
    def featurize(texts):
        vectors = []
        for text in texts:
            features = extract_features(text)
            vectors.append(features_to_vector(features))
        return np.array(vectors)

    print("\nExtracting features...")
    X_train = featurize(train_texts)
    X_val = featurize(val_texts)
    X_test = featurize(test_texts)
    y_train = np.array(train_labels)
    y_val = np.array(val_labels)
    y_test = np.array(test_labels)

    print(f"Feature vector shape: {X_train.shape}")

    # Train
    print("\nTraining LogisticRegression...")
    clf = LogisticRegression(max_iter=1000, random_state=42)
    clf.fit(X_train, y_train)

    # Results
    for name, X_s, y_s in [("Val", X_val, y_val), ("Test", X_test, y_test)]:
        preds = clf.predict(X_s)
        probs = clf.predict_proba(X_s)[:, 1]
        print(f"\n=== {name} Set ===")
        print(f"  Accuracy:  {accuracy_score(y_s, preds):.4f}")
        print(f"  F1:        {f1_score(y_s, preds):.4f}")
        print(f"  Precision: {precision_score(y_s, preds):.4f}")
        print(f"  Recall:    {recall_score(y_s, preds):.4f}")
        print(f"  AUROC:     {roc_auc_score(y_s, probs):.4f}")
        print(classification_report(y_s, preds, target_names=["cloud", "local"]))

    # Save model
    Path("data/models").mkdir(parents=True, exist_ok=True)
    with open("data/models/feature_router.pkl", "wb") as f:
        pickle.dump(clf, f)
    print("Model saved to data/models/feature_router.pkl")

    # Save results
    test_preds = clf.predict(X_test)
    test_probs = clf.predict_proba(X_test)[:, 1]
    results = {
        "test_hash": test_hash,  # For verification
        "accuracy": accuracy_score(y_test, test_preds),
        "f1": f1_score(y_test, test_preds),
        "precision": precision_score(y_test, test_preds),
        "recall": recall_score(y_test, test_preds),
        "auroc": roc_auc_score(y_test, test_probs),
        "train_size": len(train_texts),
        "val_size": len(val_texts),
        "test_size": len(test_texts),
    }

    Path("data/results").mkdir(parents=True, exist_ok=True)
    with open("data/results/feature_router_accuracy.json", "w") as f:
        json.dump(results, f, indent=2)

    # Feature importance
    feature_names = ["token_count", "has_code", "has_math", "reasoning_depth",
                     "has_multi_step", "is_question", "is_creative", "is_factual",
                     "domain", "complexity"]
    importances = sorted(zip(feature_names, clf.coef_[0]), key=lambda x: abs(x[1]), reverse=True)
    print("\nFeature Importances (by absolute coefficient):")
    for name, coef in importances:
        print(f"  {name:20s}: {coef:+.4f}")

    print(f"\nResults saved to data/results/feature_router_accuracy.json")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="data/labeled/train_5k.jsonl")
    args = parser.parse_args()
    main(args.data)
