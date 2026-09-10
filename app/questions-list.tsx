"use client";
import { useState, useEffect } from "react";
import { getVoterId } from "@/lib/voter";

type Question = {
  id: string;
  body: string;
  author: string | null;
  votes: number;
};

export default function QuestionsList({
  initialQuestions,
  initialHasMore,
}: {
  initialQuestions: Question[];
  initialHasMore: boolean;
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!query.trim()) {
      return;
    }

    const id = setTimeout(async () => {
      const url = `/api/questions?q=${encodeURIComponent(query)}`;
      
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.error(`Failed to fetch questions. Status: ${res.status}`);
          return;
        }
        const data = await res.json();
        setQuestions(data.questions ?? []);
        setHasMore(data.hasMore ?? false);
      } catch (error) {
        console.error("Error parsing or fetching search results:", error);
      }
    }, 300);

    return () => clearTimeout(id);
  }, [query]);

  async function fetchSuggestions() {
    setLoadingAi(true);
    try {
      const res = await fetch("/api/questions/suggest");
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
      } else {
        console.error(`Suggestions failed. Status: ${res.status}`);
      }
    } catch (err) {
      console.error("Error fetching AI suggestions:", err);
    } finally {
      setLoadingAi(false);
    }
  }

  async function submit() {
    if (!draft.trim()) return;

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft }),
      });

      if (!res.ok) {
        console.error(`Failed to submit question. Status: ${res.status}`);
        return;
      }

      const created = await res.json();
      setQuestions((qs) => [{ ...created, votes: 0 }, ...qs]);
      setDraft("");
    } catch (error) {
      console.error("Error submitting question:", error);
    }
  }

  async function upvote(id: string) {
    setQuestions((qs) =>
      qs.map((q) => (q.id === id ? { ...q, votes: q.votes + 1 } : q))
    );

    try {
      const res = await fetch(`/api/questions/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId: getVoterId() }),
      });

      if (!res.ok) {
        console.warn(`Upvote rejected by server. Status: ${res.status}`);
        setQuestions((qs) =>
          qs.map((q) => (q.id === id ? { ...q, votes: q.votes - 1 } : q))
        );
      }
    } catch (error) {
      console.error("Error sending upvote:", error);
      setQuestions((qs) =>
        qs.map((q) => (q.id === id ? { ...q, votes: q.votes - 1 } : q))
      );
    }
  }

  async function loadMore() {
    setLoading(true);
    try {
      const res = await fetch(`/api/questions?offset=${questions.length}`);
      
      if (!res.ok) {
        console.error(`Failed to load more questions. Status: ${res.status}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setQuestions((qs) => [...qs, ...(data.questions ?? [])]);
      setHasMore(data.hasMore ?? false);
    } catch (error) {
      console.error("Error loading more questions:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-surface p-4 shadow-sm">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Ask a question…"
            className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand"
          />
          <button
            onClick={submit}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-strong"
          >
            Ask
          </button>
        </div>
      </div>

      <div className="my-1 space-y-2 px-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Need inspiration?
          </span>
          <button
            onClick={fetchSuggestions}
            disabled={loadingAi}
            className="text-xs font-medium text-brand hover:underline disabled:opacity-50"
          >
            {loadingAi ? "Generating..." : "✨ Suggest questions with Gemini"}
          </button>
        </div>

        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => setDraft(suggestion)}
                className="rounded-xl border bg-surface px-3.5 py-2 text-left text-xs text-foreground shadow-sm transition-all hover:border-brand hover:bg-brand-soft"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions…"
          className="w-full flex-1 rounded-xl border bg-surface px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand"
        />
        <span className="shrink-0 text-xs text-muted">
          {hydrated ? "Interactive ✓" : "Loading interactivity…"}
        </span>
      </div>

      <ul className="space-y-3">
        {questions.map((q) => (
          <li
            key={q.id}
            className="flex items-start gap-3 rounded-2xl border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <button
              onClick={() => upvote(q.id)}
              className="flex shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3.5 py-2 text-brand transition-colors hover:border-brand hover:bg-brand-soft"
            >
              <span className="text-xs leading-none">▲</span>
              <span className="text-sm font-semibold leading-none tabular-nums">
                {q.votes}
              </span>
            </button>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="leading-snug">{q.body}</p>
              {q.author && (
                <p className="mt-1.5 text-xs text-muted">{q.author}</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {questions.length === 0 && (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted">
          No questions yet — be the first to ask.
        </p>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-xl border bg-surface px-5 py-2.5 text-sm font-medium transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}