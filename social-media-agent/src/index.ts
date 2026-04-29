import dotenv from "dotenv"
dotenv.config()
import express from "express"
import * as path from "path"
import * as fs from "fs"
import { handleNightlyBrief, sendMorningPreview, handleUserReply } from "./agent"
import { setWebhook } from "./telegram"

const app = express()
const PORT = Number(process.env.PORT) || 3000
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
const imgDir = path.join(process.cwd(), "public", "images")
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true })
app.use("/images", express.static(imgDir))

app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }))

app.post("/webhook/telegram", async (req, res) => {
  res.sendStatus(200)
  const update = req.body
  const message = update?.message?.text || update?.channel_post?.text
  if (!message) return
  const chatId = String(update?.message?.chat?.id || update?.channel_post?.chat?.id)
  if (chatId !== process.env.TELEGRAM_CHAT_ID) return
  const text = message.trim()
  console.log(`[Telegram] "${text}"`)
  if (text.toLowerCase().startsWith("brief:")) {
    handleNightlyBrief(text.slice(6).trim()).catch(console.error)
  } else {
    handleUserReply(text).catch(console.error)
  }
})

app.get("/trigger/morning", async (req, res) => {
  res.json({ triggered: true })
  sendMorningPreview().catch(console.error)
})

app.get("/setup/webhook", async (req, res) => {
  try {
    await setWebhook(process.env.BASE_URL!)
    res.json({ success: true, webhook: `${process.env.BASE_URL}/webhook/telegram` })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

app.get("/test", async (req, res) => {
  const brief = (req.query.brief as string) || "Minimalist home decor ideas for small spaces"
  res.json({ triggered: true, brief })
  handleNightlyBrief(brief).catch(console.error)
})

app.listen(PORT, () => {
  console.log(`\nPinterest Agent running on port ${PORT}`)
  console.log(`Health:  http://localhost:${PORT}/health`)
  console.log(`Test:    http://localhost:${PORT}/test`)
  console.log(`Setup:   http://localhost:${PORT}/setup/webhook\n`)
})
