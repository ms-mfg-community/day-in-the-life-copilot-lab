#!/usr/bin/env python3
"""Generate the Lab 12 offline-simulator Parquet fixture.

Phase C.1 / Finding 2.2.

Writes ``labs/fixtures/lab12/sales.parquet`` with the exact 5-row DataFrame
documented in ``labs/lab12.md`` (Part A, "Parquet fixture" snippet). The
fixture is committed to the repo so learners on the offline path never hit
a file-not-found on ``pd.read_parquet('labs/fixtures/lab12/sales.parquet')``.

Dependencies (install only when regenerating — the fixture itself is
committed so normal learner flow does not need them):

    pip install pyarrow pandas

Determinism: the DataFrame contents are hard-coded. Parquet's footer embeds
a "created_by" string and uncompressed timestamps, so byte-for-byte
reproducibility is not guaranteed across pyarrow versions. Tests verify the
fixture *shape* (magic bytes + column names) rather than a content hash so
this is fine.

Usage::

    python scripts/generate-lab12-fixture.py
    # → writes labs/fixtures/lab12/sales.parquet (≈ 3–5 KiB)
"""

from __future__ import annotations

import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
FIXTURE_PATH = REPO_ROOT / "labs" / "fixtures" / "lab12" / "sales.parquet"


def _build_dataframe():
    """Return the canonical Lab 12 sales DataFrame.

    Kept in its own function so tests (or a future dry-run) can import and
    inspect it without writing to disk.
    """
    import pandas as pd  # Local import — pyarrow/pandas only needed when regenerating.

    return pd.DataFrame(
        {
            "order_id": [1001, 1002, 1003, 1004, 1005],
            "region": ["NA", "EU", "NA", "APAC", "EU"],
            "amount_usd": [129.0, 84.5, 220.0, 47.25, 301.10],
            "ts": pd.to_datetime(
                [
                    "2026-01-04",
                    "2026-01-05",
                    "2026-02-12",
                    "2026-02-28",
                    "2026-03-15",
                ]
            ),
        }
    )


def main() -> int:
    try:
        import pandas  # noqa: F401
        import pyarrow  # noqa: F401
    except ImportError as exc:
        sys.stderr.write(
            "ERROR: regenerating the Lab 12 fixture requires pandas + pyarrow.\n"
            f"       Missing module: {exc.name}\n"
            "       Install with:   pip install pandas pyarrow\n"
            "       (The committed fixture already satisfies normal learner flow.)\n"
        )
        return 2

    df = _build_dataframe()
    FIXTURE_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(FIXTURE_PATH, index=False)
    size = FIXTURE_PATH.stat().st_size
    sys.stdout.write(f"wrote {FIXTURE_PATH.relative_to(REPO_ROOT)} ({size} bytes)\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
