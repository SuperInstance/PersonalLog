"""Analytics engine — patterns, word frequency, category stats."""

from __future__ import annotations

import re
from collections import Counter
from datetime import datetime, timedelta
from typing import Sequence

from .entry import Entry, Mood
from .journal import Journal

# Words to skip in frequency analysis
_STOP_WORDS = frozenset({
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "is", "am", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "shall", "can", "it", "its", "i",
    "me", "my", "we", "us", "our", "you", "your", "he", "him", "his",
    "she", "her", "they", "them", "their", "this", "that", "these", "those",
    "not", "no", "so", "if", "as", "from", "just", "than", "then", "also",
    "very", "too", "about", "up", "out", "all", "some", "what", "which",
    "who", "when", "where", "how", "why", "there", "here",
})


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z]{2,}", text.lower())


class Analytics:
    """Run analytics over a Journal."""

    def __init__(self, journal: Journal) -> None:
        self._journal = journal

    # -- word frequency -----------------------------------------------------

    def word_frequency(self, top_n: int = 20) -> list[tuple[str, int]]:
        counter: Counter[str] = Counter()
        for entry in self._journal.all():
            for word in _tokenize(entry.content):
                if word not in _STOP_WORDS:
                    counter[word] += 1
        return counter.most_common(top_n)

    # -- category stats -----------------------------------------------------

    def category_stats(self) -> dict[str, dict]:
        """Count and average mood per category."""
        buckets: dict[str, list[Entry]] = {}
        for e in self._journal.all():
            cat = e.category or "uncategorized"
            buckets.setdefault(cat, []).append(e)

        result: dict[str, dict] = {}
        for cat, entries in sorted(buckets.items()):
            moods = [e.mood.value for e in entries if e.mood is not None]
            result[cat] = {
                "count": len(entries),
                "avg_mood": round(sum(moods) / len(moods), 2) if moods else None,
            }
        return result

    # -- tag stats ----------------------------------------------------------

    def tag_stats(self) -> dict[str, int]:
        counter: Counter[str] = Counter()
        for e in self._journal.all():
            for t in e.tags:
                counter[t.lower()] += 1
        return dict(counter.most_common())

    # -- patterns -----------------------------------------------------------

    def mood_by_weekday(self) -> dict[str, float | None]:
        """Average mood per day of week."""
        buckets: dict[str, list[int]] = {}
        for e in self._journal.all():
            if e.mood is None:
                continue
            day = e.timestamp.strftime("%A")
            buckets.setdefault(day, []).append(e.mood.value)
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        return {
            d: round(sum(buckets.get(d, [])) / len(buckets[d]), 2) if d in buckets else None
            for d in days
        }

    def best_day(self) -> str | None:
        stats = self.mood_by_weekday()
        best = max(
            ((d, v) for d, v in stats.items() if v is not None),
            key=lambda x: x[1],
            default=None,
        )
        return best[0] if best else None

    def entries_per_week(self, weeks: int = 4) -> list[tuple[str, int]]:
        now = datetime.now()
        result = []
        for i in range(weeks - 1, -1, -1):
            week_start = now - timedelta(weeks=i + 1) + timedelta(days=1)
            week_end = now - timedelta(weeks=i)
            count = len(self._journal.date_range(week_start, week_end))
            result.append((week_start.strftime("%Y-W%W"), count))
        return result
