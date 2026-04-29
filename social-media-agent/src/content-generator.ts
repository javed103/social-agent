import axios from "axios"

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

export interface PinterestContent {
  text: string
  imagePrompt: string
}

export async function generatePinterestContent(brief: string): Promise<PinterestContent> {
  const prompt = `You are an expert Pinterest content creator who creates viral pins.

Given this brief: "${brief}"

RULES:
- text: Inspiring, keyword-rich. Max 80 words. Strong hook. 3-5 hashtags at end.
- imagePrompt: Very detailed prompt for a beautiful VERTICAL image. Describe style, colors, mood, composition. No faces. No text in image.

Return ONLY this exact JSON (no markdown, no backticks):
{"text":"your pin description","imagePrompt":"your image prompt"}`

  const res = await axios.post(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.8, maxOutputTokens: 600 }
  })
  const raw: string = res.data.candidates[0].content.parts[0].text
  const clean = raw.replace(/```json|```/g, "").trim()
  try { return JSON.parse(clean) }
  catch { throw new Error("Gemini returned invalid JSON — please try again") }
}

export async function regeneratePinterestContent(
  brief: string, previousText: string, feedback: string
): Promise<PinterestContent> {
  const prompt = `You are an expert Pinterest content creator.

Original brief: "${brief}"
Previous pin: "${previousText}"
Feedback: "${feedback}"

Regenerate incorporating the feedback.
- text: Inspiring, keyword-rich. Max 80 words. Strong hook. 3-5 hashtags.
- imagePrompt: Detailed vertical image prompt. No faces, no text in image.

Return ONLY this JSON (no markdown):
{"text":"updated pin","imagePrompt":"updated image prompt"}`

  const res = await axios.post(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.9, maxOutputTokens: 600 }
  })
  const raw: string = res.data.candidates[0].content.parts[0].text
  const clean = raw.replace(/```json|```/g, "").trim()
  try { return JSON.parse(clean) }
  catch { throw new Error("Gemini returned invalid JSON — try again") }
}
