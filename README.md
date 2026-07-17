<div align="center">

# SCHEDULING MONKEY

### **share text, a link, or an image. get a calendar event.**

[![built with Scriptable](https://img.shields.io/badge/Built%20with-Scriptable-orange?style=for-the-badge)](https://scriptable.app)
[![powered by Groq](https://img.shields.io/badge/Powered%20by-Groq%20%28free%29-red?style=for-the-badge)](https://groq.com)
[![runs on iOS](https://img.shields.io/badge/Runs%20on-iOS%20%2F%20iPadOS-blue?style=for-the-badge)](https://apple.com/ios)

<br />

**a Scriptable script that turns any text, link, or image into a calendar event. powered by Groq's free LLM API. works with any calendar on your device — no CalDAV, no app passwords, no subscriptions.**

</div>

---

## what it does

share anything with event info in it:

- **text** — a message, a group chat, a forwarded email, anything with a date and time in it
- **links** — share a URL to an event page; it fetches and reads the content
- **images** — share a screenshot, flyer, poster, or ticket photo; the vision model reads it

it pulls out the title, date/time, timezone, location, and any useful notes (confirmation numbers, dial-in links, dress codes, etc.), then creates the event directly in whichever calendar you pick using iOS's native EventKit — no third-party integrations needed.

high-confidence extractions are added automatically. lower-confidence ones show a confirmation prompt so you can verify before anything's committed.

---

## how it works

```
share text / link / image
        ↓
Groq API (llama-3.3-70b for text, llama-4-scout for images)
        ↓
structured JSON: title, start, end, timezone, location, notes, confidence
        ↓
confidence ≥ 0.75 → auto-add     confidence < 0.75 → confirm first
        ↓
EventKit creates the event in your chosen calendar
        ↓
local notification confirms it's done
```

timezone handling is DST-aware — it converts the wall-clock time the LLM extracts into the correct UTC offset for that specific date, so events don't land an hour off after a daylight saving transition.

---

## setup

1. install [Scriptable](https://scriptable.app/) (free, iOS/iPadOS)
2. create a new script, paste in `SchedulingMonkey.js`, name it exactly `SchedulingMonkey`
3. grab a free Groq API key at [console.groq.com/keys](https://console.groq.com/keys) — no credit card needed
4. run it once. on first run it'll ask you to:
   - paste your Groq API key (stored in iOS Keychain, on-device only)
   - pick which calendar new events go to

---

## using it

**from the share sheet:**
- text → select it, tap Share → Scriptable → pick this script
- link → tap Share in your browser → Scriptable → pick this script
- image → tap Share on the image → Scriptable → pick this script

**via Shortcuts:**
build a Shortcut with "Get Input from Share Sheet" (accepting text, URLs, or images) → "Run Script" pointing at `SchedulingMonkey`

---

## configuration

| constant | default | what it does |
|----------|---------|--------------|
| `CONFIDENCE_THRESHOLD` | `0.75` | below this, shows a confirm prompt before adding |
| `GROQ_TEXT_MODEL` | `llama-3.3-70b-versatile` | model used for text and web pages |
| `GROQ_VISION_MODEL` | `meta-llama/llama-4-scout-17b-16e-instruct` | model used for images |
| `LINK_TEXT_MAX_CHARS` | `3000` | how much of a fetched page to send to the model |

---

## notes

- **cost:** Groq's free tier covers way more than typical personal use — no billing setup needed
- **privacy:** your API key lives in iOS Keychain, on your device only — never leaves it
- **calendar alerts:** Scriptable's EventKit API doesn't support setting native reminders on created events — the notification you get is a "successfully added" confirmation, not a pre-event reminder
- **duplicates:** since this is manually triggered per-share, duplicate events aren't really a risk in normal use
