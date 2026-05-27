"""Mood tracking and trend analysis."""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta
from typing import Sequence

from .entry import Entry, Mood
from .journal import Journal


class MoodTracker:
    """Analyse mood history from a Journal."""

    def __init__(self, journal: Journal) -> None:
        self._journal = journal

    # -- history ------------------------------------------------------------

    def history(self) -> list[tuple[datetime, Mood]]:
        return [
            (e.timestamp, e.mood)
            for e in self._journal.all()
            if e.mood is not None
        ]

    # -- statistics ---------------------------------------------------------

    def average(self) -> float | None:
        entries = [e for e in self._journal.all() if e.mood is not None]
        if not entries:
            return None
        return sum(e.mood.value for e in entries) / len(entries)

    def distribution(self) -> dict[str, int]:
        counter: Counter[Mood] = Counter()
        for e in self._journal.all():
            if e.mood is not None:
                counter[e.mood] += 1
        return {mood.name.lower(): count for mood, count in counter.items()}

    def mode(self) -> Mood | None:
        counter: Counter[Mood] = Counter()
        for e in self._journal.all():
            if e.mood is not None:
                counter[e.mood] += 1
        return counter.most_common(1)[0][0] if counter else None

    def streak(self, min_mood: Mood = Mood.GOOD) -> int:
        """Longest consecutive-day streak at or above *min_mood*."""
        entries = sorted(
            [e for e in self._journal.all() if e.mood is not None],
            key=lambda e: e.timestamp.date(),
        )
        if not entries:
            return 0

        best = current = 0
        prev_date = None
        for e in entries:
            if e.mood.value >= min_mood.value:
                if prev_date and (e.timestamp.date() - prev_date).days == 1:
                    current += 1
                else:
                    current = 1
                best = max(best, current)
            else:
                current = 0
            prev_date = e.timestamp.date()
        return best

    # -- trends -------------------------------------------------------------

    def trend(self, days: int = 7) -> list[tuple[str, float]]:
        """Daily average mood over the last *days* days."""
        now = datetime.now()
        result: list[tuple[str, float]] = []
        for i in range(days - 1, -1, -1):
            day = (now - timedelta(days=i)).date()
            day_entries = [
                e for e in self._journal.all()
                if e.mood is not None and e.timestamp.date() == day
            ]
            avg = (
                sum(e.mood.value for e in day_entries) / len(day_entries)
                if day_entries
                else 0.0
            )
            result.append((day.isoformat(), round(avg, 2)))
        return result

    def trend_direction(self, days: int = 7) -> str:
        """Return 'improving', 'declining', or 'stable'."""
        t = self.trend(days)
        first_half = sum(v for _, v in t[: len(t) // 2]) / max(len(t) // 2, 1)
        second_half = sum(v for _, v in t[len(t) // 2 :]) / max(
            len(t) - len(t) // 2, 1
        )
        diff = second_half - first_half
        if diff > 0.3:
            return "improving"
        if diff < -0.3:
            return "declining"
        return "stable"
