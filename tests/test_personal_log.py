"""Tests for personal_log package."""

import json
import csv
import io
from datetime import datetime, timedelta

from personal_log.entry import Entry, Mood
from personal_log.journal import Journal
from personal_log.mood import MoodTracker
from personal_log.analytics import Analytics
from personal_log.export import Exporter


# ---------------------------------------------------------------------------
# Entry
# ---------------------------------------------------------------------------

class TestEntry:
    def test_create_basic(self):
        e = Entry.create("Hello world")
        assert e.content == "Hello world"
        assert e.mood is None
        assert e.tags == []
        assert e.category is None
        assert e.id

    def test_create_with_mood_enum(self):
        e = Entry.create("Great day!", mood=Mood.GREAT)
        assert e.mood == Mood.GREAT

    def test_create_with_mood_string(self):
        e = Entry.create("Okay", mood="okay")
        assert e.mood == Mood.OKAY

    def test_create_with_all_fields(self):
        ts = datetime(2024, 1, 1, 12, 0)
        e = Entry.create(
            "Content", mood="good", tags=["test", "demo"], category="work", timestamp=ts
        )
        assert e.mood == Mood.GOOD
        assert e.tags == ["test", "demo"]
        assert e.category == "work"
        assert e.timestamp == ts

    def test_mood_from_str(self):
        assert Mood.from_str("amazing") == Mood.AMAZING
        assert Mood.from_str("TERRIBLE") == Mood.TERRIBLE

    def test_mood_str(self):
        assert str(Mood.GOOD) == "good"

    def test_matches_tag(self):
        e = Entry.create("x", tags=["Python", "AI"])
        assert e.matches_tag("python")
        assert e.matches_tag("AI")
        assert not e.matches_tag("rust")

    def test_matches_category(self):
        e = Entry.create("x", category="Work")
        assert e.matches_category("work")
        assert not e.matches_category("personal")

    def test_contains_word(self):
        e = Entry.create("I love Python programming")
        assert e.contains_word("python")
        assert not e.contains_word("java")

    def test_to_dict_roundtrip(self):
        ts = datetime(2024, 6, 15, 10, 30)
        original = Entry.create(
            "Test", mood="great", tags=["a"], category="cat", timestamp=ts
        )
        d = original.to_dict()
        assert d["mood"] == Mood.GREAT.value
        restored = Entry.from_dict(d)
        assert restored.content == original.content
        assert restored.mood == original.mood
        assert restored.tags == original.tags
        assert restored.category == original.category
        assert restored.timestamp == original.timestamp
        assert restored.id == original.id

    def test_to_dict_no_mood(self):
        e = Entry.create("No mood")
        d = e.to_dict()
        assert d["mood"] is None
        restored = Entry.from_dict(d)
        assert restored.mood is None


# ---------------------------------------------------------------------------
# Journal
# ---------------------------------------------------------------------------

