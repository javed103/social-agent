import { generatePinterestContent, regeneratePinterestContent } from "./content-generator"
import { generateImage } from "./image-generator"
import { sendMessage, sendPlatformPreview } from "./telegram"
import { savePost, getTodayPost, updatePost, uploadImageToStorage, Post } from "./database"
import { postToChannel } from "./platforms"

export async function handleNightlyBrief(brief: string): Promise<void> {
  try {
    await sendMessage(
      "Got your brief! Starting now...\n\n" +
      "1. Writing post with AI\n" +
      "2. Generating image\n" +
      "3. Sending preview at 8am\n\nSit back!"
    )

    await sendMessage("Writing post with Gemini AI...")
    const content = await generatePinterestContent(brief)

    await sendMessage("Generating image (takes ~30 seconds)...")
    const imagePath = await generateImage(content.imagePrompt, "pinterest")
    const imagePublicUrl = await uploadImageToStorage(imagePath, "pinterest")

    const today = new Date().toISOString().split("T")[0]
    await savePost({
      date: today,
      brief,
      status: "pending",
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
  if (!post) { console.log("[Agent] No post today"); return }
  if (post.status === "preview_sent") { console.log("[Agent] Already sent"); return }

  await sendMessage("Good morning! Here is your post for today:")
  await sendPlatformPreview("channel", post.pinterest_text!, post.pinterest_image_local!)
  await sendMessage(
    "Reply with:\n\n" +
    "✅ `approve` — post to channel now\n" +
    "✏️ `edit: your feedback` — regenerate\n" +
    "🔄 `regenerate` — completely new post\n" +
    "📊 `status` — check today's status"
  )
  await updatePost(post.id!, { status: "preview_sent" })
}

export async function handleUserReply(message: string): Promise<void> {
  const msg = message.toLowerCase().trim()
  const post = await getTodayPost()

  if (msg === "status") {
    if (!post) {
      await sendMessage("No post today.\n\nSend: `Brief: your idea`")
    } else {
      await sendMessage(
        `*Today Status*\n\n` +
        `Channel: ${post.pinterest_approved ? "✅ Posted" : "⏳ Pending"}\n` +
        `Status: ${post.status}\n\nBrief: _${post.brief?.slice(0, 80)}_`
      )
    }
    return
  }

  if (!post) {
    await sendMessage("No pending post.\n\nSend: `Brief: your idea`")
    return
  }

  if (msg === "approve") { await handleApprove(post); return }
  if (msg.startsWith("edit:")) { await handleEdit(message.slice(5).trim(), post); return }
  if (msg === "regenerate") {
    await sendMessage("Regenerating from scratch...")
    await handleNightlyBrief(post.brief)
    return
  }
  if (msg.startsWith("brief:")) {
    await handleNightlyBrief(message.slice(6).trim())
    return
  }

  await sendMessage(
    "Commands:\n" +
    "• `approve`\n" +
    "• `edit: make it funnier`\n" +
    "• `regenerate`\n" +
    "• `status`\n" +
    "• `Brief: new idea`"
  )
}

async function handleApprove(post: Post): Promise<void> {
  await sendMessage("Posting to channel now...")
  try {
    await postToChannel(post.pinterest_text!, post.pinterest_image_local!)
    await updatePost(post.id!, { status: "posted", pinterest_approved: true })
    await sendMessage(
      "Post published to your channel!\n\n" +
      "Send a new brief tonight for tomorrow."
    )
  } catch (err) {
    await sendMessage(`Failed to post: ${String(err)}`)
  }
}

async function handleEdit(feedback: string, post: Post): Promise<void> {
  await sendMessage("Regenerating with your feedback...")
  try {
    const newContent = await regeneratePinterestContent(
      post.brief, post.pinterest_text!, feedback
    )
    await sendMessage("Generating new image...")
    const newImagePath = await generateImage(newContent.imagePrompt, "pinterest")
    const newImageUrl = await uploadImageToStorage(newImagePath, "pinterest")
    await updatePost(post.id!, {
      pinterest_text: newContent.text,
      pinterest_image_url: newImageUrl,
      pinterest_image_local: newImagePath,
      status: "preview_sent"
    })
    await sendMessage("Here is the updated post:")
    await sendPlatformPreview("channel", newContent.text, newImagePath)
  } catch (err) {
    await sendMessage(`Error: ${String(err)}`)
  }
}
