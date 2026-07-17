# Email → Apple Calendar Bridge

A Scriptable script that reads an email's text, extracts event details with an LLM (via Groq's free API), and creates the event directly in Apple Calendar — no CalDAV, no app-specific passwords.

## How it works

1. Share an email's text into the script (via the Share Sheet, or paste it manually through a Shortcut).
2. The script sends the email body to Groq's API (free, open-weight model) with a prompt asking for structured JSON: title, start/end time, location, and a confidence score.
3. High-confidence extractions are added to your calendar automatically. Low-confidence ones show a confirmation prompt first.
4. A local notification confirms the event was added.

## Setup

1. Install [Scriptable](https://scriptable.app/) (free, iOS/iPadOS).
2. Create a new script in Scriptable, paste in `EmailToCalendar.js`, and name it exactly `EmailToCalendar`.
3. Get a free Groq API key at [console.groq.com/keys](https://console.groq.com/keys) — no credit card required.
4. Run the script (via Shortcuts, or Scriptable's own Share Sheet integration — see below). On first run, it'll prompt you to:
   - Paste your Groq API key (stored securely in Keychain, on-device only)
   - Pick which calendar new events should go to

## Feeding it an email

There are two ways to get email text into the script:

- **Share Sheet**: select the email's text (long-press → select) → Share → Scriptable → choose this script.
- **Manual paste via Shortcuts**: build a Shortcut with an "Ask for Input" (Text) action feeding into a "Run Script" action pointed at this script — paste the copied email body when prompted.

## Configuration

A few constants at the top of `EmailToCalendar.js` you may want to tune:

- `CONFIDENCE_THRESHOLD` — how confident the model needs to be before auto-adding an event without asking (default `0.75`).
- `GROQ_MODEL` — which Groq-hosted model to use (default `llama-3.3-70b-versatile`).

## Notes & limitations

- Cost: Groq's free tier has no charge and generous rate limits for personal, on-device use — no billing setup needed.
- Scriptable's Calendar API doesn't currently support setting native Calendar alerts/alarms on created events — the notification you get is an immediate "event was added" confirmation, not a reminder before the event starts.
- No dedup logic yet — since this is triggered manually per-email rather than as an automatic inbox sweep, duplicate events aren't a practical risk in normal use.

## Privacy

Your API key is stored in iOS Keychain, locally on your device — it's never written to this repo or shared anywhere. If you share this project with someone else, they'll be prompted to enter their own key on first run.
