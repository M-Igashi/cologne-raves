
# Cologne Raves 🕺🌃

This is the repository behind [cologne-raves.pages.dev](https://cologne-raves.pages.dev) — a community-powered party calendar for the Cologne area.

We use [Astro](https://astro.build/) to build and deploy the site statically, and GitHub Pull Requests to manage event data contributed by the community.

---

## 🗓 What You Can Do

- Submit party or live music events happening in and around Cologne
- All events are published on the site:
  - **This Week**: Homepage shows this week's events (Mon–Sun, shown after Monday 13:00 CET)
  - **All Parties**: Full listing across all dates

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

- You can **assign an `id` manually** to make the event editable in future PRs.
- If no `id` is given, one will be **automatically generated** using a hash of the `venue`, `title`, and `date`.
- This ID is displayed in the corner of each event card (e.g., `#e67c76e1`)
- To **update an existing event**, submit a new version with the **same `id`**.

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
- Use one branch per submission for clarity

---

## 🚀 Deployment

The site is automatically deployed to:

👉 **[https://cologne-raves.pages.dev](https://cologne-raves.pages.dev)**

via Cloudflare Pages after each PR merge into `main`.

---

## 🙏 Credits

Community project maintained by volunteers.  
Powered by Astro + GitHub + JSON + ❤️


---

## 💬 Commit message example (when updating this README)

```bash
git checkout -b update-readme-instructions
# edit README.md

git add README.md
git commit -m "docs: update contribution guide with PR workflow and event ID rules"
git push origin update-readme-instructions
```

Then open a Pull Request into `main`.


---

## 📂 Guidelines for the `/data` folder

- All event data must be placed in individual `.json` files in the `/data/` directory
- Each file should contain an **array of event objects**, not a single object or nested structures
- Use clear, consistent filenames, such as:
  - `2025-04-bootshaus.json`
  - `2025-04-cologne-mixed.json`
- Avoid mixing events from different months or cities unless intentional
- Do not include fields outside the allowed schema (`event.schema.json`)
- If you are updating an existing event, make sure the `id` is the same as before

> 💡 Tip: Run schema validation locally with [ajv-cli](https://ajv.js.org/packages/ajv-cli.html) before opening a PR.

```
ajv validate -s event.schema.json -d data/*.json
```
