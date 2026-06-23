import sys
import unittest
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(SRC))

from nerc_allocation.usage_charges import (  # noqa: E402
    EMPTY_USAGE_TABLE,
    usage_table_from_charges,
)


class UsageTableFromChargesTests(unittest.TestCase):
    def test_empty_input_returns_empty_context(self):
        self.assertEqual(usage_table_from_charges({}), EMPTY_USAGE_TABLE)
        self.assertFalse(usage_table_from_charges({}).has_data)

    def test_sorts_su_types_and_aligns_days_to_month_grid(self):
        raw = {
            "2026-05-03": {"GPU SU": "8.40", "CPU SU": "3.20"},
            "2026-05-01": {"GPU SU": "2.10", "CPU SU": "1.00"},
            "2026-05-02": {"GPU SU": "5.00", "CPU SU": "2.25"},
        }
        table = usage_table_from_charges(raw)

        self.assertEqual(table.su_types, ["CPU SU", "GPU SU"])
        self.assertEqual(len(table.cumulative_rows), 31)

        self.assertEqual(table.cumulative_rows[0].cells, [1.0, 2.1])
        self.assertEqual(table.cumulative_rows[1].cells, [2.25, 5.0])
        self.assertEqual(table.cumulative_rows[2].cells, [3.2, 8.4])
        self.assertEqual(table.cumulative_rows[3].cells, [None, None])
        self.assertEqual(table.cumulative_rows[0].label, "May 1")

    def test_daily_rows_derive_increments_and_preserve_gaps(self):
        raw = {
            "2026-05-01": {"CPU": "1.50"},
            "2026-05-02": {"CPU": "2.50"},
            "2026-05-04": {"CPU": "7.00"},
            "2026-05-05": {"CPU": "10.00"},
        }
        table = usage_table_from_charges(raw)
        daily = [row.cells[0] for row in table.daily_rows[:5]]

        self.assertEqual(daily, [1.5, 1.0, None, None, 3.0])

    def test_row_total_is_none_when_any_cell_missing(self):
        raw = {
            "2026-05-01": {"CPU SU": "10.00", "GPU SU": "2.00"},
            "2026-05-02": {"CPU SU": "14.50"},
        }
        table = usage_table_from_charges(raw)

        self.assertEqual(table.cumulative_rows[0].total, 12.0)
        self.assertIsNone(table.cumulative_rows[1].total)

    def test_usage_table_from_charges_payload(self):
        payload = {
            "2026-05-01": {"CPU": "10.00"},
            "2026-05-02": {"CPU": "14.50"},
        }
        table = usage_table_from_charges(payload)

        self.assertEqual(table.su_types, ["CPU"])
        self.assertEqual(table.cumulative_rows[0].cells, [10.0])
        self.assertEqual(table.cumulative_rows[1].cells, [14.5])
        self.assertEqual(table.cumulative_rows[2].cells, [None])


if __name__ == "__main__":
    unittest.main()
