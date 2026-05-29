"""Build allocation-detail chart payloads from billable usage records."""

import calendar
import logging
from datetime import date

from coldfront.core.allocation.models import Allocation
from coldfront_plugin_cloud.billable_usage import get_daily_billable_usage_by_date
from coldfront_plugin_cloud.usage_models import CumulativeChargesDict, to_dict

logger = logging.getLogger(__name__)


def _current_month_range() -> tuple[str, str]:
    today = date.today()
    _, last_day = calendar.monthrange(today.year, today.month)
    return (
        f"{today.year}-{today.month:02d}-01",
        f"{today.year}-{today.month:02d}-{last_day:02d}",
    )


def charges_dict_for_allocation(
    allocation: Allocation,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict:
    """Return chart JSON: ``{"YYYY-MM-DD": {"SU Type": "10.50", ...}, ...}``.

    Loads date-keyed usage through the cloud plugin public API.
    Defaults to the current calendar month when dates are omitted.
    """
    if start_date is None or end_date is None:
        start_date, end_date = _current_month_range()

    root = get_daily_billable_usage_by_date(allocation, start_date, end_date)

    if not root:
        logger.info(
            "charges_dict_for_allocation: no usage rows for allocation_id=%s %s..%s",
            allocation.pk,
            start_date,
            end_date,
        )
        return {}

    try:
        return to_dict(CumulativeChargesDict(root=root))
    except Exception:
        logger.exception(
            "charges_dict_for_allocation: validation failed for allocation_id=%s",
            allocation.pk,
        )
        return {day: to_dict(usage) for day, usage in root.items()}


def fetch_charges(allocation_id: int, start_date: str, end_date: str) -> dict:
    """Load charges for an allocation id and inclusive date range."""
    allocation = Allocation.objects.get(pk=allocation_id)
    return charges_dict_for_allocation(allocation, start_date, end_date)
