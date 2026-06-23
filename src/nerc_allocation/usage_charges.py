"""Build allocation-detail usage table payloads from billable usage records."""

from __future__ import annotations

import calendar
import logging
from dataclasses import dataclass
from datetime import date, datetime

from coldfront.core.allocation.models import Allocation
from coldfront_plugin_cloud.billable_usage import get_daily_billable_usage_by_date
from coldfront_plugin_cloud.models.usage_models import CumulativeChargesDict, to_dict

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class UsageTableRow:
    label: str
    cells: list[float | None]
    total: float | None


@dataclass(frozen=True)
class UsageTableContext:
    su_types: list[str]
    cumulative_rows: list[UsageTableRow]
    daily_rows: list[UsageTableRow]

    @property
    def has_data(self) -> bool:
        return bool(self.su_types)


EMPTY_USAGE_TABLE = UsageTableContext([], [], [])


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
    """Return date-keyed charges: ``{"YYYY-MM-DD": {"SU Type": "10.50", ...}, ...}``."""
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

    return to_dict(CumulativeChargesDict(root=root))


def _day_label(year: int, month: int, day: int) -> str:
    return f"{date(year, month, day).strftime('%b')} {day}"


def _calculate_daily(cumulative: list[float | None]) -> list[float | None]:
    daily: list[float | None] = []
    for i, value in enumerate(cumulative):
        if value is None:
            daily.append(None)
        elif i == 0:
            daily.append(value)
        elif cumulative[i - 1] is None:
            daily.append(None)
        else:
            daily.append(value - cumulative[i - 1])
    return daily


def _row_total(cells: list[float | None]) -> float | None:
    if any(value is None for value in cells):
        return None
    return sum(cells)


def usage_table_from_charges(charges: dict) -> UsageTableContext:
    """Pivot date-keyed cumulative charges into cumulative and daily table rows."""
    if not charges:
        return EMPTY_USAGE_TABLE

    sorted_dates = sorted(charges.keys())
    first_date = datetime.strptime(sorted_dates[0], "%Y-%m-%d").date()
    year, month = first_date.year, first_date.month
    days_in_month = calendar.monthrange(year, month)[1]

    su_types = sorted(
        {
            su_type
            for day_data in charges.values()
            if isinstance(day_data, dict)
            for su_type in day_data
        }
    )
    if not su_types:
        return EMPTY_USAGE_TABLE

    cumulative_by_su: dict[str, list[float | None]] = {
        su_type: [None] * days_in_month for su_type in su_types
    }
    for date_str in sorted_dates:
        day_data = charges.get(date_str)
        if not isinstance(day_data, dict):
            continue
        day = int(date_str.split("-")[2])
        if day < 1 or day > days_in_month:
            continue
        for su_type in su_types:
            if su_type in day_data:
                cumulative_by_su[su_type][day - 1] = float(day_data[su_type])

    labels = [_day_label(year, month, day) for day in range(1, days_in_month + 1)]

    cumulative_rows: list[UsageTableRow] = []
    daily_rows: list[UsageTableRow] = []
    for day_index, label in enumerate(labels):
        cumulative_cells = [cumulative_by_su[su_type][day_index] for su_type in su_types]
        daily_cells = [
            _calculate_daily(cumulative_by_su[su_type])[day_index] for su_type in su_types
        ]
        cumulative_rows.append(
            UsageTableRow(label, cumulative_cells, _row_total(cumulative_cells))
        )
        daily_rows.append(UsageTableRow(label, daily_cells, _row_total(daily_cells)))

    return UsageTableContext(su_types, cumulative_rows, daily_rows)


def usage_table_for_allocation(
    allocation: Allocation,
    start_date: str | None = None,
    end_date: str | None = None,
) -> UsageTableContext:
    return usage_table_from_charges(
        charges_dict_for_allocation(allocation, start_date, end_date)
    )
