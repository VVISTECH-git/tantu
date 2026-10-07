# Saree render test (Drapify-style pipeline on Gemini)

A web page where you upload a saree photo and get catalog renders from Gemini image models.
The first render of each model is reused as the consistency anchor so the same model appears in every pose.

## Deploy to Vercel

**Option A: GitHub (no command line)**
1. Create a new private GitHub repo and upload everything in this folder.
2. In Vercel, click Add New, then Project, and import that repo. Leave Framework Preset as "Other". No build command is needed.
3. Before clicking Deploy, open Environment Variables and add:
   - `GEMINI_API_KEY`: your Gemini key.
   - `ACCESS_PASSWORD`: any password. Without it, anyone with the link can spend your Gemini credits.
4. Click Deploy and open the URL Vercel gives you.

**Option B: Vercel CLI**
```
npm i -g vercel
cd drapify-test
vercel                                 # first deploy, answer the prompts
vercel env add GEMINI_API_KEY production
vercel env add ACCESS_PASSWORD production
vercel --prod
```

Optional environment variables: `MODELS` (comma-separated Gemini model IDs), `PRICE_IN_PER_M`, `PRICE_OUT_PER_M`, `USD_INR`.
If Gemini says a model is not found, check Google's model list and set `MODELS`.

## Run locally

```
cp .env.example .env      # paste your key
npm run dev               # http://localhost:3000
```
Or use the command-line version: `node generate.js input/saree.jpg [input/blouse.jpg]`.

## How it fits Vercel's limits

- Each API call renders one pose, so no single call runs long. The function allows up to 120 seconds.
- The browser shrinks photos to 1280 px JPEG before upload to stay under Vercel's 4.5 MB request limit.
- The API key stays on the server and never reaches the browser.

Cost figures are estimates from the prices above. Check Google Cloud billing for real spend.
