import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = 10;

    let supabaseQuery = supabase
      .from("questions")
      .select("id, content, title") 
      .range(offset, offset + limit - 1);

    if (query) {
      supabaseQuery = supabaseQuery.ilike("content", `%${query}%`);
    }

    const { data: rawQuestions, error: questionsError } = await supabaseQuery;

    if (questionsError) {
      return NextResponse.json({ error: questionsError.message }, { status: 500 });
    }

    if (!rawQuestions || rawQuestions.length === 0) {
      return NextResponse.json({ questions: [], hasMore: false });
    }

    const questionIds = rawQuestions.map(q => q.id);
    const { data: rawVotes } = await supabase
      .from("votes")
      .select("question_id")
      .in("question_id", questionIds);

    const questions = rawQuestions.map((q: any) => {
      const matchCount = rawVotes 
        ? rawVotes.filter((v: any) => v.question_id === q.id).length 
        : 0;

      return {
        id: String(q.id),
        body: q.content, 
        author: q.title || null, 
        votes: matchCount,
      };
    });

    const hasMore = questions.length === limit;
    return NextResponse.json({ questions, hasMore });

  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { body } = await request.json();

    if (!body || !body.trim()) {
      return NextResponse.json({ error: "Content text required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("questions")
      .insert({ 
        content: body,
        title: "Anonymous"
      })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const createdQuestion = data?.[0] ? {
      id: String(data[0].id),
      body: data[0].content,
      author: data[0].title || null,
      votes: 0
    } : {};

    return NextResponse.json(createdQuestion);
    
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}