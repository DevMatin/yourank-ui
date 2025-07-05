# 💡 YouRank AI

Die Open-Source KI-Chat-App – einfach, schnell, modern.


---

## 🚀 Demo

Testen: [https://yourank-ui.vercel.app](https://yourank-ui.vercel.app)

---

## ⚡ Quickstart (lokal)

1️⃣ **Repository klonen**
git clone https://github.com/dein-account/yourank-ai.git
cd yourank-ai


2️⃣ Abhängigkeiten installieren
npm install

3️⃣ Supabase starten
(Docker + Supabase CLI nötig)
supabase start

4️⃣ .env anlegen
cp .env.local.example .env.local

Fülle die nötigen Variablen mit deinen Supabase-Daten.

5️⃣ App starten
npm run chat
➡ App läuft 

🌐 Hosting
✅ Vercel + Supabase 
1️⃣ Vercel-Projekt anlegen
2️⃣ GitHub-Repo verknüpfen
3️⃣ Umgebungsvariablen eintragen (siehe .env.local.example)
4️⃣ Deploy klicken

### Edge Config

Optional kannst du Vercel [Edge Config](https://vercel.com/docs/storage/edge-config) nutzen.
Setze dafür `EDGE_CONFIG` und hinterlege deine Keys dort.
Unsere neue `getConfig` Funktion liest zuerst aus Edge Config und greift
falls nicht vorhanden auf lokale Umgebungsvariablen zurück.

🛠 Tech Stack
Next.js (App Router)

Tailwind CSS

Supabase (Postgres + Auth + Storage)



Repository yourank-ui is a Next.js application configured to run with Supabase, Tailwind CSS and optional PWA support.

Quickstart and Tech Stack
The README outlines how to run the project locally and highlights the main technologies:

1  # 💡 YouRank AI
...
16  1️⃣ **Repository klonen**
17  git clone https://github.com/dein-account/yourank-ai.git
...
21  2️⃣ Abhängigkeiten installieren
22  npm install
...
33  5️⃣ App starten
34  npm run chat
...
37  🌐 Hosting
38  ✅ Vercel + Supabase
...
44  🛠 Tech Stack
45  Next.js (App Router)
47  Tailwind CSS
49  Supabase (Postgres + Auth + Storage)

Project Configuration
next.config.js enables PWA support and bundle analysis. It also whitelists specific hosts for images:

1  const withBundleAnalyzer = require("@next/bundle-analyzer")({
2    enabled: process.env.ANALYZE === "true"
})
...
9  module.exports = withBundleAnalyzer(
10    withPWA({
11      reactStrictMode: true,
12      images: {
13        remotePatterns: [
15          { protocol: "http", hostname: "localhost" },
18          { protocol: "http", hostname: "127.0.0.1" },
23          { protocol: "https", hostname: "**" }
        ]
      },
28      experimental: {
29        serverComponentsExternalPackages: ["sharp", "onnxruntime-node"]
      }
    })
)

The project is styled with Tailwind CSS. tailwind.config.ts shows custom colors (including brandbutton and brand) and defines content paths for the app:

1  /** @type {import('tailwindcss').Config} */
2  module.exports = {
3    darkMode: ['class'],
4    content: [
5      './pages/**/*.{ts,tsx}',
6      './components/**/*.{ts,tsx}',
7      './app/**/*.{ts,tsx}',
8      './src/**/*.{ts,tsx}'
...
56        brandbutton: {
57          DEFAULT: '#35a7ae', // z.B. dein individuelles Blau
58          dark: '#6ee7b7'
        },
60        brand: {
61          DEFAULT: '#144c41', // z.B. dein individuelles Blau
62          dark: '#6ee7b7'
        }
...
87    plugins: [
88      require('tailwindcss-animate'),
89      require('@tailwindcss/typography')
    ]
  }

Build and Development Scripts
package.json defines scripts for starting Supabase and running the Next.js dev server. It also includes database helper scripts:

6      "chat": "supabase start && npm run db-types && npm run dev",
7      "restart": "supabase stop && npm run chat",
8      "update": "git pull origin main && npm run db-migrate && npm run db-types",
...
21      "db-reset": "supabase db reset && npm run db-types",
22      "db-migrate": "supabase migration up && npm run db-types",
23      "db-types": "supabase gen types typescript --local > supabase/types.ts",
24      "db-pull": "supabase db remote commit",
25      "db-push": "supabase db push",
26      "test": "jest"

Middleware and Routing
middleware.ts integrates i18n routing and redirects authenticated users to their workspace:

6  export async function middleware(request: NextRequest) {
7    const i18nResult = i18nRouter(request, i18nConfig)
8    if (i18nResult) return i18nResult
...
15    const redirectToChat = session && request.nextUrl.pathname === "/"
17    if (redirectToChat) {
18      const { data: homeWorkspace, error } = await supabase
19        .from("workspaces")
20        .select("*")
21        .eq("user_id", session.data.session?.user.id)
22        .eq("is_home", true)
23        .single()
...
29        return NextResponse.redirect(
30          new URL(`/${homeWorkspace.id}/chat`, request.url)
        )
      }
...
44  export const config = {
45    matcher: "/((?!api|static|.*\\..*|_next|auth).*)"
}

Database Access Layer
Example file db/workspaces.ts defines helper functions to manage workspaces via Supabase:

4  export const getHomeWorkspaceByUserId = async (userId: string) => {
5    const { data: homeWorkspace, error } = await supabase
6      .from("workspaces")
7      .select("*")
8      .eq("user_id", userId)
9      .eq("is_home", true)
10      .single()
...
47  export const createWorkspace = async (
48    workspace: TablesInsert<"workspaces">
) => {
50    const { data: createdWorkspace, error } = await supabase
51      .from("workspaces")
52      .insert([workspace])
53      .select("*")
54      .single()
...
81  export const deleteWorkspace = async (workspaceId: string) => {
82    const { error } = await supabase
83      .from("workspaces")
84      .delete()
85      .eq("id", workspaceId)
...
91    return true
}

Application Context
Global state for the UI is handled via React context (context/context.tsx). It stores user profile, assistants, chats, tools, and other UI states:

15  interface ChatbotUIContext {
16    // PROFILE STORE
17    profile: Tables<"profiles"> | null
18    setProfile: Dispatch<SetStateAction<Tables<"profiles"> | null>>
...
41    envKeyMap: Record<string, VALID_ENV_KEYS>
44    setEnvKeyMap: Dispatch<SetStateAction<Record<string, VALID_ENV_KEYS>>>
...
83    abortController: AbortController | null
84    setAbortController: Dispatch<SetStateAction<AbortController | null>>
...
131    sourceCount: number
132    setSourceCount: Dispatch<SetStateAction<number>>
...
261    selectedTools: Tables<"tools">[]
262    setSelectedTools: Dispatch<SetStateAction<Tables<"tools">[]>>
263    toolInUse: "none"
264    setToolInUse: Dispatch<SetStateAction<string>>
}

Retrieval Endpoints
Under app/api/retrieval, the API supports embedding uploaded files and fetching relevant chunks:

Process a file (process/route.ts): verifies file ownership, generates embeddings (OpenAI or local), and stores them in Supabase.

Retrieve relevant content (retrieve/route.ts): computes an embedding for the user’s query and selects matching chunks from stored file items.

Key code excerpt from process/route.ts:

18      const supabaseAdmin = createClient<Database>(
19        await getConfig("NEXT_PUBLIC_SUPABASE_URL"),
20        await getConfig("SUPABASE_SERVICE_ROLE_KEY")
      )
...
61      if (embeddingsProvider === "openai") {
62        try {
63          if (profile.use_azure_openai) {
64            checkApiKey(profile.azure_openai_api_key, "Azure OpenAI")
...
76      let chunks: FileItemChunk[] = []
...
95          return new NextResponse("Unsupported file type", {
96            status: 400
          })
...
140      const file_items = chunks.map((chunk, index) => ({
141        file_id,
142        user_id: profile.user_id,
...
155      await supabaseAdmin.from("file_items").upsert(file_items)

Key code excerpt from retrieve/route.ts:

7  export async function POST(request: Request) {
8    const json = await request.json()
9    const { userInput, fileIds, embeddingsProvider, sourceCount } = json as {
...
26      if (embeddingsProvider === "openai") {
27        if (profile.use_azure_openai) {
28          checkApiKey(profile.azure_openai_api_key, "Azure OpenAI")
...
51      if (embeddingsProvider === "openai") {
52        const response = await openai.embeddings.create({
53          model: "text-embedding-3-small",
54          input: userInput
        })
...
88      const mostSimilarChunks = chunks?.sort(
89        (a, b) => b.similarity - a.similarity
      )
92      return new Response(JSON.stringify({ results: mostSimilarChunks }), {
93        status: 200
      })


