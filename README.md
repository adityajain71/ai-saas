# Smart Task Evaluator

A SaaS application built with Next.js 14, TypeScript, and Tailwind CSS for intelligent task evaluation and management.

## Features

- Modern Next.js 14 App Router architecture
- TypeScript for type safety
- Tailwind CSS for styling
- Responsive design
- Clean, minimal SaaS UI

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
app/
├── layout.tsx          # Root layout with navbar
├── page.tsx           # Landing page
├── login/             # Login page
├── signup/            # Signup page  
├── dashboard/         # User dashboard
└── task/
    ├── new/           # Create new task
    └── [id]/
        ├── page.tsx   # Task details
        └── pay/       # Payment page
```

## Routes

- `/` - Landing page
- `/login` - User login
- `/signup` - User registration
- `/dashboard` - User dashboard
- `/task/new` - Create new task
- `/task/[id]` - Task details
- `/task/[id]/pay` - Payment processing

## Technologies

- Next.js 14
- TypeScript
- Tailwind CSS
- ESLint