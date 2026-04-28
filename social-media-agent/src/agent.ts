import { generateSocialContent, regeneratePlatformContent } from "./content-generator"
import { generateAllImages, generateImage } from "./image-generator"
import { sendMessage, sendPhoto, sendPlatformPreview } from "./telegram"
import {
  savePost,
  getTodayPost,
  updatePost,
  uploadImageToStorage,
  Post
} from "./database"
import {
  postToLinkedIn,
  postToFacebook,
  postToPinterest,
  postAllPlatforms
} from "./platforms"

// ─── STEP 1: Handle nightly brief from user ────────────────────
// Called when user sends: "Brief: I want to post about AI tips today"
export async function handleNightlyBrief(brief: string): Promise<void> {
  try {
    await sendMessage(
      "Got your brief! Starting content generation now...\n\n" +
      "I will:\n" +
      "1. Write posts for LinkedIn, Facebook & Pinterest\n" +
      "2. Generate custom images for each platform\n" +
      "3. Send you previews tomorrow morning at 8am\n\n" +
      "Sit back and relax!"
    )

    // Generate all content with Gemini
    console.log("[Agent] Generating content with Gemini...")
    await sendMessage("Writing posts with AI...")
    const content = await generateSocialContent(brief)

    // Generate all images with Pollinations
    console.log("[Agent] Generating images with Pollinations.ai...")
    await sendMessage("Generating images for each platform (this takes ~1 min)...")

    const imagePaths = await generateAllImages({
      linkedin: content.linkedin.imagePrompt,
      facebook: content.facebook.imagePrompt,
      pinterest: content.pinterest.imagePrompt
    })

    // Upload images to Supabase for public URLs
    console.log("[Agent] Uploading images to Supabase...")
    const [linkedinUrl, facebookUrl, pinterestUrl] = await Promise.all([
      uploadImageToStorage(imagePaths.linkedin, "linkedin"),
      uploadImageToStorage(imagePaths.facebook, "facebook"),
      uploadImageToStorage(imagePaths.pinterest, "pinterest")
    ])

    // Save everything to database
    const today = new Date().toISOString().split("T")[0]
    await savePost({
      date: today,
      brief,
      status: "pending",
      linkedin_text: content.linkedin.text,
      facebook_text: content.facebook.text,
      pinterest_text: content.pinterest.text,
      linkedin_image_url: linkedinUrl,
      facebook_image_url: facebookUrl,
      pinterest_image_url: pinterestUrl,
      linkedin_approved: false,
      facebook_approved: false,
      pinterest_approved: false
    })

    await sendMessage(
      "Content ready! Check your Telegram at 8am for previews.\n\n" +
      "_You will see each post with its image and can approve or request changes._"
    )
    console.log("[Agent] Brief processed successfully")
  } catch (err) {
    console.error("[Agent] Error handling brief:", err)
    await sendMessage(`Error generating content: ${String(err)}\n\nPlease try again.`)
  }
}

// ─── STEP 2: Send morning previews at 8am ─────────────────────
// Called by cron-job.org every morning
export async function sendMorningPreviews(): Promise<void> {
  const post = await getTodayPost()

  if (!post) {
    console.log("[Agent] No pending post for today")
    return
  }

  if (post.status === "preview_sent") {
    console.log("[Agent] Preview already sent today")
    return
  }

  try {
    await sendMessage(
      "Good morning! Here are your posts for today. Review each one and approve or request changes."
    )

    // Send each platform preview with image
    await sendPlatformPreview(
      "linkedin",
      post.linkedin_text!,
      post.linkedin_image_url!
    )
    await delay(2000)

    await sendPlatformPreview(
      "facebook",
      post.facebook_text!,
      post.facebook_image_url!
    )
    await delay(2000)

    await sendPlatformPreview(
      "pinterest",
      post.pinterest_text!,
      post.pinterest_image_url!
    )

    await sendMessage(
      "Commands you can use:\n\n" +
      "✅ `approve all` - post everything now\n" +
      "✅ `approve linkedin` - post only LinkedIn\n" +
      "✅ `approve facebook` - post only Facebook\n" +
      "✅ `approve pinterest` - post only Pinterest\n\n" +
      "✏️ `edit linkedin: make it shorter`\n" +
      "✏️ `edit facebook: add more emojis`\n" +
      "✏️ `edit pinterest: focus on productivity`\n\n" +
      "🔄 `regenerate all` - redo everything\n" +
      "📊 `status` - see what's been posted"
    )

    await updatePost(post.id!, { status: "preview_sent" })
    console.log("[Agent] Morning previews sent")
  } catch (err) {
    console.error("[Agent] Error sending previews:", err)
    await sendMessage(`Error sending previews: ${String(err)}`)
  }
}

