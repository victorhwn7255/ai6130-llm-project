"""Generate report figures: Pareto curve, domain breakdown, ROC curves."""
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use("Agg")
import numpy as np


def plot_pareto_curve(thresholds, qualities, cost_pcts, cloud_quality, local_quality,
                      operating_point_idx=None, save_path="data/results/pareto_curve.png"):
    """Fig 5: The signature Pareto curve."""
    fig, ax = plt.subplots(figsize=(10, 7))

    ax.plot(cost_pcts, qualities, "o-", color="#2563eb", linewidth=2, markersize=6, label="Router")
    ax.axhline(y=cloud_quality, color="#dc2626", linestyle="--", linewidth=1.5, label=f"Cloud-only ({cloud_quality:.1f})")
    ax.axhline(y=local_quality, color="#16a34a", linestyle="--", linewidth=1.5, label=f"Local-only ({local_quality:.1f})")

    if operating_point_idx is not None:
        ax.scatter([cost_pcts[operating_point_idx]], [qualities[operating_point_idx]],
                   s=200, color="#f59e0b", zorder=5, edgecolors="black", linewidth=2)
        ax.annotate(f"  Recommended\n  (t={thresholds[operating_point_idx]:.1f})",
                    xy=(cost_pcts[operating_point_idx], qualities[operating_point_idx]),
                    fontsize=10, fontweight="bold")

    ax.set_xlabel("Cost (% of Cloud-Only)", fontsize=13)
    ax.set_ylabel("Average Quality Score", fontsize=13)
    ax.set_title("Quality-Cost Pareto Frontier", fontsize=15, fontweight="bold")
    ax.legend(fontsize=11)
    ax.grid(True, alpha=0.3)
    ax.set_xlim(-5, 105)
    fig.tight_layout()
    fig.savefig(save_path, dpi=150)
    plt.close(fig)
    print(f"Saved: {save_path}")


def plot_domain_breakdown(domains, pgr_values, save_path="data/results/domain_pgr.png"):
    """Fig 6: Per-domain PGR grouped bar chart."""
    fig, ax = plt.subplots(figsize=(10, 6))
    colors = ["#dc2626" if v < 60 else "#f59e0b" if v < 80 else "#16a34a" for v in pgr_values]

    bars = ax.barh(domains, pgr_values, color=colors, edgecolor="white", linewidth=0.5)
    for bar, val in zip(bars, pgr_values):
        ax.text(bar.get_width() + 1, bar.get_y() + bar.get_height() / 2,
                f"{val:.0f}%", va="center", fontsize=11, fontweight="bold")

    ax.set_xlabel("PGR (%)", fontsize=13)
    ax.set_title("Performance Gap Recovered by Domain", fontsize=15, fontweight="bold")
    ax.set_xlim(0, 110)
    ax.axvline(x=70, color="gray", linestyle=":", alpha=0.5, label="70% target")
    ax.legend()
    fig.tight_layout()
    fig.savefig(save_path, dpi=150)
    plt.close(fig)
    print(f"Saved: {save_path}")
