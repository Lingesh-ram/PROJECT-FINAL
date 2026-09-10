import { supabase } from "@/lib/supabase";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionIdString } = await params;
    const { voterId } = await req.json();

    const questionId = parseInt(questionIdString, 10);

    if (isNaN(questionId)) {
      return Response.json({ error: "Invalid question ID format" }, { status: 400 });
    }

    const { error } = await supabase
      .from("votes")
      .insert({ 
        question_id: questionId, 
        voter_id: voterId 
      });

    if (error) {
      if (error.code === "23505") {
        return Response.json({ error: "already voted" }, { status: 409 });
      }
      return Response.json({ error: error.message, code: error.code }, { status: 500 });
    }

    return Response.json({ ok: true });
    
  } catch (err: any) {
    return Response.json({ error: "Internal Server Error", details: err?.message }, { status: 500 });
  }
}