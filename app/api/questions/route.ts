import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q");
    const offset = Number(searchParams.get("offset") || 0);
    const limit = 10;

    let query = supabase
      .from("questions")
      .select("id, body, author, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (q) {
      query = query.ilike("body", `%${q}%`);
    }

    const { data: questions, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const ids = (questions || []).map((q) => q.id);

    let votes: { question_id: string }[] = [];

    if (ids.length > 0) {
      const { data } = await supabase
        .from("votes")
        .select("question_id")
        .in("question_id", ids);

      votes = data || [];
    }

    const result = (questions || []).map((q) => ({
      id: q.id,
      body: q.body,
      author: q.author,
      votes: votes.filter((v) => v.question_id === q.id).length,
    }));

    return NextResponse.json({
      questions: result,
      hasMore: result.length === limit,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { body, author } = await request.json();

    if (!body || !body.trim()) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("questions")
      .insert({
        body: body.trim(),
        author: author || "Anonymous",
      })
      .select("id, body, author, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: data.id,
      body: data.body,
      author: data.author,
      votes: 0,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}