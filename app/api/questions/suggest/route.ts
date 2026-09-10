import { supabase } from "@/lib/supabase";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function GET() {
  try {
    // 1. Fetch recent questions to give Gemini context on the topic trends
    const { data: recentQuestions } = await supabase
      .from("questions")
      .select("body")
      .order("created_at", { ascending: false })
      .limit(10);

    const contextText = recentQuestions && recentQuestions.length > 0
      ? recentQuestions.map((q) => `- ${q.body}`).join("\n")
      : "No questions asked yet.";

    // 2. Query Gemini with a Structured JSON Output constraint
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Based on these recent questions, generate 3 highly relevant, interesting new questions:\n\n${contextText}`,
      config: {
        systemInstruction: "You are a helpful brainstorming assistant. Generate creative, engaging, and clear questions that fit the theme of the provided context.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of exactly 3 suggested questions.",
            },
          },
          required: ["suggestions"],
        },
      },
    });

    // 3. Extract parsed text
    const jsonText = response.text;
    if (!jsonText) {
      return Response.json({ suggestions: [] });
    }

    const data = JSON.parse(jsonText);
    return Response.json({ suggestions: data.suggestions ?? [] });

  } catch (error: any) {
    console.error("AI Suggestion Route Error:", error);
    return Response.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}