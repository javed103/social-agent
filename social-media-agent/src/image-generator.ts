import axios from "axios"
import * as fs from "fs"
import * as path from "path"

// Platform-optimised dimensions
const PLATFORM_SIZES: Record<string, { width: number; height: number }> = {
  linkedin:  { width: 1200, height: 628  }, // landscape 1.91:1
  facebook:  { width: 1080, height: 1080 }, // square 1:1
  pinterest: { width: 1000, height: 1500 }  // portrait 2:3
}

// ─── GENERATE image via Pollinations.ai (100% free) ───────────
export async function generateImage(
  prompt: string,
  platform: string,
  outputDir: string = "./public/images"
): Promise<string> {
  const { width, height } = PLATFORM_SIZES[platform]

  const enhancedPrompt = `${prompt}, professional photography, high quality, 
    vibrant colors, sharp focus, commercial photography style, 
    no text, no watermark, no people's faces`

  const encoded = encodeURIComponent(enhancedPrompt)
  const seed = Math.floor(Math.random() * 999999)

  // Pollinations.ai - free forever, no sign-up
  const imageUrl =
    `https://image.pollinations.ai/prompt/${encoded}` +
    `?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`

  console.log(`[Image] Generating ${platform} image (${width}x${height})...`)

  // Download the image
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const filename = `${platform}_${Date.now()}.jpg`
  const filepath = path.join(outputDir, filename)

  const response = await axios.get(imageUrl, {
    responseType: "arraybuffer",
    timeout: 60000, // 60 second timeout - Pollinations can be slow
    headers: {
      "User-Agent": "SocialMediaAgent/1.0"
    }
  })

  fs.writeFileSync(filepath, response.data)
  console.log(`[Image] Saved ${platform} image: ${filepath}`)

  return filepath
}

// ─── GENERATE all 3 platform images in parallel ───────────────
export async function generateAllImages(
  prompts: { linkedin: string; facebook: string; pinterest: string },
  outputDir: string = "./public/images"
): Promise<{ linkedin: string; facebook: string; pinterest: string }> {
  console.log("[Image] Generating all 3 platform images...")

  const [linkedinPath, facebookPath, pinterestPath] = await Promise.all([
    generateImage(prompts.linkedin, "linkedin", outputDir),
    generateImage(prompts.facebook, "facebook", outputDir),
    generateImage(prompts.pinterest, "pinterest", outputDir)
  ])

  return {
    linkedin: linkedinPath,
    facebook: facebookPath,
    pinterest: pinterestPath
  }
}
