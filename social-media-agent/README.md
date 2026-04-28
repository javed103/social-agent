# Social Media Agent — Complete Setup Guide
## 100% Free Stack: Telegram + Gemini + Pollinations + Supabase + Render

---

## WHAT IT DOES
- You send a brief via Telegram every night
- Agent generates LinkedIn, Facebook, Pinterest posts + images using free AI
- At 8am you receive previews via Telegram
- Reply "approve all" → posts live on all 3 platforms
- Reply "edit linkedin: make it shorter" → regenerates that post

---

## STEP 1 — Create Telegram Bot (5 minutes)

1. Open Telegram → search for @BotFather
2. Send: /newbot
3. Choose a name: e.g. "My Social Agent"
4. Choose a username: e.g. "my_social_agent_bot"
5. Copy the token: looks like 7123456789:AAHdqTcvCHhvQqKyqRnJxxx
6. Save this as TELEGRAM_BOT_TOKEN in your .env

To get YOUR Telegram Chat ID:
1. Start a chat with your bot
2. Send any message to it
3. Visit: https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
4. Find "chat": {"id": 123456789} — that number is your TELEGRAM_CHAT_ID

---

## STEP 2 — Get Gemini API Key (free, 2 minutes)

1. Go to: https://aistudio.google.com
2. Sign in with Google account
3. Click "Get API Key" → "Create API Key"
4. Copy the key (starts with AIzaSy...)
5. Save as GEMINI_API_KEY in .env

Free limit: 15 requests/minute, 1 million tokens/day — more than enough.

---

## STEP 3 — Setup Supabase (free database + image storage, 5 minutes)

1. Go to: https://supabase.com → "Start your project" (free)
2. Create new project → choose a name and password
3. Wait ~2 minutes for project to start
4. Go to Settings → API → copy:
   - Project URL → SUPABASE_URL
   - anon/public key → SUPABASE_ANON_KEY

Create the database table:
1. Click "SQL Editor" in sidebar
2. Paste and run this SQL:

```sql
create table posts (
  id uuid default gen_random_uuid() primary key,
  date text not null,
  brief text,
  status text default 'pending',
  linkedin_text text,
  facebook_text text,
  pinterest_text text,
  linkedin_image_url text,
  facebook_image_url text,
  pinterest_image_url text,
  linkedin_approved boolean default false,
  facebook_approved boolean default false,
  pinterest_approved boolean default false,
  created_at timestamp with time zone default now()
);
```

Create image storage bucket:
1. Click "Storage" in sidebar
2. Click "New bucket"
3. Name: post-images
4. Toggle "Public bucket" to ON
5. Click "Create bucket"

---

## STEP 4 — LinkedIn API Setup (free, 10 minutes)

1. Go to: https://www.linkedin.com/developers/apps
2. Click "Create app"
3. Fill in: App name, LinkedIn Page (create one if needed), Logo
4. Click "Create app"
5. Go to "Auth" tab → copy "Client ID" and "Client Secret"
6. Under "OAuth 2.0 scopes", request: r_liteprofile, w_member_social
7. Add redirect URL: https://oauth.pstmn.io/v1/callback

Get Access Token (use Postman or this URL):
Step A — Get Auth Code:
Open this URL in browser (replace CLIENT_ID):
https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=CLIENT_ID&redirect_uri=https://oauth.pstmn.io/v1/callback&scope=r_liteprofile%20w_member_social

Step B — Exchange for token (replace values):
curl -X POST https://www.linkedin.com/oauth/v2/accessToken \
  -d grant_type=authorization_code \
  -d code=YOUR_CODE \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET \
  -d redirect_uri=https://oauth.pstmn.io/v1/callback

Step C — Get your Person URN:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.linkedin.com/v2/me

Copy the "id" field and format as: urn:li:person:YOUR_ID

Save:
- LINKEDIN_ACCESS_TOKEN (token from Step B)
- LINKEDIN_PERSON_URN (urn:li:person:YOUR_ID)

Note: LinkedIn tokens expire in 60 days. You'll need to refresh them.

---

## STEP 5 — Facebook API Setup (free, 10 minutes)

1. Go to: https://developers.facebook.com
2. Click "My Apps" → "Create App"
3. Choose "Business" type → fill in name
4. Add product: "Facebook Login" and "Pages API"

Get Page Access Token:
1. Go to: https://developers.facebook.com/tools/explorer/
2. Select your App
3. Click "Get Token" → "Get Page Access Token"
4. Select your Facebook Page
5. Grant permissions: pages_manage_posts, pages_read_engagement
6. Copy the token

Get your Page ID:
1. Go to your Facebook Page
2. Click "About" → scroll to bottom → find "Page ID"

