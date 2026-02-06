"""
E3: Train DistilBERT binary router on labeled data.

Fix 6 Applied:
- Uses shared split function from utils/data_splits.py
- Prints and saves test set hash for verification

Usage:
  python scripts/train_router.py --data data/labeled/train_5k.jsonl \
                                  --output data/models/distilbert_router
"""
import json
import argparse
import numpy as np
from pathlib import Path
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score

import torch
from torch.utils.data import Dataset
from transformers import (
    DistilBertTokenizer,
    DistilBertForSequenceClassification,
    Trainer,
    TrainingArguments,
    EarlyStoppingCallback,
)

# Add parent to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.data_splits import load_and_split_data


class RouterDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_length=256):
        self.encodings = tokenizer(texts, truncation=True, padding=True,
                                   max_length=max_length, return_tensors="pt")
        self.labels = torch.tensor(labels, dtype=torch.long)

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        item = {k: v[idx] for k, v in self.encodings.items()}
        item["labels"] = self.labels[idx]
        return item


def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    probs = torch.softmax(torch.tensor(logits), dim=-1)[:, 1].numpy()
    return {
        "accuracy": accuracy_score(labels, preds),
        "f1": f1_score(labels, preds),
        "precision": precision_score(labels, preds),
        "recall": recall_score(labels, preds),
        "auroc": roc_auc_score(labels, probs),
    }


def main(data_path: str, output_path: str):
    # Load data using shared split function (Fix 6)
    print(f"Loading data from {data_path}")
    (train_texts, train_labels,
     val_texts, val_labels,
     test_texts, test_labels,
     test_hash) = load_and_split_data(data_path)

    print(f"Loaded {len(train_texts) + len(val_texts) + len(test_texts)} examples")
    print(f"  Train: {len(train_texts)} ({sum(train_labels)} local, {len(train_labels)-sum(train_labels)} cloud)")
    print(f"  Val:   {len(val_texts)}")
    print(f"  Test:  {len(test_texts)}")
    print(f"\n*** Test set hash (Fix 6): {test_hash} ***")

    # Tokenize
    tokenizer = DistilBertTokenizer.from_pretrained("distilbert-base-uncased")
    train_ds = RouterDataset(train_texts, train_labels, tokenizer)
    val_ds = RouterDataset(val_texts, val_labels, tokenizer)
    test_ds = RouterDataset(test_texts, test_labels, tokenizer)

    # Model
    model = DistilBertForSequenceClassification.from_pretrained(
        "distilbert-base-uncased", num_labels=2
    )

    # Training
    training_args = TrainingArguments(
        output_dir="data/models/distilbert_checkpoints",
        num_train_epochs=5,
        per_device_train_batch_size=32,
        per_device_eval_batch_size=64,
        learning_rate=2e-5,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        logging_steps=50,
        seed=42,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=2)],
    )

    trainer.train()

    # Save best model
    Path(output_path).mkdir(parents=True, exist_ok=True)
    model.save_pretrained(output_path)
    tokenizer.save_pretrained(output_path)

    # Final test set evaluation
    test_results = trainer.evaluate(test_ds)
    print("\n=== Test Set Results ===")
    for k, v in test_results.items():
        if k.startswith("eval_"):
            print(f"  {k.replace('eval_', '')}: {v:.4f}")

    # Save test results with hash (Fix 6)
    results = {
        "test_hash": test_hash,  # For verification against feature-only router
        "accuracy": test_results.get("eval_accuracy"),
        "f1": test_results.get("eval_f1"),
        "precision": test_results.get("eval_precision"),
        "recall": test_results.get("eval_recall"),
        "auroc": test_results.get("eval_auroc"),
        "train_size": len(train_texts),
        "val_size": len(val_texts),
        "test_size": len(test_texts),
    }

    Path("data/results").mkdir(parents=True, exist_ok=True)
    with open("data/results/router_accuracy.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nResults saved to data/results/router_accuracy.json")
    print(f"Model saved to {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="data/labeled/train_5k.jsonl")
    parser.add_argument("--output", default="data/models/distilbert_router")
    args = parser.parse_args()
    main(args.data, args.output)