// ─── STEP 3: Handle user replies ──────────────────────────────
// Called whenever user sends a message to the bot
export async function handleUserReply(message: string): Promise<void> {
  const msg = message.toLowerCase().trim()
  const post = await getTodayPost()

  // STATUS command
  if (msg === "status") {
    await handleStatusCommand(post)
    return
  }

  if (!post) {
    await sendMessage(
      "No posts pending for today. Send me a brief tonight!\n\n" +
      "Format: `Brief: [your content idea]`"
    )
    return
  }

  // APPROVE ALL
  if (msg === "approve all") {
    await handleApproveAll(post)
    return
  }

  // APPROVE specific platform
  if (msg.startsWith("approve ")) {
    const platform = msg.replace("approve ", "").trim()
    if (["linkedin", "facebook", "pinterest"].includes(platform)) {
      await handleApprovePlatform(platform, post)
    } else {
      await sendMessage("Unknown platform. Use: `approve linkedin`, `approve facebook`, or `approve pinterest`")
    }
    return
  }

  // EDIT specific platform
  if (msg.startsWith("edit ")) {
    const rest = message.slice(5) // preserve case for feedback
    const colonIdx = rest.indexOf(":")
    if (colonIdx === -1) {
      await sendMessage("Format: `edit linkedin: your feedback here`")
      return
    }
    const platform = rest.slice(0, colonIdx).trim().toLowerCase()
    const feedback = rest.slice(colonIdx + 1).trim()
    if (["linkedin", "facebook", "pinterest"].includes(platform)) {
      await handleEditPlatform(platform, feedback, post)
    } else {
      await sendMessage("Unknown platform. Use: linkedin, facebook, or pinterest")
    }
    return
  }

  // REGENERATE ALL
  if (msg === "regenerate all") {
    await sendMessage("Regenerating all content from scratch...")
    await handleNightlyBrief(post.brief)
    return
  }

  // BRIEF: new brief tonight
  if (msg.startsWith("brief:")) {
    const brief = message.slice(6).trim()
    await handleNightlyBrief(brief)
    return
  }

  // Unknown command
  await sendMessage(
    "I didn't understand that. Try:\n" +
    "• `approve all`\n" +
    "• `approve linkedin`\n" +
    "• `edit facebook: make it funnier`\n" +
    "• `status`\n" +
    "• `Brief: your content idea`"
  )
}

// ─── APPROVE ALL platforms ─────────────────────────────────────
async function handleApproveAll(post: Post): Promise<void> {
  await sendMessage("Posting to all 3 platforms now...")

  const results = await postAllPlatforms(
    {
      linkedin: post.linkedin_text!,
      facebook: post.facebook_text!,
      pinterest: post.pinterest_text!
    },
    {
      linkedin: post.linkedin_image_url!,
      facebook: post.facebook_image_url!,
      pinterest: post.pinterest_image_url!
    },
    {
      linkedin: post.linkedin_image_url!,
      facebook: post.facebook_image_url!,
      pinterest: post.pinterest_image_url!
    }
  )

  const report = results
    .map(r => `${r.success ? "✅" : "❌"} ${r.platform}${r.error ? `: ${r.error}` : ""}`)
    .join("\n")

  const allSuccess = results.every(r => r.success)
  await updatePost(post.id!, {
    status: allSuccess ? "posted" : "partial",
    linkedin_approved: results[0].success,
    facebook_approved: results[1].success,
    pinterest_approved: results[2].success
  })

  await sendMessage(
    `${allSuccess ? "All posts published!" : "Posting complete with some errors:"}\n\n${report}`
  )
}

// ─── APPROVE single platform ───────────────────────────────────
async function handleApprovePlatform(platform: string, post: Post): Promise<void> {
  await sendMessage(`Posting to ${platform}...`)

  try {
    if (platform === "linkedin") {
      await postToLinkedIn(post.linkedin_text!, post.linkedin_image_url!)
      await updatePost(post.id!, { linkedin_approved: true })
    } else if (platform === "facebook") {
      await postToFacebook(post.facebook_text!, post.facebook_image_url!)
      await updatePost(post.id!, { facebook_approved: true })
    } else if (platform === "pinterest") {
      await postToPinterest(post.pinterest_text!, post.pinterest_image_url!)
      await updatePost(post.id!, { pinterest_approved: true })
    }
    await sendMessage(`✅ ${platform} post published successfully!`)
  } catch (err) {
    await sendMessage(`❌ Failed to post to ${platform}: ${String(err)}`)
  }
}

// ─── EDIT & REGENERATE one platform ───────────────────────────
async function handleEditPlatform(
  platform: string,
  feedback: string,
  post: Post
): Promise<void> {
  await sendMessage(`Regenerating ${platform} post with your feedback...`)

  try {
    const previousText = post[`${platform}_text` as keyof Post] as string
    const newContent = await regeneratePlatformContent(
      platform,
      post.brief,
      previousText,
      feedback
    )

    // Generate new image
    await sendMessage("Generating new image...")
    const newImagePath = await generateImage(newContent.imagePrompt, platform)
    const newImageUrl = await uploadImageToStorage(newImagePath, platform)

    // Update database
    await updatePost(post.id!, {
      [`${platform}_text`]: newContent.text,
      [`${platform}_image_url`]: newImageUrl
    })

    // Send new preview
    const updatedPost = await getTodayPost()
    await sendMessage(`Here's the updated ${platform} preview:`)
    await sendPlatformPreview(platform, newContent.text, newImagePath)
  } catch (err) {
    await sendMessage(`Error regenerating ${platform}: ${String(err)}`)
  }
}

// ─── STATUS command ────────────────────────────────────────────
async function handleStatusCommand(post: Post | null): Promise<void> {
  if (!post) {
    await sendMessage("No post today. Send a brief tonight:\n`Brief: your content idea`")
    return
  }

  const statusIcon: Record<string, string> = {
    pending: "⏳ Pending",
    preview_sent: "👁 Preview sent",
    approved: "✅ All posted",
    posted: "✅ All posted",
    partial: "⚠️ Partially posted"
  }

  await sendMessage(
    `*Today's Post Status*\n\n` +
    `Status: ${statusIcon[post.status] || post.status}\n\n` +
    `LinkedIn: ${post.linkedin_approved ? "✅ Posted" : "⏳ Pending"}\n` +
    `Facebook: ${post.facebook_approved ? "✅ Posted" : "⏳ Pending"}\n` +
    `Pinterest: ${post.pinterest_approved ? "✅ Posted" : "⏳ Pending"}\n\n` +
    `Brief: _${post.brief.slice(0, 80)}..._`
  )
}

// ─── Helper ────────────────────────────────────────────────────
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
