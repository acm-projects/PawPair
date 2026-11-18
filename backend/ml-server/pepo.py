"""Pepo, PawPair's pet-care chatbot. Answers questions users type in the app.

How it works (the same "mailbox" idea as camera scans):
1. The app saves a question to   users/{uid}/pepoMessages/{id}  -> { role: "user", text, status: "pending" }
   and sets                       users/{uid}.pepoPending = true
2. The worker calls answer_pending() every few seconds. It finds users with
   pepoPending == true, sends their question (plus their pet's details and the
   recent chat) to Gemini, and saves Pepo's reply as a new message.
3. The app is listening to pepoMessages, so the reply appears right away.

The Gemini API key stays on this computer (in .env), never in the app.

Setup:
    pip install google-genai python-dotenv
    .env:  GEMINI_API_KEY=your-key-here
           PEPO_MODEL=gemini-3.6-flash      (optional, see README notes)
"""

import os
import re
import time

from dotenv import load_dotenv
from google.cloud.firestore_v1.base_query import FieldFilter

from firebase_client import db, firestore

load_dotenv()

MODEL = os.getenv("PEPO_MODEL", "gemini-3.6-flash")
# If the main model is overloaded, Pepo tries this one instead.
FALLBACK_MODEL = os.getenv("PEPO_FALLBACK_MODEL", "gemini-3.5-flash")
RETRY_WAITS = [1, 3]         # seconds to wait before each retry when Gemini is busy
HISTORY_MESSAGES = 10        # how much of the recent chat Pepo remembers
MAX_QUESTION_CHARS = 1000    # ignore anything past this (keeps costs and abuse down)
MAX_REPLY_TOKENS = 2048      # roomy, because "thinking" counts too; the prompt keeps answers short

SYSTEM_PROMPT = """You are Pepo, the friendly goat mascot of PawPair, a pet adoption and post-adoption app.
You help people care for the pet they just adopted (or are about to adopt).

How to answer:
- Be warm, encouraging and practical. Keep answers short: 2-5 sentences or a few bullet points.
- Use the pet's name and species when you know them. A little goat charm is fine, but don't overdo it.
- Stick to pet care, training, behavior, nutrition basics, adoption and settling in.
  For unrelated topics, gently steer back to pets.

Safety rules (always follow):
- You are NOT a veterinarian. Never diagnose, and never give medication names or doses.
- If the user describes symptoms or illness, suggest contacting their vet.
- If it could be an emergency (poisoning, trouble breathing, collapse, seizures, heavy bleeding,
  swallowed something dangerous), tell them to contact an emergency vet or the ASPCA Animal Poison
  Control Center at (888) 426-4435 right away, and remind them the app's camera results page has
  an "In an emergency" button to find a nearby emergency vet.
- Never make up facts. If you're not sure, say so and suggest asking a vet or trainer.

Formatting (important): the chat shows PLAIN TEXT only. Do NOT use Markdown: no asterisks,
no **bold**, no # headings, no tables. For a list, start each line with "• ".
"""


def _plain_text(text: str) -> str:
    """Strip any Markdown Gemini still sends, since the chat bubble shows plain text."""
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)            # **bold**
    text = re.sub(r"__(.+?)__", r"\1", text)                  # __bold__
    text = re.sub(r"(?m)^\s*[*\-+]\s+", "• ", text)            # * bullet / - bullet
    text = re.sub(r"(?m)^\s*#{1,6}\s*", "", text)               # # headings
    text = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"\1", text)  # *italic*
    text = re.sub(r"`([^`]+)`", r"\1", text)                  # `code`
    text = re.sub(r"\n{3,}", "\n\n", text)                     # extra blank lines
    return text.strip()

try:
    from google import genai
    from google.genai import types

    _client = genai.Client()  # reads GEMINI_API_KEY from the environment
    print(f"Pepo chatbot ready (model: {MODEL})", flush=True)
except Exception as e:  # missing package or key: the scan worker keeps working without Pepo
    _client = None
    print(f"Pepo chatbot is OFF: {e}", flush=True)


def _pet_context(uid: str) -> str:
    """A short description of the user's adopted pet, so answers are personal."""
    try:
        user = db.collection("users").document(uid).get().to_dict() or {}
        pet_id = user.get("adoptedPetId")
        if not pet_id:
            return "The user hasn't picked an adopted pet in the app yet."
        pet = db.collection("animals").document(str(pet_id)).get().to_dict() or {}
        details = {
            "name": pet.get("name"),
            "species": pet.get("species"),
            "breed": pet.get("breed"),
            "age": pet.get("age"),
            "size": pet.get("size"),
            "energy": pet.get("energy"),
            "temperament": pet.get("temperament"),
        }
        parts = [f"{k}: {v}" for k, v in details.items() if v not in (None, "", [])]
        return "The user's adopted pet: " + "; ".join(parts) if parts else "No pet details available."
    except Exception as e:
        print(f"  (Pepo couldn't load pet details: {e})", flush=True)
        return "No pet details available."


