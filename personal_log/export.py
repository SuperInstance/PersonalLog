"""Export journal entries to JSON, CSV, and Markdown."""

from __future__ import annotations

import csv
import io
import json
from typing import Sequence

from .entry import Entry
from .journal import Journal


class Exporter:
    """Export entries from a Journal in various formats."""

    def __init__(self, journal: Journal) -> None:
        self._journal = journal

    # -- JSON ---------------------------------------------------------------

    def to_json(self, entries: Sequence[Entry] | None = None) -> str:
        items = entries or self._journal.all()
        return json.dumps(
            {"entries": [e.to_dict() for e in items], "count": len(items)},
            indent=2,
            ensure_ascii=False,
        )

    # -- CSV ----------------------------------------------------------------

    def to_csv(self, entries: Sequence[Entry] | None = None) -> str:
        items = entries or self._journal.all()
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["id", "timestamp", "mood", "category", "tags", "content"])
        for e in items:
            writer.writerow([
                e.id,
                e.timestamp.isoformat(),
                str(e.mood) if e.mood else "",
                e.category or "",
                ";".join(e.tags),
                e.content,
            ])
        return buf.getvalue()

    # -- Markdown -----------------------------------------------------------

    def to_markdown(self, entries: Sequence[Entry] | None = None) -> str:
        items = entries or self._journal.all()
        lines: list[str] = ["# PersonalLog Export", ""]
        for e in items:
            mood_str = f" — *{e.mood.name.lower()}*" if e.mood else ""
            lines.append(f"## {e.timestamp.strftime('%Y-%m-%d %H:%M')}{mood_str}")
            if e.category:
                lines.append(f"**Category:** {e.category}")
            if e.tags:
                lines.append(f"**Tags:** {', '.join(e.tags)}")
            lines.append("")
            lines.append(e.content)
            lines.append("")
        return "\n".join(lines)
