"""Bootstrap confidence intervals for small-sample evaluation."""
import numpy as np


def bootstrap_ci(data: list[float], n_bootstrap: int = 1000, ci: float = 0.95) -> dict:
    """Compute bootstrap confidence interval for the mean."""
    data = np.array(data)
    means = []
    for _ in range(n_bootstrap):
        sample = np.random.choice(data, size=len(data), replace=True)
        means.append(sample.mean())

    means = sorted(means)
    lower = (1 - ci) / 2
    upper = 1 - lower
    return {
        "mean": float(data.mean()),
        "ci_lower": float(np.percentile(means, lower * 100)),
        "ci_upper": float(np.percentile(means, upper * 100)),
        "std": float(np.std(means)),
    }


def bootstrap_pgr(router_scores, local_scores, cloud_scores, n_bootstrap=1000):
    """Bootstrap CI specifically for PGR metric."""
    n = len(router_scores)
    pgrs = []
    for _ in range(n_bootstrap):
        idx = np.random.choice(n, size=n, replace=True)
        r = np.array(router_scores)[idx].mean()
        l = np.array(local_scores)[idx].mean()
        c = np.array(cloud_scores)[idx].mean()
        if c != l:
            pgrs.append((r - l) / (c - l))
    pgrs = sorted(pgrs)
    return {
        "mean": float(np.mean(pgrs)),
        "ci_lower": float(np.percentile(pgrs, 2.5)),
        "ci_upper": float(np.percentile(pgrs, 97.5)),
    }
