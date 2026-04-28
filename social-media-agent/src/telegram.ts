import axios from "axios"
import * as fs from "fs"
import FormData from "form-data"

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!
const BASE = `https://api.telegram.org/bot${TOKEN}`

// ─── SEND plain text message ──────────────────────────────────
export async function sendMessage(text: string): Promise<void> {
  await axios.post(`${BASE}/sendMessage`, {
    chat_id: CHAT_ID,
    text,
    parse_mode: "Markdown"
  })
  console.log(`[Telegram] Sent: ${text.slice(0, 60)}...`)
}

// ─── SEND photo with caption ──────────────────────────────────
export async function sendPhoto(imagePath: string, caption: string): Promise<void> {
  const form = new FormData()
  form.append("chat_id", CHAT_ID)
  form.append("caption", caption)
  form.append("parse_mode", "Markdown")
  form.append("photo", fs.createReadStream(imagePath))

  await axios.post(`${BASE}/sendPhoto`, form, {
    headers: form.getHeaders()
  })
  console.log(`[Telegram] Photo sent: ${caption.slice(0, 40)}...`)
}

// ─── SEND preview for one platform ───────────────────────────
export async function sendPlatformPreview(
  platform: string,
  text: string,
  imagePath: string
): Promise<void> {
  const emoji: Record<string, string> = {
    linkedin: "💼",
    facebook: "📘",
    pinterest: "📌"
  }

  const caption =
    `${emoji[platform]} *${platform.toUpperCase()} PREVIEW*\n\n` +
    `${text}\n\n` +
    `───────────────\n` +
    `✅ Reply: \`approve ${platform}\`\n` +
    `✏️ Reply: \`edit ${platform}: your feedback\``

  await sendPhoto(imagePath, caption)
}

// ─── SET webhook so Telegram calls our server ─────────────────
export async function setWebhook(webhookUrl: string): Promise<void> {
  const url = `${BASE}/setWebhook`
  const res = await axios.post(url, { url: `${webhookUrl}/webhook/telegram` })
  console.log("[Telegram] Webhook set:", res.data)
}

// ─── GET webhook info (for debugging) ────────────────────────
export async function getWebhookInfo(): Promise<void> {
  const res = await axios.get(`${BASE}/getWebhookInfo`)
  console.log("[Telegram] Webhook info:", res.data)
}
