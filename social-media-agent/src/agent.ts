import { generatePinterestContent, regeneratePinterestContent } from "./content-generator"
import { generateImage } from "./image-generator"
import { sendMessage, sendPlatformPreview } from "./telegram"
import { savePost, getTodayPost, updatePost, uploadImageToStorage, Post } from "./database"
import { postToPinterest } from "./platforms"

export async function handleNightlyBrief(brief: string): Promise<void> {
  try {
    await sendMessage(
      "Got your brief! Starting now...\n\n" +
      "1. Writing Pinterest pin with AI\n" +
      "2. Generating vertical image\n" +
      "3. Sending preview at 8am\n\nSit back!"
    )
    await sendMessage("Writing Pinterest pin...")
    const content = await generatePinterestContent(brief)
    await sendMessage("Generating image (takes ~30 seconds)...")
    const imagePath = await generateImage(content.imagePrompt, "pinterest")
    const imagePublicUrl = await uploadImageToStorage(imagePath, "pinterest")
    const today = new Date().toISOString().split("T")[0]
    await savePost({
      date: today, brief, status: "pending",
      pinterest_text: content.text,
      pinterest_image_url: imagePublicUrl,
      pinterest_image_local: imagePath,
      pinterest_approved: false
    })
    await sendMessage("Done! Check Telegram at 8am for your preview.")
  } catch (err) {
    await sendMessage(`Something went wrong: ${String(err)}\n\nPlease try again.`)
  }
}

export async function sendMorningPreview(): Promise<void> {
  const post = await getTodayPost()
  if (!post) return
  if (post.status === "preview_sent") return
  await sendMessage("Good morning! Here is your Pinterest pin for today:")
  await sendPlatformPreview("pinterest", post.pinterest_text!, post.pinterest_image_local!)
  await sendMessage(
    "Reply with:\n\n" +
    "✅ `approve` — post to Pinterest now\n" +
    "✏️ `edit: your feedback` — regenerate with changes\n" +
    "🔄 `regenerate` — completely new pin\n" +
    "📊 `status` — check today's post"
  )
  await updatePost(post.id!, { status: "preview_sent" })
}

export async function handleUserReply(message: string): Promise<void> {
  const msg = message.toLowerCase().trim()
  const post = await getTodayPost()

  if (msg === "status") {
    if (!post) { await sendMessage("No post today.\n\nSend: `Brief: your idea`"); return }
    await sendMessage(
      `*Today Status*\n\nPinterest: ${post.pinterest_approved ? "✅ Posted" : "⏳ Pending"}\n` +
      `Status: ${post.status}\n\nBrief: _${post.brief?.slice(0, 80)}_`
    )
    return
  }
  if (!post) { await sendMessage("No pending post.\n\nSend: `Brief: your idea`"); return }
  if (msg === "approve") { await handleApprove(post); return }
  if (msg.startsWith("edit:")) { await handleEdit(message.slice(5).trim(), post); return }
  if (msg === "regenerate") {
    await sendMessage("Regenerating from scratch...")
    await handleNightlyBrief(post.brief)
    return
  }
  if (msg.startsWith("brief:")) { await handleNightlyBrief(message.slice(6).trim()); return }
  await sendMessage("Commands:\n• `approve`\n• `edit: make it more inspiring`\n• `regenerate`\n• `status`\n• `Brief: new idea`")
}

async function handleApprove(post: Post): Promise<void> {
  await sendMessage("Posting to Pinterest now...")
  try {
    await postToPinterest(post.pinterest_text!, post.pinterest_image_url!)
    await updatePost(post.id!, { status: "posted", pinterest_approved: true })
    await sendMessage("Pinterest pin published! Send a new brief tonight.")
  } catch (err) {
    await sendMessage(`Failed: ${String(err)}\n\nCheck your Pinterest token.`)
  }
}

async function handleEdit(feedback: string, post: Post): Promise<void> {
  await sendMessage("Regenerating with your feedback...")
  try {
    const newContent = await regeneratePinterestContent(post.brief, post.pinterest_text!, feedback)
    await sendMessage("Generating new image...")
    const newImagePath = await generateImage(newContent.imagePrompt, "pinterest")
    const newImageUrl = await uploadImageToStorage(newImagePath, "pinterest")
    await updatePost(post.id!, {
      pinterest_text: newContent.text,
      pinterest_image_url: newImageUrl,
      pinterest_image_local: newImagePath,
      status: "preview_sent"
    })
    await sendMessage("Here is the updated pin:")
    await sendPlatformPreview("pinterest", newContent.text, newImagePath)
  } catch (err) {
    await sendMessage(`Error: ${String(err)}`)
  }
}
