# SaiMar Books & Beyond

🧠 PROJECT NAME:

Rosellea — AI Multilingual Knowledge Platform

🎯 PRODUCT VISION

Build a modern AI-powered reading and publishing platform where:

 Users can write, upload, and publish books/articles/stories

 Content is automatically translated into multiple languages

 Readers can switch languages instantly

 Content is presented in a beautiful book-like aesthetic UI

 Every user can act as both:

 ✍️ Writer

 📖 Reader

🧩 CORE SYSTEM STRUCTURE

🔐 1. AUTH SYSTEM

 Email/password login

 Google login (optional)

 After login user enters main system

🔄 2. ROLE SYSTEM (IMPORTANT)

Each user has two modes:

✍️ Writer Mode

 Create content

 Upload books (PDF)

 Write articles & stories

 Edit content anytime

 Use AI writing assistant

📖 Reader Mode

 Browse articles

 Read books (PDF viewer)

 Switch language instantly

 Open user profiles

👤 3. USER PROFILE SYSTEM (GLOBAL)

Each user has a profile:

Profile Fields:

 Name

 Username

 Profile picture

 Bio

 Preferred languages (default 5 supported)

 Interests/categories

 List of published content

Features:

 Editable profile

 Public profile view

 Shows all books + articles by that user

✍️ 4. WRITER SYSTEM

Content Types:

 📄 Article (Twitter-style post format)

 📖 Story

 📚 Book (PDF upload or long content)

AI WRITING ASSISTANT:

Gemini , Claude , OpenAI , Azure MCP models used

 Improve writing

 Fix grammar

 Expand content

 Simplify language

 Change tone (formal, storytelling, academic)

PUBLISHING FLOW:

Before publishing:

 Select category

 Select original language:

 English

 Urdu

 Pashto

 Arabic

 Turkish

🌍 AUTO TRANSLATION ENGINE (CORE FEATURE)

After publishing:
System automatically:

 Breaks content into structured text

 Stores original version

 Generates translations into:

👉 English
👉 Urdu
👉 Pashto
👉 Arabic
👉 Turkish

Each content becomes multilingual instantly.

📖 5. READER SYSTEM

📰 A. ARTICLE FEED (TWITTER STYLE)

 Scrollable feed like Twitter/LinkedIn

 Each post shows:

 Title

 Preview text

 Author name + profile

 Like / comment / save

 Language switch option

📚 B. BOOK LIBRARY

 Grid-based UI like Everand / Kindle

 Book covers shown beautifully

 Click opens PDF reader

🌍 C. MULTILINGUAL READING ENGINE

Inside every content:

 Switch language instantly (no reload)

 Same content displayed in:

 English

 Urdu

 Pashto

 Arabic

 Turkish

👤 D. USER PROFILES (PUBLIC)

When clicking any user:

 Profile page opens

 Shows:

 Profile info

 All articles

 All books

 Ratings/comments received

💬 E. ENGAGEMENT SYSTEM

 Like

 Comment

 Bookmark/save

🧠 6. AI FEATURES

AI FUNCTIONS:

 AI writing assistant

 AI content refinement

 AI translation engine (core system)

🗄️ 7. BACKEND SYSTEM (IMPORTANT)

Use scalable backend (Firebase or Supabase preferred)

DATABASE STRUCTURE:

USERS TABLE

 id

 name

 email

 profileImage

 bio

 languages

 createdAt

POSTS TABLE (ARTICLES/STORIES)

 id

 userId (author)

 title

 content

 type (article/story)

 category

 originalLanguage

 translations (json)

 likes

 comments

 createdAt

BOOKS TABLE

 id

 userId

 title

 pdfUrl

 coverImage

 category

 translations

 createdAt

COMMENTS TABLE

 id

 postId

 userId

 text

 createdAt

LIKES TABLE

 id

 userId

 postId

🧠 USER MEMORY SYSTEM (IMPORTANT UNIQUE FEATURE)

Each user has a personal memory layer:

 Saved bookmarks

 Reading history

 Preferred languages

 AI remembers writing style preferences

 Recently viewed content

Stored per user in database.

🎨 UI / UX DESIGN SYSTEM (VERY IMPORTANT)

🎨 STYLE:

 Minimal

 Premium

 Book-reading aesthetic (Everand / Kindle inspired)

 Smooth transitions

🖋 FONT:

 Primary: Poppins

🎨 COLOR THEMES:

Dark Mode:

 Background: #1e1c1c

 Accent: #7c3aed

 Text: white logo style

Light Mode:

 Background: #f1eded

 Accent: #7c3aed

 Text: black logo style

📱 UI STYLE:

 Book cover cards at top

 Soft shadows

 Rounded cards

 Smooth animations

 Clean spacing

 Premium reading feel

⚡ SPLASH SCREEN (IMPORTANT)

4-SECOND SPLASH SCREEN:

 Background fade animation

 Logo appears with smooth zoom-in

 Tagline appears:

“Knowledge Beyond Language”

 Subtle glow animation

 Transition into login/home screen

🏠 HOME SCREEN DESIGN

 Hero section with book-style visuals

 Trending books carousel at top

 Articles feed below

 Category filters

 Clean premium layout

🔄 NAVIGATION BAR

Bottom or top nav:

 Home

 Articles

 Books

 Profile

🔥 CORE PRODUCT STATEMENT

SaiMar is an AI-powered multilingual knowledge platform where users can write, publish, and read content in any language with instant AI translation and book-like reading experience.

🚀 FINAL INSTRUCTION FOR LOVABLE

Build this as a fully functional SaaS MVP with:

 Clean modular architecture

 Scalable database design

 Beautiful UI (Everand-style book aesthetic)

 Smooth animations

 Fully working writer-reader system

 AI translation layer

 Profile-based content system

📌 NOTE

 Use uploaded logos for branding

 Apply consistent design system

 Ensure mobile responsiveness

 Optimize for readability and book-like experience

**Live app**: https://rosellea.vercel.app

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
