# Vizzy Chat — React + MongoDB + Gemini

> Conversational multimodal creative platform

---

## Project Structure

```
vizzy-chat/
├── index.html
├── vite.config.js
├── package.json              ← Frontend deps
├── .env.example
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── store/
│   │   └── useStore.js       ← Zustand global state
│   ├── hooks/
│   │   └── useChat.js        ← All chat logic
│   ├── services/
│   │   └── api.js            ← API calls
│   ├── pages/
│   │   └── ChatPage.jsx
│   ├── components/
│   │   ├── Sidebar/
│   │   ├── Header/
│   │   ├── Welcome/
│   │   ├── Chat/             ← Thread, Bubble, Suggestions
│   │   ├── ImageGrid/
│   │   └── Input/
│   └── styles/
│       ├── tokens.css
│       └── global.css
└── backend/
    ├── server.js             ← Express + Gemini + MongoDB
    ├── package.json
    ├── db/connect.js
    ├── models/               ← Mongoose schemas
    │   ├── User.js
    │   ├── Conversation.js
    │   ├── Asset.js
    │   └── GenerationJob.js
    └── services/
        ├── gemini.js         ← Vizzy AI persona
        └── imageGen.js       ← Image generation router
```

---

## Quick Start

### Step 1 — Get your free Gemini API key
1. Go to https://aistudio.google.com/app/apikey
2. Click **Create API Key**
3. Copy it — it starts with `AIza...`

### Step 2 — Set up MongoDB
**Option A — Local (free)**
```bash
# Install MongoDB: https://www.mongodb.com/try/download/community
# Then start it:
mongod --dbpath ~/data/db
```

**Option B — MongoDB Atlas (free cloud)**
1. Go to https://www.mongodb.com/atlas
2. Create a free cluster
3. Get your connection string: `mongodb+srv://...`

### Step 3 — Configure environment
```bash
# Frontend
cp .env.example .env.local
# Fill in: VITE_API_URL=http://localhost:3001/api

# Backend
cp .env.example backend/.env
# Fill in: GEMINI_API_KEY, MONGODB_URI
```

### Step 4 — Install and run

**Frontend:**
```bash
npm install
npm run dev
# Opens at http://localhost:3000
```

**Backend:**
```bash
cd backend
npm install
npm run dev
# Runs at http://localhost:3001
```

---

## Key Files to Know

| File | What it does |
|---|---|
| `src/hooks/useChat.js` | All chat logic — send, stream, poll jobs |
| `src/store/useStore.js` | Global state (Zustand) — mode, messages, memory |
| `backend/services/gemini.js` | Vizzy AI persona + Gemini streaming |
| `backend/services/imageGen.js` | Image generation router (DALL-E / Replicate / placeholder) |
| `backend/models/` | All MongoDB schemas |

---

## Adding Real Image Generation

In `backend/services/imageGen.js`, add your key to `.env` and the right case activates automatically:

- `OPENAI_API_KEY` → DALL-E 3
- `REPLICATE_API_KEY` → Flux Schnell (free tier available)
- `STABILITY_API_KEY` → Stability AI
- No key → placeholder images (Picsum) for development

---

## Deployment

**Frontend → Vercel**
```bash
npm run build
vercel deploy dist/
```

**Backend → Railway**
```bash
# Push to GitHub, connect Railway, set env vars in dashboard
```

**Backend → Render (free tier)**
- Connect GitHub repo
- Build command: `npm install`
- Start command: `node backend/server.js`
- Add env vars in dashboard

---

## Free Tier Limits (Gemini 1.5 Flash)

| Limit | Value |
|---|---|
| Requests per minute | 15 |
| Requests per day | 1,500 |
| Tokens per minute | 1,000,000 |
| Cost | Free |

For production scale, upgrade to Gemini 1.5 Pro or add pay-as-you-go billing.
