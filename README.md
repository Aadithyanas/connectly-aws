# Connectly

Connectly is a premium, real-time professional networking platform designed to bridge the gap between aspiring students and verified industry mentors. Built with a focus on real-world growth and secure communication, it offers a seamless space for career-shaping conversations.

![Connectly Preview](https://github.com/user-attachments/assets/your-preview-image-link) *<!-- Replace with a real image link if available -->*

## 🚀 Overview

Connectly provides a high-performance environment where users can share professional insights, join specialized communities, and engage in direct mentorship. Whether you're a student looking for guidance or a professional eager to give back, Connectly simplifies the connection process through a modern, mobile-first interface.

### Key Features

- **Real-time Messaging**: Instant communication powered by Supabase Realtime with support for media sharing (images/videos).
- **Discovery Feed**: A professional "Horizon Platform" to share achievements, career updates, and industry insights.
- **Verified Mentorship**: Connect with experts from top companies, vetted for quality and trust.
- **Community Groups**: Join or create specialized groups for focused discussions on specific tech domains or interests.
- **Initiative Updates**: Share and view short-term status updates to keep your network informed of your progress.
- **Interactive Global Reach**: A dynamic D3.js powered globe visualization of the network.
- **Secure & Robust**: Built with Supabase Row Level Security (RLS) and end-to-end considerations to keep user data private.

## 🛠️ Tech Stack

Connectly utilizes a cutting-edge tech stack to ensure performance, scalability, and a premium user experience:

- **Frontend Core**: [Next.js 16 (App Router)](https://nextjs.org/) & [React 19](https://react.dev/)
- **Programming Language**: [TypeScript](https://www.typescriptlang.org/)
- **Backend & Database**: [Supabase](https://supabase.com/) (Auth, PostgreSQL, Real-time, Edge Functions)
- **Styling & Animations**: [Tailwind CSS 4](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [Lucide React Icons](https://lucide.dev/)
- **Data Visualization**: [D3.js](https://d3js.org/) & [TopoJSON](https://github.com/topojson/topojson)
- **Media Management**: [Cloudinary](https://cloudinary.com/)
- **Email Services**: [Resend](https://resend.com/)
- **UI Components**: [Sonner](https://sonner.stevenly.com/) (Toasts), Emoji Picker React, React Simple Code Editor

## 📦 Getting Started

### Prerequisites

- Node.js 20+
- npm / yarn / pnpm / bun
- A Supabase Project (for Database, Auth, and Storage)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Aadithyanas/connectly.git
   cd connectly
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory and add your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   # Add other keys as required (Cloudinary, Resend, etc.)
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🛡️ Security

- **Row Level Security (RLS)**: Database access is strictly controlled based on user identity.
- **Secure Authentication**: Managed via Supabase Auth with support for various providers.
- **Encrypted Communication**: Focused on keeping conversations private and secure.

## 🗺️ Project Structure

- `src/app`: Next.js App Router for page definitions and layouts.
- `src/components`: Reusable UI components (ChatWindow, Sidebar, Globals, etc.).
- `src/hooks`: Custom React hooks for state and logic management.
- `supabase`: Database migrations, edge functions (`notify`), and configuration.
- `public`: Static assets including images and brand logos.

---

Built with ❤️ for the future of professional networking.
