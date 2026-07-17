// Email → Apple Calendar Bridge
// Run via a Shortcut's "Run Script" action, passing the email text in as input.
// Uses the Anthropic API to extract event details, then creates the event with
// Scriptable's native Calendar API (EventKit) — no CalDAV/app passwords needed.

const KEYCHAIN_API_KEY = "email_calendar_bridge_api_key";
const KEYCHAIN_CALENDAR_NAME = "email_calendar_bridge_calendar_name";
const CONFIDENCE_THRESHOLD = 0.75; // below this, ask before adding
const GROQ_MODEL = "llama-3.3-70b-versatile"; // free tier, no cost

// --- Setup: API key (stored once, locally, on this device) ---
async function getApiKey() {
  if (Keychain.contains(KEYCHAIN_API_KEY)) {
    return Keychain.get(KEYCHAIN_API_KEY);
  }
  const alert = new Alert();
  alert.title = "Groq API Key Needed";
  alert.message = "Paste your free Groq API key (get one at console.groq.com/keys — no credit card needed). It's stored securely on this device only — never shared or uploaded.";
  alert.addTextField("gsk_...");
  alert.addAction("Save");
  alert.addCancelAction("Cancel");
  const idx = await alert.presentAlert();
  if (idx === -1) throw new Error("No API key provided — can't continue without one.");
  const key = alert.textFieldValue(0).trim();
  if (!key) throw new Error("API key was empty.");
  Keychain.set(KEYCHAIN_API_KEY, key);
  return key;
}

// --- Setup: which calendar to add events to (remembered after first pick) ---
async function pickCalendar() {
  const calendars = await Calendar.forEvents();

  if (Keychain.contains(KEYCHAIN_CALENDAR_NAME)) {
    const savedName = Keychain.get(KEYCHAIN_CALENDAR_NAME);
    const found = calendars.find((c) => c.title === savedName);
    if (found) return found;
  }

  const alert = new Alert();
  alert.title = "Pick a Calendar";
  alert.message = "New events will go here from now on (you can reset by deleting the script's keychain entries).";
  calendars.forEach((c) => alert.addAction(c.title));
  alert.addCancelAction("Cancel");
  const idx = await alert.presentSheet();
  if (idx === -1) throw new Error("No calendar selected.");
  const chosen = calendars[idx];
  Keychain.set(KEYCHAIN_CALENDAR_NAME, chosen.title);
  return chosen;
}

// --- Call Claude to extract structured event details from the email text ---
async function extractEventFromEmail(emailText, apiKey) {
  const todayISO = new Date().toISOString().split("T")[0];

  const systemPrompt = `You extract calendar event details from emails. Respond with ONLY valid JSON, no other text and no markdown fences, in exactly this shape:
{"is_event": boolean, "title": string, "start": "YYYY-MM-DDTHH:MM:SS", "end": "YYYY-MM-DDTHH:MM:SS" or null, "location": string or null, "confidence": number between 0 and 1}

Rules:
- If the email does not describe a specific event with a real date/time (e.g. it's a newsletter, receipt with no event, or generic announcement), set "is_event": false and leave other fields as empty strings or null.
- If no explicit year is given, assume the nearest future occurrence relative to today.
- If no end time is given, set "end" to null (the caller will default to a 1-hour event).
- "confidence" should reflect how certain you are about the date/time specifically, not just whether an event exists.
- Today's date is ${todayISO}.`;

  // Groq's free tier: no cost, no credit card, rate-limited but way more than
  // enough for occasional manual runs. Trimming input keeps token count down.
  const trimmedEmail = emailText.slice(0, 1500);

  const req = new Request("https://api.groq.com/openai/v1/chat/completions");
  req.method = "POST";
  req.headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + apiKey,
  };
  req.body = JSON.stringify({
    model: GROQ_MODEL,
    max_tokens: 300,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: trimmedEmail },
    ],
  });

  const res = await req.loadJSON();

  if (res.error) {
    throw new Error("Groq API error: " + res.error.message);
  }

  const messageContent = res.choices && res.choices[0] && res.choices[0].message && res.choices[0].message.content;
  if (!messageContent) throw new Error("No text content in API response.");

  const cleaned = messageContent.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Couldn't parse model output as JSON: " + cleaned.slice(0, 200));
  }
}

// --- Fire a local notification (shows up like any other app notification) ---
async function notify(title, body) {
  const n = new Notification();
  n.title = title;
  n.body = body;
  await n.schedule();
}

// --- Create the actual calendar event ---
async function createCalendarEvent(details, calendar) {
  const event = new CalendarEvent();
  event.title = details.title;
  event.calendar = calendar;
  event.startDate = new Date(details.start);
  event.endDate = details.end
    ? new Date(details.end)
    : new Date(new Date(details.start).getTime() + 60 * 60 * 1000); // default 1hr
  if (details.location) event.location = details.location;
  await event.save();
}

// --- Main ---
async function main() {
  const emailText = args.plainTexts[0] || args.shortcutParameter;
  if (!emailText) {
    throw new Error("No email text received — make sure the Shortcut passes email content into this script's input.");
  }

  const apiKey = await getApiKey();
  const details = await extractEventFromEmail(emailText, apiKey);

  if (!details.is_event) {
    Script.setShortcutOutput("No event detected in this email.");
    return;
  }

  if (details.confidence >= CONFIDENCE_THRESHOLD) {
    const calendar = await pickCalendar();
    await createCalendarEvent(details, calendar);
    const summary = `Added "${details.title}" on ${details.start}.`;
    await notify("Event Added", summary);
    Script.setShortcutOutput(summary);
  } else {
    const alert = new Alert();
    alert.title = "Confirm This Event?";
    alert.message = `${details.title}\n${details.start}${details.location ? "\n" + details.location : ""}\n\nConfidence: ${Math.round(details.confidence * 100)}% — low enough that I wanted to check first.`;
    alert.addAction("Add to Calendar");
    alert.addCancelAction("Skip");
    const idx = await alert.presentAlert();
    if (idx === 0) {
      const calendar = await pickCalendar();
      await createCalendarEvent(details, calendar);
      const summary = `Added "${details.title}" on ${details.start}.`;
      await notify("Event Added", summary);
      Script.setShortcutOutput(summary);
    } else {
      Script.setShortcutOutput("Skipped — not added.");
    }
  }
}

await main();
Script.complete();
