# Cologne Raves 🕺🌃

This is the repository behind [cologne-raves.pages.dev](https://cologne-raves.pages.dev) — a community-powered party calendar for the Cologne area.

We use [Astro](https://astro.build/) to build and deploy the site statically, and GitHub Pull Requests to manage event data contributed by the community.

---

## 🗓 What You Can Do

- Submit party or live music events happening in and around Cologne
- All events are published on the site:
  - **This Weekend**: Homepage shows upcoming weekend events
  - **All Parties**: Full listing across all dates

---

## 🔄 How to Contribute Events

1. **Fork this repository** (or create a new branch if you have write access)
2. Add or edit a `.json` file inside the `/data/` folder
3. Open a **Pull Request** (PR)

Once your PR is merged, the website will automatically rebuild and display your events.

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

---

## 🔢 Event ID & Updates

- You can **assign an `id` manually** to make the event editable in future PRs.
- If no `id` is given, one will be **automatically generated** using a hash of the `venue`, `title`, and `date`.
- This ID is displayed in the corner of each event card (e.g., `#e67c76e1`)
- You can update an existing event by submitting a new one with the **same `id`**.

---

## ✅ Validation on PRs

Each pull request will automatically trigger a GitHub Action that:
- Validates each JSON file against the schema (`event.schema.json`)
- Ensures required fields are present and well-formed

### Schema Validation Includes:
- Date format: `YYYY-MM-DD`
- Time format: `HH:mm`
- URL must be valid if provided
- `artists` must be a non-empty array if included

If validation fails, the PR will be blocked with an error message.

---

## 💡 Tips for Contributors

- Use clear, concise event titles
- Stick to one `.json` file per submission
- File naming convention suggestion: `2025-04-bootshaus.json`, `2025-05-underground.json`, etc.
- Avoid duplicating the same event across files

---

## 🚀 Deployment

The site is automatically deployed to:

👉 **[https://cologne-raves.pages.dev](https://cologne-raves.pages.dev)**

via Cloudflare Pages after each PR merge into `main`.

---

## 🙏 Credits

Community project maintained by volunteers.  
Powered by Astro + GitHub + JSON + ❤️
