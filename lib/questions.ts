import { supabase } from "@/lib/supabase";

export async function getQuestionsPage(offset: number, limit: number) {
  const { data, error } = await supabase
    .from("questions")
    .select("id, title, content, created_at, votes(question_id)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((q: any) => ({
    id: String(q.id),       
    title: q.title,
    body: q.content,        
    author: "Anonymous",    
    votes: Array.isArray(q.votes) ? q.votes.length : 0,
  }));

  const hasMore = rows.length > limit; 
  return { questions: rows.slice(0, limit), hasMore };
}

export async function searchQuestions(q: string, limit: number) {
  const { data, error } = await supabase
    .from("questions")
    .select("id, title, content, created_at, votes(question_id)")
    .textSearch("content", q, { type: "websearch", config: "english" })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    title: row.title,
    body: row.content,      
    author: "Anonymous",
    votes: Array.isArray(row.votes) ? row.votes.length : 0,
  }));
}