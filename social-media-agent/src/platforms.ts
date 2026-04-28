import axios from "axios"
import * as fs from "fs"
import FormData from "form-data"

// ═══════════════════════════════════════════════════════════════
//  LINKEDIN
// ═══════════════════════════════════════════════════════════════
export async function postToLinkedIn(text: string, imageUrl: string): Promise<string> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN!
  const personUrn = process.env.LINKEDIN_PERSON_URN!
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0"
  }

  // Step 1: Register image upload
  const registerRes = await axios.post(
    "https://api.linkedin.com/v2/assets?action=registerUpload",
    {
      registerUploadRequest: {
        owner: personUrn,
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        serviceRelationships: [
          {
            identifier: "urn:li:userGeneratedContent",
            relationshipType: "OWNER"
          }
        ],
        supportedUploadMechanism: ["SYNCHRONOUS_UPLOAD"]
      }
    },
    { headers }
  )

  const uploadUrl =
    registerRes.data.value.uploadMechanism[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ].uploadUrl
  const asset = registerRes.data.value.asset

  // Step 2: Upload image binary
  const imageBuffer = fs.readFileSync(imageUrl)
  await axios.put(uploadUrl, imageBuffer, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "image/jpeg"
    }
  })

  // Step 3: Create the post
  await axios.post(
    "https://api.linkedin.com/v2/ugcPosts",
    {
      author: personUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "IMAGE",
          media: [
            {
              status: "READY",
              media: asset,
              title: { text: "Post" }
            }
          ]
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    },
    { headers }
  )

  console.log("[LinkedIn] Post published successfully")
  return "LinkedIn post published"
}

// ═══════════════════════════════════════════════════════════════
//  FACEBOOK
// ═══════════════════════════════════════════════════════════════
export async function postToFacebook(text: string, imagePath: string): Promise<string> {
  const pageId = process.env.FACEBOOK_PAGE_ID!
  const token = process.env.FACEBOOK_PAGE_TOKEN!

  // Upload photo with caption in one API call
  const form = new FormData()
  form.append("caption", text)
  form.append("access_token", token)
  form.append("source", fs.createReadStream(imagePath), {
    filename: "post.jpg",
    contentType: "image/jpeg"
  })

  await axios.post(
    `https://graph.facebook.com/v18.0/${pageId}/photos`,
    form,
    { headers: form.getHeaders() }
  )

  console.log("[Facebook] Post published successfully")
  return "Facebook post published"
}

// ═══════════════════════════════════════════════════════════════
//  PINTEREST
// ═══════════════════════════════════════════════════════════════
export async function postToPinterest(
  text: string,
  imagePublicUrl: string
): Promise<string> {
  const token = process.env.PINTEREST_ACCESS_TOKEN!
  const boardId = process.env.PINTEREST_BOARD_ID!

  await axios.post(
    "https://api.pinterest.com/v5/pins",
    {
      board_id: boardId,
      title: text.slice(0, 100),
      description: text,
      media_source: {
        source_type: "image_url",
        url: imagePublicUrl  // Pinterest requires a public URL (use Supabase URL)
      }
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  )

  console.log("[Pinterest] Pin published successfully")
  return "Pinterest pin published"
}

// ═══════════════════════════════════════════════════════════════
//  POST ALL platforms at once
// ═══════════════════════════════════════════════════════════════
export async function postAllPlatforms(
  texts: { linkedin: string; facebook: string; pinterest: string },
  imagePaths: { linkedin: string; facebook: string; pinterest: string },
  imagePublicUrls: { linkedin: string; facebook: string; pinterest: string }
): Promise<{ platform: string; success: boolean; error?: string }[]> {
  const results = await Promise.allSettled([
    postToLinkedIn(texts.linkedin, imagePaths.linkedin),
    postToFacebook(texts.facebook, imagePaths.facebook),
    postToPinterest(texts.pinterest, imagePublicUrls.pinterest)
  ])

  return results.map((result, i) => {
    const platforms = ["linkedin", "facebook", "pinterest"]
    return {
      platform: platforms[i],
      success: result.status === "fulfilled",
      error: result.status === "rejected" ? String(result.reason) : undefined
    }
  })
}
