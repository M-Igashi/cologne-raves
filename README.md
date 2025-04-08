# Cologne Raves 🕺🌃

This is the repository behind [cologne-raves.pages.dev](https://cologne-raves.pages.dev) — a community-powered party calendar for the Cologne area.

We use [Astro](https://astro.build/) to build and deploy the site statically, and GitHub Pull Requests to manage event data contributed by the community.

---

## 🗓 What You Can Do

- Submit party or live music events happening in and around Cologne
- All events are published on the site:
  - **This Week**: Homepage shows this week's events (Mon–Sun, shown after Monday 13:00 CET)
  - **All Parties**: Full listing across all dates
- Use the [Event JSON Generator](https://cologne-raves.pages.dev/form/) to easily create or update `.json` files

---

## 🔄 How to Contribute Events

1. **Create a new branch** from `main` in this repository  
   (e.g. `add-2025-04-bootshaus`)
2. Add or edit a `.json` file inside the `/data/` folder  
   Each file should contain an array of party objects (see below)
3. Open a **Pull Request** (PR) into `main` from your branch

Once your PR is merged, the website will automatically rebuild and display your events.

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
- `venue` (string)
- `date` (string in `YYYY-MM-DD` format)
- `title` (string)
- `startTime` (24h format `HH:mm`)

### Optional fields:
- `artists` (array of strings)
- `url` (link to event page or ticket)
- `id` (string – if omitted, it will be auto-generated)

---

## 🔢 Event ID & Updates

- To **update an existing event**, include the **same `id`** as the one currently in use.
- IDs are shown in the corner of each event card (e.g. `#be790c46`)
- When using the form at [/form/](https://cologne-raves.pages.dev/form/), enter this ID **without the `#` symbol** (e.g. `be790c46`)
- If no ID is specified, one will be generated automatically

---

## 🧠 Guidelines for the `/data` folder

- All event data must be placed in `.json` files under the `/data/` directory
- Each file should contain an **array of event objects**
- Use one file per batch (e.g. 1–4 events max)
- Recommended naming convention:  
  `YYYY-MM-cologne-DD.json`  
  Example: `2025-04-cologne-08.json`
- If editing or overwriting an existing event, ensure the correct `id` is included

---

## 🚀 Deployment

The site is automatically deployed to:

👉 **[https://cologne-raves.pages.dev](https://cologne-raves.pages.dev)**

via Cloudflare Pages after each PR merge into `main`.
