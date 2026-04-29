import axios from "axios"

export async function postToPinterest(text: string, imagePublicUrl: string): Promise<void> {
  const res = await axios.post(
    "https://api.pinterest.com/v5/pins",
    {
      board_id: process.env.PINTEREST_BOARD_ID!,
      title: text.slice(0, 100),
      description: text,
      media_source: { source_type: "image_url", url: imagePublicUrl }
    },
    { headers: { Authorization: `Bearer ${process.env.PINTEREST_ACCESS_TOKEN!}`, "Content-Type": "application/json" } }
  )
  console.log("[Pinterest] Pin published:", res.data.id)
}
