import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

export interface Post {
  id?: string
  date: string
  brief: string
  status: "pending" | "preview_sent" | "approved" | "posted" | "partial"
  linkedin_text?: string
  facebook_text?: string
  pinterest_text?: string
  linkedin_image_url?: string
  facebook_image_url?: string
  pinterest_image_url?: string
  linkedin_approved?: boolean
  facebook_approved?: boolean
  pinterest_approved?: boolean
  created_at?: string
}

// ─── UPLOAD image to Supabase Storage → public URL ────────────
export async function uploadImageToStorage(
  localPath: string,
  platform: string
): Promise<string> {
  const filename = `${platform}_${Date.now()}.jpg`
  const file = fs.readFileSync(localPath)

  const { error } = await supabase.storage
    .from("post-images")
    .upload(filename, file, {
      contentType: "image/jpeg",
      upsert: true
    })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data } = supabase.storage
    .from("post-images")
    .getPublicUrl(filename)

  console.log(`[DB] Uploaded ${platform} image → ${data.publicUrl}`)
  return data.publicUrl
}

// ─── SAVE new post ─────────────────────────────────────────────
export async function savePost(post: Omit<Post, "id">): Promise<Post> {
  const { data, error } = await supabase
    .from("posts")
    .insert(post)
    .select()
    .single()

  if (error) throw new Error(`Save post failed: ${error.message}`)
  console.log(`[DB] Post saved with ID: ${data.id}`)
  return data as Post
}

// ─── GET today's pending post ──────────────────────────────────
export async function getTodayPost(): Promise<Post | null> {
  const today = new Date().toISOString().split("T")[0]

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("date", today)
    .neq("status", "posted")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data as Post
}

// ─── UPDATE post fields ────────────────────────────────────────
export async function updatePost(id: string, updates: Partial<Post>): Promise<void> {
  const { error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", id)

  if (error) throw new Error(`Update post failed: ${error.message}`)
  console.log(`[DB] Post ${id} updated`)
}

// ─── GET recent posts (for history) ───────────────────────────
export async function getRecentPosts(limit = 7): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return []
  return data as Post[]
}