class TestJournal:
    def _make_entries(self, journal, n=3):
        entries = []
        for i in range(n):
            e = Entry.create(
                f"Entry {i}",
                mood=Mood(i + 3),  # MEH, OKAY, GOOD
                tags=[f"tag{i}"],
                category="test" if i % 2 == 0 else "other",
                timestamp=datetime(2024, 1, i + 1),
            )
            journal.add(e)
            entries.append(e)
        return entries

    def test_add_and_get(self):
        j = Journal()
        e = Entry.create("Hello")
        j.add(e)
        assert j.get(e.id) is e
        assert j.count() == 1

    def test_get_missing(self):
        assert Journal().get("nope") is None

    def test_update(self):
        j = Journal()
        e = Entry.create("Old")
        j.add(e)
        updated = j.update(e.id, content="New", category="updated")
        assert updated.content == "New"
        assert updated.category == "updated"

    def test_update_missing(self):
        assert Journal().update("nope", content="x") is None

    def test_delete(self):
        j = Journal()
        e = Entry.create("Bye")
        j.add(e)
        assert j.delete(e.id) is True
        assert j.get(e.id) is None
        assert j.delete(e.id) is False

    def test_all_sorted(self):
        j = Journal()
        e2 = Entry.create("Second", timestamp=datetime(2024, 1, 2))
        e1 = Entry.create("First", timestamp=datetime(2024, 1, 1))
        j.add(e2)
        j.add(e1)
        assert j.all() == [e1, e2]

    def test_search(self):
        j = Journal()
        j.add(Entry.create("Python is great"))
        j.add(Entry.create("Rust is fast"))
        results = j.search("python")
        assert len(results) == 1
        assert "Python" in results[0].content

    def test_by_tag(self):
        j = Journal()
        j.add(Entry.create("A", tags=["work"]))
        j.add(Entry.create("B", tags=["personal"]))
        j.add(Entry.create("C", tags=["work", "urgent"]))
        assert len(j.by_tag("work")) == 2

    def test_by_category(self):
        j = Journal()
        j.add(Entry.create("A", category="work"))
        j.add(Entry.create("B", category="personal"))
        assert len(j.by_category("work")) == 1

    def test_by_mood(self):
        j = Journal()
        j.add(Entry.create("A", mood=Mood.GOOD))
        j.add(Entry.create("B", mood=Mood.BAD))
        assert len(j.by_mood(Mood.GOOD)) == 1

    def test_date_range(self):
        j = Journal()
        j.add(Entry.create("A", timestamp=datetime(2024, 1, 5)))
        j.add(Entry.create("B", timestamp=datetime(2024, 1, 10)))
        j.add(Entry.create("C", timestamp=datetime(2024, 1, 15)))
        results = j.date_range(datetime(2024, 1, 6), datetime(2024, 1, 13))
        assert len(results) == 1
        assert results[0].content == "B"

    def test_tags_and_categories(self):
        j = Journal()
        self._make_entries(j)
        assert len(j.tags()) >= 3
        assert "test" in j.categories()
        assert "other" in j.categories()


# ---------------------------------------------------------------------------
# MoodTracker
# ---------------------------------------------------------------------------

class TestMoodTracker:
    def _filled_journal(self):
        j = Journal()
        for i, (mood_val, day) in enumerate([
            (5, 1), (6, 2), (5, 3), (4, 4), (3, 5), (6, 6), (7, 7),
        ]):
            j.add(Entry.create(
                f"Day {day}", mood=Mood(mood_val),
                timestamp=datetime.now() - timedelta(days=7 - day),
            ))
        return j

    def test_history(self):
        j = self._filled_journal()
        mt = MoodTracker(j)
        assert len(mt.history()) == 7

    def test_average(self):
        j = self._filled_journal()
        mt = MoodTracker(j)
        avg = mt.average()
        assert avg is not None
        assert 1 <= avg <= 7

    def test_average_empty(self):
        assert MoodTracker(Journal()).average() is None

    def test_distribution(self):
        j = self._filled_journal()
        mt = MoodTracker(j)
        dist = mt.distribution()
        assert "good" in dist
        assert dist["good"] == 2

    def test_mode(self):
        j = self._filled_journal()
        mt = MoodTracker(j)
        assert mt.mode() == Mood.GOOD

    def test_streak(self):
        j = self._filled_journal()
        mt = MoodTracker(j)
        streak = mt.streak(Mood.GOOD)
        assert streak >= 1

    def test_trend(self):
        j = self._filled_journal()
        mt = MoodTracker(j)
        t = mt.trend(7)
        assert len(t) == 7
        assert all(isinstance(v, float) for _, v in t)

    def test_trend_direction(self):
        j = self._filled_journal()
        mt = MoodTracker(j)
        direction = mt.trend_direction(7)
        assert direction in ("improving", "declining", "stable")


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

