# Applied Robotics Lab — Landing Page

Static marketing website for Applied Robotics Lab (ARL).

## Tech Stack

- **Framework**: [Astro 5](https://astro.build) — static site generation
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com)
- **Content**: Markdown + YAML frontmatter (Astro Content Collections)
- **Deployment**: Static output → Caddy web server

## Quick Start

```bash
npm install
npm run dev        # Dev server at http://localhost:4321
npm run build      # Build to ./dist/
npm run preview    # Preview production build
```

## Project Structure

```
src/
├── content/
│   ├── products/       # Product Markdown files
│   ├── research/       # Research Markdown files
│   └── config.ts       # Content collection schemas
├── lib/
│   ├── content.ts      # Content access layer (queries)
│   └── site.ts         # Navigation config + site settings
├── components/
│   ├── Header.astro
│   ├── Footer.astro
│   └── home/           # Home page sections
├── layouts/
│   ├── BaseLayout.astro
│   └── PageLayout.astro
├── pages/
│   ├── index.astro
│   ├── products/
│   │   ├── index.astro
│   │   └── [slug].astro
│   ├── research/
│   │   ├── index.astro
│   │   └── [slug].astro
│   ├── solutions/index.astro
│   ├── about.astro
│   ├── contact.astro
│   └── ...
└── styles/
    └── global.css
```

## Adding Content

### New Product

1. Create `src/content/products/your-product.md`
2. Add required frontmatter (see `src/content/config.ts` for schema)
3. Set `published: true` to make it visible
4. Set `featured: true` to show on home page
5. Run `npm run build` — page generated automatically at `/products/your-product`

### New Research Item

1. Create `src/content/research/your-research.md`
2. Add required frontmatter (type, topics, summary, etc.)
3. Set `published: true` to make it visible
4. Run `npm run build` — page generated automatically at `/research/your-research`

## Site Configuration

Edit `src/lib/site.ts` to update:
- Site name, description, email, GitHub URL
- Navigation links and dropdown items
- Footer link columns

## Design System

Colors and component classes are defined in:
- `tailwind.config.mjs` — color palette tokens
- `src/styles/global.css` — component classes (`.btn-primary`, `.card`, `.badge-*`, etc.)

### Color Palette

| Token | Hex | Use |
|-------|-----|-----|
| Navy 900 | `#0A0F1E` | Page background |
| Electric 500 | `#3B82F6` | Primary brand / interactive |
| Spark 500 | `#F97316` | CTAs / energy accents |
| Cyan | `#06B6D4` | Secondary highlights |

## Deployment

Build generates static HTML in `./dist/`. Serve with Caddy:

```caddyfile
arl.lab {
  root * /var/www/arl-landing/dist
  file_server
  try_files {path} /404.html
}
```

## Environment Variables (for Contact API — Phase 3)

Create a `.env` file (never commit to git):

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-password
CONTACT_EMAIL=hello@arl.lab
```
