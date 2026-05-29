import os
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "local_settings")

import django

django.setup()

from nerc_allocation.usage_charges import charges_dict_for_allocation, fetch_charges


class UsageChargesTests(unittest.TestCase):
    def test_charges_dict_uses_get_daily_billable_usage_by_date(self):
        from coldfront.core.allocation.models import Allocation
        from coldfront_plugin_cloud.usage_models import UsageInfo

        allocation = Allocation(pk=97)
        usage_by_date = {
            "2025-11-01": UsageInfo({"OpenStack CPU SU": "10"}),
            "2025-11-02": UsageInfo({"OpenStack CPU SU": "22.5"}),
        }

        with patch(
            "nerc_allocation.usage_charges.get_daily_billable_usage_by_date",
            return_value=usage_by_date,
        ) as get_usage_by_date:
            result = charges_dict_for_allocation(
                allocation, "2025-11-01", "2025-11-30"
            )

        get_usage_by_date.assert_called_once_with(
            allocation, "2025-11-01", "2025-11-30"
        )
        self.assertEqual(
            result,
            {
                "2025-11-01": {"OpenStack CPU SU": "10"},
                "2025-11-02": {"OpenStack CPU SU": "22.5"},
            },
        )

    def test_fetch_charges_loads_allocation(self):
        allocation = MagicMock(pk=42)
        with (
            patch(
                "nerc_allocation.usage_charges.Allocation.objects.get",
                return_value=allocation,
            ) as get_alloc,
            patch(
                "nerc_allocation.usage_charges.charges_dict_for_allocation",
                return_value={"2025-11-01": {"CPU": "10"}},
            ) as charges_dict,
        ):
            self.assertEqual(
                fetch_charges(42, "2025-11-01", "2025-11-30"),
                {"2025-11-01": {"CPU": "10"}},
            )
        get_alloc.assert_called_once_with(pk=42)
        charges_dict.assert_called_once_with(
            allocation, "2025-11-01", "2025-11-30"
        )
