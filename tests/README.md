# Allocation Detail Tests

Tests for the allocation detail costs table (server-rendered tables + client toggle).

## Run tests

From the repo root:

```bash
python -m unittest tests/test_usage_charges.py
node --test tests/allocation_detail_js.test.mjs tests/allocation_detail_template.test.mjs
```

## What each suite covers

- `test_usage_charges.py` — Python pivoting of date-keyed charges into cumulative/daily rows
- `allocation_detail_template.test.mjs` — template contract (`usage_table`, table markup, toggle IDs)
- `allocation_detail_js.test.mjs` — cumulative/daily visibility toggle behavior
