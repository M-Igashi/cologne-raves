# Cologne Raves 🕺🌃

[![Deployment](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Workers-orange)](https://cologne.ravers.workers.dev)
[![Built with](https://img.shields.io/badge/Built%20with-Astro-purple)](https://astro.build/)
[![Community](https://img.shields.io/badge/Community-Driven-green)](https://github.com/M-Igashi/cologne-raves/pulls)

This is the repository behind [cologne.ravers.workers.dev](https://cologne.ravers.workers.dev) — a community-powered electronic music event calendar for the Cologne/Köln area.

We use [Astro](https://astro.build/) to build and deploy the site statically via Cloudflare Workers, and GitHub Pull Requests to manage event data contributed by the community.

---

## 🎵 About Cologne Raves

Cologne Raves is a volunteer-run, ad-free platform that helps you discover the best techno and electronic music events in Cologne. Maintained by a passionate WhatsApp raver community, we provide:

- 📅 **Weekly Event Guide**: Curated list of upcoming parties
- 🎛️ **Complete Event Details**: Venues, lineups, times, and tickets
- 🌐 **Community-Driven**: Submit your own events via our simple form
- 🍪 **Privacy-First**: No cookies, no tracking, just music
- ⚡ **Lightning Fast**: Static site hosted on Cloudflare's edge network

---

## 🗓 What You Can Do

- Submit party or live music events happening in and around Cologne
- All events are published on the site:
  - **This Week**: Homepage shows this week's events (Mon–Sun, shown after Monday 13:00 CET)
  - **All Parties**: Full listing across all dates

---

## 🔄 How to Contribute Events

### Option 1: Easy Form Submission (Recommended) ✨

1. **Go to the [Event Submission Form](https://cologne.ravers.workers.dev/form/)**
2. Fill out event details (up to 4 events at once)
3. Click "Create Pull Request"
4. The form will automatically create a GitHub Pull Request for you
5. Once approved and merged, your events will appear on the site

> 🎉 No GitHub experience needed! The form handles everything for you.

### Option 2: Manual GitHub Workflow

1. **Create a new branch** from `main` in this repository  
   (e.g. `add-2025-04-bootshaus`)
2. Add or edit a `.json` file inside the `/data/` folder  
   Each file should contain an array of party objects (see format below)
3. Open a **Pull Request** (PR) into `main` from your branch

> ✅ You do not need to fork this repository — it's public, and branching is preferred.

---

## 📁 File Format

Each `.json` file must contain an **array of event objects** like this:

```json
[
  {
    "id": "optional-custom-id",
    "venue": "Bootshaus",
    "date": "2025-04-11",
    "title": "Kaytranada",
    "artists": ["Kaytranada"],
    "startTime": "23:00",
    "url": "https://ra.co/events/2061225"
  }
]
```

### Required fields:
- `venue` (string) - Event venue name
- `date` (string in `YYYY-MM-DD` format) - Event date
- `title` (string) - Event title/name
- `startTime` (24h format `HH:mm`) - Door opening time

### Optional fields:
- `artists` (array of strings) - List of performing artists/DJs
- `url` (string) - Link to event page or ticket shop
- `id` (string) - Unique identifier (auto-generated if omitted)

---

## 🔢 Event ID & Updates

### ⚠️ **IMPORTANT: How to use Event IDs**

#### **For NEW events:**
- **Leave the ID field EMPTY** - an ID will be automatically generated
- Do NOT create your own ID

#### **For UPDATING existing events:**
- Find the event ID in the top-right corner of the event card (e.g. `#be790c46`)
- **Remove the `#` symbol** and enter only the ID (e.g. `be790c46`)
- Using the correct ID will update the existing event instead of creating a duplicate

> 💡 The [Event Submission Form](https://cologne.ravers.workers.dev/form/) has clear instructions and handles this automatically.

---

## 🧠 Guidelines for the `/data` folder

- All event data must be placed in `.json` files under the `/data/` directory
- Each file should contain an **array of event objects**
- Use one file per batch (e.g. single event or 100 events)
- Recommended naming convention:  
  `YYYY-MM-cologne-DD.json`  
  Example: `2025-04-cologne-08.json`
- If editing or overwriting an existing event, ensure the correct `id` is included

---

## 🚀 Deployment

The site is automatically deployed to:

👉 **[https://cologne.ravers.workers.dev](https://cologne.ravers.workers.dev)**

via Cloudflare Workers after each PR merge into `main`.

### Tech Stack:
- **Framework**: Astro (Static Site Generator)
- **Styling**: Tailwind CSS
- **Hosting**: Cloudflare Workers (Edge Computing)
- **CI/CD**: GitHub Actions
- **Data**: JSON files + GitHub Pull Requests

---

## 🛠️ Local Development

```bash
# Clone the repository
git clone https://github.com/M-Igashi/cologne-raves.git
cd cologne-raves

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare Workers
npm run deploy
```

---

## 📊 SEO & Performance

Our site is optimized for search engines and performance:

- ✅ **Lighthouse Score**: 100/100 Performance
- ✅ **Core Web Vitals**: All metrics in green
- ✅ **Schema.org**: Structured data for events
- ✅ **Sitemap**: Auto-generated with priorities
- ✅ **Open Graph**: Rich social media previews
- ✅ **Mobile-First**: Responsive design

---

## 🤝 Community

This project is maintained by the Cologne Ravers WhatsApp Community. We're always looking for contributors!

### Ways to Help:
- 📝 Submit events via the form
- 🐛 Report bugs or suggest features
- 💻 Contribute code improvements
- 🎨 Design enhancements
- 📢 Spread the word

---

## 📜 License

This project is open source and available for the community. Feel free to contribute!

---

## 🔗 Links

- **Website**: [cologne.ravers.workers.dev](https://cologne.ravers.workers.dev)
- **Submit Events**: [Event Form](https://cologne.ravers.workers.dev/form/)
- **GitHub**: [M-Igashi/cologne-raves](https://github.com/M-Igashi/cologne-raves)

---

Made with ❤️ by the Cologne Rave Community