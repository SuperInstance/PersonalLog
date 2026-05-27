"""Journal entry data model."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Sequence


class Mood(Enum):
    """Standard mood levels."""

    TERRIBLE = 1
    BAD = 2
    MEH = 3
    OKAY = 4
    GOOD = 5
    GREAT = 6
    AMAZING = 7

    @classmethod
    def from_str(cls, value: str) -> "Mood":
        """Create a Mood from a case-insensitive string."""
        return cls[value.upper()]

    def __str__(self) -> str:
        return self.name.lower()


@dataclass
class Entry:
    """A single journal entry."""

    content: str
    mood: Mood | None = None
    tags: list[str] = field(default_factory=list)
    category: str | None = None
    timestamp: datetime = field(default_factory=datetime.now)
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])

    # -- convenience constructors -------------------------------------------

    @classmethod
    def create(
        cls,
        content: str,
        *,
        mood: Mood | str | None = None,
        tags: Sequence[str] = (),
        category: str | None = None,
        timestamp: datetime | None = None,
    ) -> "Entry":
        """Factory that accepts flexible mood input."""
        resolved_mood: Mood | None = None
        if isinstance(mood, str):
            resolved_mood = Mood.from_str(mood)
        elif isinstance(mood, Mood):
            resolved_mood = mood
        return cls(
            content=content,
            mood=resolved_mood,
            tags=list(tags),
            category=category,
            timestamp=timestamp or datetime.now(),
        )

    # -- querying helpers ---------------------------------------------------

    def matches_tag(self, tag: str) -> bool:
        return tag.lower() in (t.lower() for t in self.tags)

    def matches_category(self, category: str) -> bool:
        return self.category is not None and self.category.lower() == category.lower()

    def contains_word(self, word: str) -> bool:
        return word.lower() in self.content.lower()

    # -- serialisation ------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "content": self.content,
            "mood": self.mood.value if self.mood else None,
            "mood_name": str(self.mood) if self.mood else None,
            "tags": self.tags,
            "category": self.category,
            "timestamp": self.timestamp.isoformat(),
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Entry":
        mood = Mood(data["mood"]) if data.get("mood") is not None else None
        return cls(
            content=data["content"],
            mood=mood,
            tags=data.get("tags", []),
            category=data.get("category"),
            timestamp=datetime.fromisoformat(data["timestamp"]),
            id=data.get("id", uuid.uuid4().hex[:12]),
        )