To make token permanent (never expires):
Use this tool: https://developers.facebook.com/tools/debug/accesstoken/
Exchange short-lived token for long-lived one.

Save:
- FACEBOOK_PAGE_TOKEN
- FACEBOOK_PAGE_ID

---

## STEP 6 — Pinterest API Setup (free, 10 minutes)

1. Go to: https://developers.pinterest.com
2. Click "My Apps" → "Connect app"
3. Fill in app details → submit
4. After approval, go to app settings → "Generate access token"
5. Select scopes: boards:read, pins:write
6. Copy access token

Get your Board ID:
1. Open Pinterest → go to the board you want to post to
2. The URL looks like: pinterest.com/yourusername/board-name
3. Or use the API: curl -H "Authorization: Bearer YOUR_TOKEN" \
   https://api.pinterest.com/v5/boards
4. Copy the "id" of your target board

Save:
- PINTEREST_ACCESS_TOKEN
- PINTEREST_BOARD_ID

---

## STEP 7 — Deploy to Render.com (free, 10 minutes)

1. Push code to GitHub:
   git init
   git add .
   git commit -m "Social media agent"
   git remote add origin https://github.com/yourusername/social-agent.git
   git push -u origin main

2. Go to: https://render.com → sign up free
3. Click "New" → "Web Service"
4. Connect your GitHub account → select your repo
5. Settings:
   - Name: social-media-agent
   - Runtime: Node
   - Build Command: npm install && npm run build
   - Start Command: npm start
6. Click "Advanced" → add all environment variables from .env
7. Click "Create Web Service"
8. Wait ~3 minutes for deployment
9. Copy your app URL: https://social-media-agent-xxxx.onrender.com

---

## STEP 8 — Register Telegram Webhook (1 minute)

After deploying to Render, set BASE_URL in Render environment variables.
Then visit this URL in your browser:
https://your-app.onrender.com/setup/webhook

You should see: {"success": true}

Test it by sending your bot a message!

---

## STEP 9 — Setup Cron Jobs at cron-job.org (5 minutes)

1. Go to: https://cron-job.org → create free account
2. Create Job 1 — Morning Previews:
   - URL: https://your-app.onrender.com/trigger/morning
   - Schedule: Every day at 08:00 (your local timezone)
   - Enable: Yes

3. Create Job 2 — Keep Server Alive (prevents Render from sleeping):
   - URL: https://your-app.onrender.com/health
   - Schedule: Every 14 minutes
   - Enable: Yes

---

## STEP 10 — Start Using It!

Send this to your Telegram bot every night before bed:
"Brief: Tomorrow I want to post about productivity tips for remote workers. Include actionable advice and motivational content."

At 8am the next morning you'll receive:
- LinkedIn preview with image
- Facebook preview with image
- Pinterest preview with image

Reply with:
- "approve all" → posts to all 3 platforms immediately
- "approve linkedin" → posts only to LinkedIn
- "edit facebook: add more emojis and a question" → regenerates that post
- "status" → see what's been posted today

---

## PROJECT STRUCTURE
```
social-media-agent/
├── src/
│   ├── index.ts              # Express server + routing
│   ├── agent.ts              # Main orchestrator logic
│   ├── telegram.ts           # Send/receive Telegram messages
│   ├── content-generator.ts  # Gemini AI content generation
│   ├── image-generator.ts    # Pollinations.ai image generation
│   ├── database.ts           # Supabase database + storage
│   └── platforms.ts          # LinkedIn, Facebook, Pinterest APIs
├── public/images/            # Local image cache
├── package.json
├── tsconfig.json
└── .env
```

---

## TROUBLESHOOTING

Problem: Bot not responding
Fix: Check webhook is set → visit /setup/webhook endpoint

Problem: Images not generating
Fix: Pollinations.ai can be slow. Timeout is 60 seconds. Try again.

Problem: LinkedIn posting fails
Fix: Token may have expired (60-day limit). Regenerate via OAuth flow.

Problem: Render app sleeping
Fix: Make sure the keep-alive cron job at cron-job.org is active

Problem: Gemini returning invalid JSON
Fix: This is rare. Just send the brief again.

---

## DAILY COST BREAKDOWN
- Telegram Bot API: $0 (unlimited)
- Gemini 1.5 Flash: $0 (1M tokens/day free)
- Pollinations.ai images: $0 (unlimited)
- Supabase: $0 (500MB free)
- Render.com: $0 (free tier)
- cron-job.org: $0 (unlimited free)
- LinkedIn API: $0
- Facebook API: $0
- Pinterest API: $0

TOTAL: $0/month
