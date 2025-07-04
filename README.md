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

🛠 Tech Stack
Next.js (App Router)

Tailwind CSS

Supabase (Postgres + Auth + Storage)

