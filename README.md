# Norman — Internal Operations Dashboard

A modern, highly polished internal dashboard built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, **NextAuth.js v5 (Auth.js)**, and **TanStack Query**.

---

## ✨ Features

- 🔐 **Google SSO** — Full authentication via NextAuth.js. All dashboard routes are protected by middleware.
- 📊 **QuickBooks Widget** — Income Planner showing projected vs actual monthly cash flow with KPI cards.
- 📋 **Monday.com Widget** — Leads Summary with pipeline value, status badges, and assignees.
- 📝 **Notion Widget** — Action Items & Notes with priority indicators, type tags, and completion status.
- 🔄 **Auto-refresh** — All widgets refresh every 5 minutes via TanStack Query. Manual refresh via the top bar.
- 🎨 **Dark mode ready** — Full dark mode support via Tailwind CSS.
- 🧩 **Modular** — Each widget is an independent Client Component. Easy to add, remove, or rearrange.

---

## 🗂 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   # NextAuth route handler
│   │   ├── quickbooks/route.ts           # QuickBooks API stub
│   │   ├── monday/route.ts               # Monday.com API stub
│   │   └── notion/route.ts               # Notion API stub
│   ├── dashboard/
│   │   ├── layout.tsx                    # Dashboard shell (sidebar + main)
│   │   └── page.tsx                      # Main dashboard page
│   ├── login/
│   │   └── page.tsx                      # Login page (Google SSO)
│   ├── layout.tsx                        # Root layout (Providers wrapper)
│   └── page.tsx                          # Root redirect → /dashboard
├── components/
│   ├── dashboard/
│   │   ├── sidebar.tsx                   # Fixed left sidebar with nav
│   │   ├── topbar.tsx                    # Top header bar
│   │   └── widgets/
│   │       ├── quickbooks-widget.tsx     # QuickBooks Income Planner
│   │       ├── monday-widget.tsx         # Monday.com Leads Summary
│   │       └── notion-widget.tsx         # Notion Action Items
│   ├── ui/                               # shadcn/ui components
│   └── providers.tsx                     # TanStack Query + SessionProvider
├── lib/
│   ├── auth.ts                           # NextAuth configuration
│   ├── query-client.ts                   # TanStack Query client factory
│   └── utils.ts                          # cn() utility (shadcn)
└── middleware.ts                          # Route protection middleware
```

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd norman
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.local.example .env.local
```

Then open `.env.local` and fill in your credentials (see the [Environment Variables](#-environment-variables) section below).

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page.

---

## 🔑 Environment Variables

Copy `.env.local.example` to `.env.local` and fill in each value:

### NextAuth (Required to run)

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Random secret — run `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your app URL (e.g. `http://localhost:3000`) |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret |

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → **APIs & Services** → **Credentials**
3. **Create OAuth 2.0 Client ID** (Web application)
4. Add Authorized redirect URI:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
5. Copy the Client ID and Secret into `.env.local`

### QuickBooks (for Income Planner widget)

| Variable | Description |
|---|---|
| `QUICKBOOKS_CLIENT_ID` | From [developer.intuit.com](https://developer.intuit.com/) |
| `QUICKBOOKS_CLIENT_SECRET` | From [developer.intuit.com](https://developer.intuit.com/) |
| `QUICKBOOKS_REFRESH_TOKEN` | OAuth2 refresh token (from OAuth Playground) |
| `QUICKBOOKS_REALM_ID` | Your company ID (shown in OAuth Playground) |
| `QUICKBOOKS_SANDBOX` | `"true"` for sandbox, `"false"` for production |

### Monday.com (for Leads widget)

| Variable | Description |
|---|---|
| `MONDAY_API_KEY` | Personal API token from Monday.com → Profile → Developers |
| `MONDAY_BOARD_ID` | Board ID from the board URL: `monday.com/boards/{ID}` |

### Notion (for Action Items widget)

| Variable | Description |
|---|---|
| `NOTION_API_KEY` | Internal Integration Token from [notion.so/my-integrations](https://www.notion.so/my-integrations) |
| `NOTION_DATABASE_ID` | 32-char hex ID from your database URL |

---

## 🔌 Connecting Real APIs

Each API route is in `src/app/api/`. They currently return **mock data** so you can see the UI immediately. To connect real data:

### QuickBooks
Open `src/app/api/quickbooks/route.ts` and replace the mock data block with the commented-out QuickBooks REST API calls. You'll need the `node-quickbooks` package or direct `fetch` calls.

### Monday.com
Open `src/app/api/monday/route.ts` and replace the mock data block with the commented-out GraphQL query. The Monday.com API uses GraphQL at `https://api.monday.com/v2`.

### Notion
Open `src/app/api/notion/route.ts` and replace the mock data block with the commented-out Notion SDK calls. Install the official SDK first:

```bash
npm install @notionhq/client
```

---

## 🛠 Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| Next.js | 16 | Framework (App Router) |
| React | 19 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Styling |
| shadcn/ui | latest | UI components |
| NextAuth.js | v5 beta | Authentication |
| TanStack Query | v5 | Client-side data fetching |
| Lucide React | latest | Icons |

---

## 📦 Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.local.example` in the Vercel dashboard
4. Update `NEXTAUTH_URL` to your production domain
5. Update the Google OAuth redirect URI to your production domain
6. Deploy!

---

## 📄 License

Private — internal use only.