def _history(messages_ref) -> list:
    """The recent chat, oldest first, in Gemini's format."""
    recent = list(
        messages_ref.order_by("createdAt", direction=firestore.Query.DESCENDING)
        .limit(HISTORY_MESSAGES)
        .stream()
    )
    contents = []
    for doc in reversed(recent):
        m = doc.to_dict() or {}
        text = str(m.get("text", ""))[:MAX_QUESTION_CHARS]
        if not text or m.get("role") not in ("user", "pepo"):
            continue
        contents.append({"role": "user" if m["role"] == "user" else "model", "parts": [{"text": text}]})
    # Gemini expects the chat to start with the user
    while contents and contents[0]["role"] != "user":
        contents.pop(0)
    return contents


def _is_daily_limit(e: Exception) -> bool:
    """The free tier's daily request limit. Retrying won't help until it resets."""
    msg = str(e).lower()
    return ("429" in msg or "resource_exhausted" in msg) and ("per day" in msg or "perday" in msg or "daily" in msg)


def _is_busy(e: Exception) -> bool:
    """True for "try again later" errors: overloaded (503), rate limited (429), timeouts."""
    msg = str(e)
    return any(k in msg for k in ("503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED", "overloaded", "high demand", "DEADLINE"))


def _ask_gemini(uid: str, messages_ref) -> str:
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT + "\n" + _pet_context(uid),
        max_output_tokens=MAX_REPLY_TOKENS,
        temperature=0.6,
    )
    contents = _history(messages_ref)

    # Try the main model (with a couple of quick retries), then the backup model.
    models = [MODEL]
    if FALLBACK_MODEL and FALLBACK_MODEL != MODEL:
        models.append(FALLBACK_MODEL)

    last_error = None
    for model in models:
        for attempt in range(len(RETRY_WAITS) + 1):
            try:
                response = _client.models.generate_content(model=model, contents=contents, config=config)
                if model != MODEL:
                    print(f"  (answered with backup model {model})", flush=True)
                text = _plain_text(response.text or "")
                return text or "Hmm, I'm not sure how to answer that. Could you ask it another way? 🐐"
            except Exception as e:
                last_error = e
                short = " ".join(str(e).split())[:220]
                if _is_daily_limit(e):
                    print(f"  (daily free limit reached on {model}: {short})", flush=True)
                    break  # retrying won't help; try the backup model
                if not _is_busy(e):
                    raise  # a real problem (bad key, wrong model name): don't keep retrying
                print(f"  (Gemini busy on {model}: {short} -- retrying...)", flush=True)
                if attempt < len(RETRY_WAITS):
                    time.sleep(RETRY_WAITS[attempt])
    raise last_error


def _friendly_error(e: Exception) -> str:
    msg = str(e)
    if _is_daily_limit(e):
        return "I've answered a lot of questions today and need a rest! 😴 Please try again later."
    if _is_busy(e) or "quota" in msg.lower():
        return "I'm getting a lot of questions right now! 😴 Please try again in a minute."
    return "Sorry, I couldn't answer just now. Please try again in a moment. 🐐"


def answer_pending() -> None:
    """Answer every waiting question. Called by the worker's main loop."""
    if _client is None:
        return
    for user_doc in db.collection("users").where(filter=FieldFilter("pepoPending", "==", True)).stream():
        uid = user_doc.id
        # Clear the flag FIRST, so a question sent while Pepo is answering sets it again.
        user_doc.reference.update({"pepoPending": False})
        messages_ref = db.collection("users").document(uid).collection("pepoMessages")
        pending = list(messages_ref.where(filter=FieldFilter("status", "==", "pending")).stream())

        for q in pending:
            print(f"\n[pepo] question from {uid}", flush=True)
            q.reference.update({"status": "answering"})
            try:
                reply = _ask_gemini(uid, messages_ref)
                status = "answered"
            except Exception as e:
                print(f"[pepo ERROR] {e}", flush=True)
                reply = _friendly_error(e)
                status = "error"
            messages_ref.add({"role": "pepo", "text": reply, "createdAt": firestore.SERVER_TIMESTAMP})
            q.reference.update({"status": status})
            print(f"[pepo] replied ({len(reply)} chars)", flush=True)