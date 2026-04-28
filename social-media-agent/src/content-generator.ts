import axios from "axios"

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

export interface PlatformContent {
  text: string
  imagePrompt: string
}

export interface GeneratedContent {
  linkedin: PlatformContent
  facebook: PlatformContent
  pinterest: PlatformContent
}

// ─── GENERATE content for all 3 platforms ─────────────────────
export async function generateSocialContent(
  brief: string,
  feedbackContext?: string
): Promise<GeneratedContent> {
  const feedbackPart = feedbackContext
    ? `\n\nAdditional context / feedback to incorporate:\n${feedbackContext}`
    : ""

  const prompt = `You are an expert social media content creator who creates viral, engaging posts.

Given this content brief: "${brief}"${feedbackPart}

Create platform-optimised posts for LinkedIn, Facebook, and Pinterest.

STRICT RULES:
- LinkedIn: Professional, thought-leadership tone. Include 3-5 relevant hashtags. Max 250 words. Start with a strong hook.
- Facebook: Friendly, conversational, use 2-3 relevant emojis. Max 120 words. Include a question to drive engagement.
- Pinterest: Inspiring, keyword-rich for SEO. Max 80 words. Focus on benefits and aspirational language.
- Each imagePrompt must describe a specific, vivid scene for AI image generation. Be very descriptive about style, colors, mood, composition. No people's faces. No text in images.

Return ONLY this exact JSON structure (no markdown, no backticks, no extra text):
{
  "linkedin": {
    "text": "your linkedin post here",
    "imagePrompt": "detailed image generation prompt for a professional LinkedIn image"
  },
  "facebook": {
    "text": "your facebook post here",
    "imagePrompt": "detailed image generation prompt for an eye-catching Facebook image"
  },
  "pinterest": {
    "text": "your pinterest description here",
    "imagePrompt": "detailed image generation prompt for a beautiful vertical Pinterest image"
  }
}`

  const res = await axios.post(
    `${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 1500
      }
    }
  )

  const raw: string = res.data.candidates[0].content.parts[0].text
  const clean = raw.replace(/```json|```/g, "").trim()

  try {
    return JSON.parse(clean) as GeneratedContent
  } catch (err) {
    console.error("[Gemini] JSON parse failed, raw output:", raw)
    throw new Error("Gemini returned invalid JSON. Retrying...")
  }
}

// ─── REGENERATE one specific platform ─────────────────────────
export async function regeneratePlatformContent(
  platform: string,
  brief: string,
  previousText: string,
  userFeedback: string
): Promise<PlatformContent> {
  const feedbackContext = `
Platform to regenerate: ${platform}
Previous post text: "${previousText}"
User feedback: "${userFeedback}"
Please regenerate only the ${platform} post incorporating this feedback.`

  const content = await generateSocialContent(brief, feedbackContext)
  return content[platform as keyof GeneratedContent]
}
