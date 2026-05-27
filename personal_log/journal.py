"""Journal — CRUD, search, and date-range queries over entries."""

from __future__ import annotations

from datetime import datetime
from typing import Sequence

from .entry import Entry, Mood


class Journal:
    """In-memory collection of journal entries."""

    def __init__(self) -> None:
        self._entries: dict[str, Entry] = {}

    # -- CRUD ---------------------------------------------------------------

    def add(self, entry: Entry) -> Entry:
        self._entries[entry.id] = entry
        return entry

    def get(self, entry_id: str) -> Entry | None:
        return self._entries.get(entry_id)

    def update(self, entry_id: str, **kwargs) -> Entry | None:
        entry = self._entries.get(entry_id)
        if entry is None:
            return None
        for key, value in kwargs.items():
            if hasattr(entry, key):
                setattr(entry, key, value)
        return entry

    def delete(self, entry_id: str) -> bool:
        return self._entries.pop(entry_id, None) is not None

    # -- queries ------------------------------------------------------------

    def all(self) -> list[Entry]:
        return sorted(self._entries.values(), key=lambda e: e.timestamp)

    def count(self) -> int:
        return len(self._entries)

    def search(self, query: str) -> list[Entry]:
        """Full-text search over entry content."""
        q = query.lower()
        return [e for e in self.all() if q in e.content.lower()]

    def by_tag(self, tag: str) -> list[Entry]:
        return [e for e in self.all() if e.matches_tag(tag)]

    def by_category(self, category: str) -> list[Entry]:
        return [e for e in self.all() if e.matches_category(category)]

    def by_mood(self, mood: Mood) -> list[Entry]:
        return [e for e in self.all() if e.mood == mood]

    def date_range(
        self, start: datetime, end: datetime | None = None
    ) -> list[Entry]:
        """Return entries where start <= timestamp < end."""
        results = [e for e in self.all() if e.timestamp >= start]
        if end is not None:
            results = [e for e in results if e.timestamp < end]
        return results

    def tags(self) -> list[str]:
        """All unique tags across entries."""
        seen: set[str] = set()
        for e in self._entries.values():
            for t in e.tags:
                seen.add(t.lower())
        return sorted(seen)

    def categories(self) -> list[str]:
        seen: set[str] = set()
        for e in self._entries.values():
            if e.category:
                seen.add(e.category)
        return sorted(seen)
