import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

export interface Post {
  id?: string
  date: string
  brief: string
  status: "pending" | "preview_sent" | "posted"
  pinterest_text?: string
  pinterest_image_url?: string
  pinterest_image_local?: string
  pinterest_approved?: boolean
  created_at?: string
}

export async function uploadImageToStorage(
  localPath: string,
  platform: string
): Promise<string> {
  const filename = `${platform}_${Date.now()}.jpg`
  const file = fs.readFileSync(localPath)

  const { error } = await supabase.storage
    .from("post-images")
    .upload(filename, file, { contentType: "image/jpeg", upsert: true })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data } = supabase.storage
    .from("post-images")
    .getPublicUrl(filename)

  console.log(`[DB] Image uploaded → ${data.publicUrl}`)
  return data.publicUrl
}

export async function savePost(post: Omit<Post, "id">): Promise<Post> {
  const { data, error } = await supabase
    .from("posts")
    .insert(post)
    .select()
    .single()

  if (error) throw new Error(`Save failed: ${error.message}`)
  console.log(`[DB] Post saved: ${data.id}`)
  return data as Post
}

export async function getTodayPost(): Promise<Post | null> {
  const today = new Date().toISOString().split("T")[0]

  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("date", today)
    .neq("status", "posted")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  return (data as Post) || null
}

export async function updatePost(id: string, updates: Partial<Post>): Promise<void> {
  const { error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", id)

  if (error) throw new Error(`Update failed: ${error.message}`)
}
