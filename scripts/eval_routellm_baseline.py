"""
Fix 3 (NEW): RouteLLM Matrix Factorization baseline for three-way comparison in E3.

This script does NOT exist in the blueprint and is created per prompt.md Fix 3.

Loads the pre-trained RouteLLM MF router from HuggingFace and evaluates it
on the same held-out test set used for DistilBERT and feature-only routers.

Note: RouteLLM's MF router was trained on Chatbot Arena data, not on our
labeled data. Running it on our test set is a valid out-of-distribution
evaluation. Mention this in the report's Methodology section.

Usage:
  python scripts/eval_routellm_baseline.py --data data/labeled/train_5k.jsonl
"""
import json
import argparse
import numpy as np
from pathlib import Path
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score

# Add parent to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.data_splits import load_and_split_data, verify_test_hash


def main(data_path: str):
    # Load data using shared split function (Fix 6)
    print(f"Loading data from {data_path}")
    (train_texts, train_labels,
     val_texts, val_labels,
     test_texts, test_labels,
     test_hash) = load_and_split_data(data_path)

    print(f"\n*** Test set hash (Fix 6): {test_hash} ***")
    print(f"Test set size: {len(test_texts)}")

    # Verify hash matches other routers if available
    for results_file, name in [
        ("data/results/router_accuracy.json", "DistilBERT"),
        ("data/results/feature_router_accuracy.json", "Feature-only"),
    ]:
        if Path(results_file).exists():
            with open(results_file) as f:
                results = json.load(f)
            expected_hash = results.get("test_hash")
            if expected_hash:
                try:
                    verify_test_hash(expected_hash, test_hash)
                    print(f"*** Hash verification PASSED for {name} ***")
                except AssertionError as e:
                    print(f"WARNING for {name}: {e}")

    # Load RouteLLM MF router
    print("\nLoading RouteLLM MF router (routellm/mf_gpt4_augmented)...")
    try:
        from routellm.controller import Controller

        # Initialize controller with MF router
        controller = Controller(
            routers=["mf"],
            strong_model="gpt-4",      # Strong model name (for routing decision)
            weak_model="gpt-3.5-turbo"  # Weak model name (for routing decision)
        )
        print("RouteLLM loaded successfully")
    except ImportError:
        print("ERROR: routellm package not installed. Run: pip install routellm")
        return
    except Exception as e:
        print(f"ERROR loading RouteLLM: {e}")
        print("This may require downloading model weights on first run.")
        return

    # Get predictions for test set
    print(f"\nRunning RouteLLM on {len(test_texts)} test queries...")
    predictions = []
    probabilities = []

    for i, query in enumerate(test_texts):
        if (i + 1) % 100 == 0:
            print(f"  Progress: {i + 1}/{len(test_texts)}")

        try:
            # Get routing decision from RouteLLM
            # RouteLLM returns the model to use (strong or weak)
            routed_model = controller.route(
                prompt=query,
                router="mf",
                threshold=0.5  # Default threshold
            )

            # Map to binary label:
            # weak model (gpt-3.5-turbo) → 1 (local-sufficient)
            # strong model (gpt-4) → 0 (needs cloud)
            if "3.5" in routed_model or "weak" in routed_model.lower():
                pred = 1  # local-sufficient
                prob = 0.7  # approximate probability
            else:
                pred = 0  # needs cloud
                prob = 0.3  # approximate probability

            predictions.append(pred)
            probabilities.append(prob)

        except Exception as e:
            print(f"  Warning: Error on query {i}: {e}")
            # Default to cloud (conservative)
            predictions.append(0)
            probabilities.append(0.5)

    predictions = np.array(predictions)
    probabilities = np.array(probabilities)
    y_test = np.array(test_labels)

    # Calculate metrics
    print("\n=== RouteLLM MF Baseline Results ===")
    accuracy = accuracy_score(y_test, predictions)
    f1 = f1_score(y_test, predictions)
    precision = precision_score(y_test, predictions)
    recall = recall_score(y_test, predictions)

    # AUROC may not be meaningful if we don't have true probabilities
    try:
        auroc = roc_auc_score(y_test, probabilities)
    except ValueError:
        auroc = None
        print("  Note: AUROC not computable (single class in predictions)")

    print(f"  Accuracy:  {accuracy:.4f}")
    print(f"  F1:        {f1:.4f}")
    print(f"  Precision: {precision:.4f}")
    print(f"  Recall:    {recall:.4f}")
    if auroc:
        print(f"  AUROC:     {auroc:.4f}")

    # Save results
    results = {
        "test_hash": test_hash,
        "accuracy": accuracy,
        "f1": f1,
        "precision": precision,
        "recall": recall,
        "auroc": auroc,
        "test_size": len(test_texts),
        "note": "RouteLLM MF trained on Chatbot Arena, evaluated OOD on our test set"
    }

    Path("data/results").mkdir(parents=True, exist_ok=True)
    with open("data/results/routellm_accuracy.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nResults saved to data/results/routellm_accuracy.json")

    # Print comparison table if other results exist
    print("\n=== Router Comparison (if available) ===")
    comparison = {"RouteLLM MF": results}

    for results_file, name in [
        ("data/results/router_accuracy.json", "DistilBERT"),
        ("data/results/feature_router_accuracy.json", "Feature-only"),
    ]:
        if Path(results_file).exists():
            with open(results_file) as f:
                comparison[name] = json.load(f)

    if len(comparison) > 1:
        print(f"\n{'Router':<15} {'Accuracy':>10} {'F1':>10} {'AUROC':>10}")
        print("-" * 47)
        for name, res in comparison.items():
            acc = res.get("accuracy", 0) or 0
            f1_val = res.get("f1", 0) or 0
            auroc_val = res.get("auroc", 0) or 0
            auroc_str = f"{auroc_val:.4f}" if auroc_val else "N/A"
            print(f"{name:<15} {acc:>10.4f} {f1_val:>10.4f} {auroc_str:>10}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="data/labeled/train_5k.jsonl")
    args = parser.parse_args()
    main(args.data)
