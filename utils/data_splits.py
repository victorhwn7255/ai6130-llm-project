"""
Shared data split utility (Fix 6 from prompt.md).

This module ensures both DistilBERT and feature-only routers use
identical train/val/test splits for fair comparison.
"""
import json
import hashlib
from typing import Tuple, List
from sklearn.model_selection import train_test_split


def load_and_split_data(data_path: str) -> Tuple[
    List[str], List[int],  # train
    List[str], List[int],  # val
    List[str], List[int],  # test
    str  # test_hash for verification
]:
    """
    Load labeled JSONL data and split into train/val/test sets.

    Args:
        data_path: Path to the labeled JSONL file

    Returns:
        Tuple of (train_texts, train_labels, val_texts, val_labels,
                  test_texts, test_labels, test_hash)

    The split is 70/15/15 with random_state=42 and stratified by labels.
    The test_hash is an MD5 hash of the sorted test queries for verification.
    """
    # Load data, filtering out garbage entries
    texts, labels = [], []
    seen_queries = set()
    skipped = {"error": 0, "short": 0, "no_response": 0, "duplicate": 0}
    with open(data_path) as f:
        for line in f:
            d = json.loads(line)
            if "error" in d:
                skipped["error"] += 1
                continue
            query = d["query"].strip()
            if len(query) < 10:
                skipped["short"] += 1
                continue
            if not d.get("local_response", "").strip():
                skipped["no_response"] += 1
                continue
            if query in seen_queries:
                skipped["duplicate"] += 1
                continue
            seen_queries.add(query)
            texts.append(query)
            labels.append(d["label"])

    total_skipped = sum(skipped.values())
    print(f"Data cleaning: kept {len(texts)}, skipped {total_skipped} "
          f"(error={skipped['error']}, short={skipped['short']}, "
          f"no_response={skipped['no_response']}, duplicate={skipped['duplicate']})")

    # Split: 70/15/15 with fixed random state
    train_texts, temp_texts, train_labels, temp_labels = train_test_split(
        texts, labels, test_size=0.3, random_state=42, stratify=labels
    )
    val_texts, test_texts, val_labels, test_labels = train_test_split(
        temp_texts, temp_labels, test_size=0.5, random_state=42, stratify=temp_labels
    )

    # Compute MD5 hash of sorted test queries for verification
    sorted_test_queries = sorted(test_texts)
    test_hash = hashlib.md5("\n".join(sorted_test_queries).encode()).hexdigest()

    return (
        train_texts, train_labels,
        val_texts, val_labels,
        test_texts, test_labels,
        test_hash
    )


def verify_test_hash(expected_hash: str, actual_hash: str) -> bool:
    """
    Verify that two test set hashes match.

    Args:
        expected_hash: The hash from the first training run
        actual_hash: The hash from the current training run

    Returns:
        True if hashes match, raises AssertionError otherwise
    """
    if expected_hash != actual_hash:
        raise AssertionError(
            f"Test set hash mismatch!\n"
            f"  Expected: {expected_hash}\n"
            f"  Actual:   {actual_hash}\n"
            "This indicates the test splits are different. "
            "Ensure both scripts use the same data file and this shared utility."
        )
    return True