class TestAnalytics:
    def _journal_with_data(self):
        j = Journal()
        entries = [
            ("Wrote Python code today", Mood.GOOD, ["coding", "python"], "work"),
            ("Had a great workout", Mood.GREAT, ["fitness", "health"], "personal"),
            ("Debugged tricky issue", Mood.MEH, ["coding", "debugging"], "work"),
            ("Read a good book", Mood.GOOD, ["reading"], "personal"),
            ("Team meeting was productive", Mood.OKAY, ["meetings"], "work"),
        ]
        for i, (content, mood, tags, cat) in enumerate(entries):
            j.add(Entry.create(
                content, mood=mood, tags=tags, category=cat,
                timestamp=datetime(2024, 1, i + 1, 10, 0),
            ))
        return j

    def test_word_frequency(self):
        a = Analytics(self._journal_with_data())
        freq = a.word_frequency(5)
        assert len(freq) > 0
        # "good" appears twice in content
        words = [w for w, _ in freq]
        assert any(w in ("python", "good", "coding") for w in words)

    def test_category_stats(self):
        a = Analytics(self._journal_with_data())
        stats = a.category_stats()
        assert "work" in stats
        assert stats["work"]["count"] == 3
        assert stats["work"]["avg_mood"] is not None

    def test_tag_stats(self):
        a = Analytics(self._journal_with_data())
        tags = a.tag_stats()
        assert tags["coding"] == 2

    def test_mood_by_weekday(self):
        a = Analytics(self._journal_with_data())
        stats = a.mood_by_weekday()
        assert len(stats) == 7
        # Jan 1, 2024 is Monday, Jan 2 is Tuesday, etc.
        assert stats["Monday"] == Mood.GOOD.value

    def test_best_day(self):
        a = Analytics(self._journal_with_data())
        best = a.best_day()
        assert best in ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")

    def test_entries_per_week(self):
        a = Analytics(self._journal_with_data())
        epw = a.entries_per_week(4)
        assert len(epw) == 4


# ---------------------------------------------------------------------------
# Exporter
# ---------------------------------------------------------------------------

class TestExporter:
    def _journal(self):
        j = Journal()
        j.add(Entry.create(
            "Hello world", mood=Mood.GOOD, tags=["test"], category="demo",
            timestamp=datetime(2024, 1, 1, 12, 0),
        ))
        j.add(Entry.create(
            "Second entry", mood=Mood.BAD,
            timestamp=datetime(2024, 1, 2, 14, 30),
        ))
        return j

    def test_to_json(self):
        j = self._journal()
        exp = Exporter(j)
        data = json.loads(exp.to_json())
        assert data["count"] == 2
        assert len(data["entries"]) == 2
        assert data["entries"][0]["content"] in ("Hello world", "Second entry")

    def test_to_csv(self):
        j = self._journal()
        exp = Exporter(j)
        csv_text = exp.to_csv()
        reader = csv.reader(io.StringIO(csv_text))
        rows = list(reader)
        assert rows[0] == ["id", "timestamp", "mood", "category", "tags", "content"]
        assert len(rows) == 3  # header + 2 entries

    def test_to_markdown(self):
        j = self._journal()
        exp = Exporter(j)
        md = exp.to_markdown()
        assert "# PersonalLog Export" in md
        assert "Hello world" in md
        assert "Second entry" in md
        assert "*good*" in md

    def test_export_subset(self):
        j = self._journal()
        exp = Exporter(j)
        subset = j.search("Hello")
        data = json.loads(exp.to_json(subset))
        assert data["count"] == 1


# ---------------------------------------------------------------------------
# Integration
# ---------------------------------------------------------------------------

class TestIntegration:
    def test_full_workflow(self):
        j = Journal()
        j.add(Entry.create("Good morning!", mood="great", tags=["morning"], category="daily"))
        j.add(Entry.create("Work was okay", mood="okay", tags=["work"], category="work"))
        j.add(Entry.create("Evening walk", mood="good", tags=["exercise", "evening"], category="personal"))

        assert j.count() == 3
        assert len(j.by_tag("work")) == 1

        mt = MoodTracker(j)
        assert mt.average() is not None
        assert mt.mode() == Mood.GREAT

        a = Analytics(j)
        assert len(a.word_frequency()) > 0
        assert a.category_stats()["work"]["count"] == 1

        exp = Exporter(j)
        json_str = exp.to_json()
        assert json.loads(json_str)["count"] == 3

        csv_str = exp.to_csv()
        assert "Good morning!" in csv_str

        md = exp.to_markdown()
        assert "Evening walk" in md
