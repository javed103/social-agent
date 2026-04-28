import dotenv from "dotenv"
dotenv.config()

import express from "express"
import * as path from "path"
import * as fs from "fs"
import {
  handleNightlyBrief,
  sendMorningPreviews,
  handleUserReply
} from "./agent"
import { setWebhook } from "./telegram"

const app = express()
const PORT = Number(process.env.PORT) || 3000

// ─── MIDDLEWARE ────────────────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve generated images publicly
const imgDir = path.join(process.cwd(), "public", "images")
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true })
app.use("/images", express.static(imgDir))

// ─── HEALTH CHECK (keeps Render free tier alive) ──────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

// ─── TELEGRAM WEBHOOK ─────────────────────────────────────────
// Telegram calls this every time you send a message to your bot
app.post("/webhook/telegram", async (req, res) => {
  res.sendStatus(200) // Always respond fast to Telegram

  const update = req.body
  const message = update?.message?.text || update?.channel_post?.text

  if (!message) return

  const chatId = String(
    update?.message?.chat?.id || update?.channel_post?.chat?.id
  )

  // Only process messages from your own chat
  if (chatId !== process.env.TELEGRAM_CHAT_ID) {
    console.log(`[Server] Ignored message from unknown chat: ${chatId}`)
    return
  }

  const text = message.trim()
  console.log(`[Server] Received from Telegram: "${text}"`)

  // Route: nightly brief
  if (text.toLowerCase().startsWith("brief:")) {
    const brief = text.slice(6).trim()
    handleNightlyBrief(brief).catch(console.error)
    return
  }

  // Route: all other replies (approve, edit, status...)
  handleUserReply(text).catch(console.error)
})

// ─── CRON TRIGGERS (called by cron-job.org) ───────────────────
// Trigger morning previews at 8am
app.get("/trigger/morning", async (req, res) => {
  console.log("[Server] Morning trigger fired")
  res.json({ triggered: true, time: new Date().toISOString() })
  sendMorningPreviews().catch(console.error)
})

// Manual test: regenerate today's post
app.get("/trigger/test-brief", async (req, res) => {
  const brief = (req.query.brief as string) || "Test post about AI automation"
  res.json({ triggered: true, brief })
  handleNightlyBrief(brief).catch(console.error)
})

// ─── SETUP WEBHOOK (run once after deploying) ─────────────────
app.get("/setup/webhook", async (req, res) => {
  const baseUrl = process.env.BASE_URL!
  await setWebhook(baseUrl)
  res.json({ success: true, webhook: `${baseUrl}/webhook/telegram` })
})

// ─── START SERVER ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n Social Media Agent running on port ${PORT}`)
  console.log(` Health:   http://localhost:${PORT}/health`)
  console.log(` Webhook:  http://localhost:${PORT}/webhook/telegram`)
  console.log(` Morning:  http://localhost:${PORT}/trigger/morning`)
  console.log(` Setup:    http://localhost:${PORT}/setup/webhook\n`)
})
