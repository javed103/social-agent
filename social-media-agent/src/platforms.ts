import axios from "axios"
import * as fs from "fs"
import FormData from "form-data"

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID!
const BASE = `https://api.telegram.org/bot${TOKEN}`

// Post image + caption to your public Telegram Channel
export async function postToChannel(text: string, imagePath: string): Promise<void> {
  const form = new FormData()
  form.append("chat_id", CHANNEL_ID)
  form.append("caption", text)
  form.append("parse_mode", "Markdown")
  form.append("photo", fs.createReadStream(imagePath), {
    filename: "post.jpg",
    contentType: "image/jpeg"
  })

  const res = await axios.post(`${BASE}/sendPhoto`, form, {
    headers: form.getHeaders()
  })

  console.log("[Channel] Post published:", res.data.result.message_id)
}
