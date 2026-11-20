"""Pepo, PawPair's pet-care chatbot. Answers questions users type in the app.

How it works (the same "mailbox" idea as camera scans):
1. The app saves a question in that pet's own chat:
       users/{uid}/pepoChats/{petId}/messages/{id} -> { role: "user", text, status: "pending" }
   and marks the user:   users/{uid} -> { pepoPending: true, pepoPendingChats: [petId, ...] }
2. Pepo LISTENS to Firestore (no waiting for a polling loop), so it sees the
   question right away. It sends the question, that pet's details and the
   recent chat to Gemini, and STREAMS the reply into a new message, so the
   answer appears word by word in the app.

Each adopted pet has its own chat, so switching pets on the homepage switches chats.

The Gemini API key stays on this computer (in .env), never in the app.

Setup:
    pip install google-genai python-dotenv
    .env:  GEMINI_API_KEY=your-key-here
           PEPO_MODEL=gemini-3.6-flash         (optional)
           PEPO_THINKING=low                   (optional: minimal, low, medium, high)
"""

import os
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor

from dotenv import load_dotenv
from google.cloud.firestore_v1.base_query import FieldFilter

from firebase_client import db, firestore

load_dotenv()

MODEL = os.getenv("PEPO_MODEL", "gemini-3.6-flash")
# If the main model is overloaded, Pepo tries this one instead.
FALLBACK_MODEL = os.getenv("PEPO_FALLBACK_MODEL", "gemini-3.5-flash")
# Less "thinking" = much faster replies. Chat answers don't need deep reasoning.
THINKING_LEVEL = os.getenv("PEPO_THINKING", "low")
RETRY_WAITS = [1, 2]        # seconds to wait before each retry when Gemini is busy
HISTORY_MESSAGES = 6        # how much of this pet's recent chat Pepo remembers
MAX_QUESTION_CHARS = 1000   # ignore anything past this (keeps costs and abuse down)
MAX_REPLY_TOKENS = 1024     # the prompt keeps answers short anyway
STREAM_UPDATE_SECONDS = 0.35  # how often the growing reply is written to Firestore
PET_CACHE_SECONDS = 300     # reuse a pet's details for 5 minutes instead of re-reading
WORKERS = 4                 # how many users Pepo can answer at the same time

SYSTEM_PROMPT = """You are Pepo, the friendly goat mascot of PawPair, a pet adoption and post-adoption app.
You help people care for the pet they just adopted (or are about to adopt) as well as pets they already had.

How to answer:
- Be warm, encouraging and practical. Keep answers short: 2-4 sentences or a few bullet points.
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
- NEVER make up facts. If you're not sure, say so and suggest asking a vet or trainer.

Formatting (important): the chat shows PLAIN TEXT only. Do NOT use Markdown: no asterisks,
no **bold**, no # headings, no tables. For a list, start each line with "• ".
"""

GENERAL_CHAT = "general"  # chat used when no pet is selected yet


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

    _client = genai.Client()
    print(f"Pepo chatbot ready (model: {MODEL}, thinking: {THINKING_LEVEL})", flush=True)
except Exception as e:
    _client = None
    print(f"Pepo chatbot is OFF: {e}", flush=True)


# ---------------------------------------------------------------- pet details
_pet_cache: dict[str, tuple[float, str]] = {}


def _pet_context(pet_id: str | None) -> str:
    """A short description of the pet this chat is about, so answers are personal."""
    if not pet_id or pet_id == GENERAL_CHAT:
        return "The user hasn't picked an adopted pet in the app yet."
    cached = _pet_cache.get(pet_id)
    if cached and time.time() - cached[0] < PET_CACHE_SECONDS:
        return cached[1]
    try:
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
        text = "This chat is about the user's adopted pet: " + "; ".join(parts) if parts else "No pet details available."
    except Exception as e:
        print(f"  (Pepo couldn't load pet details: {e})", flush=True)
        text = "No pet details available."
    _pet_cache[pet_id] = (time.time(), text)
    return text


# --------------------------------------------------------------- chat history
def _history(messages_ref) -> list:
    """This pet's recent chat, oldest first, in Gemini's format."""
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
    while contents and contents[0]["role"] != "user":
        contents.pop(0)
    return contents


# ------------------------------------------------------------------- errors
def _is_daily_limit(e: Exception) -> bool:
    """The free tier's daily request limit. Retrying won't help until it resets."""
    msg = str(e).lower()
    return ("429" in msg or "resource_exhausted" in msg) and ("per day" in msg or "perday" in msg or "daily" in msg)


def _is_busy(e: Exception) -> bool:
    """True for "try again later" errors: overloaded (503), rate limited (429), timeouts."""
    msg = str(e)
    return any(k in msg for k in ("503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED", "overloaded", "high demand", "DEADLINE"))


def _friendly_error(e: Exception) -> str:
    msg = str(e)
    if _is_daily_limit(e):
        return "I've answered a lot of questions today and need a rest! 😴 Please try again later."
    if _is_busy(e) or "quota" in msg.lower():
        return "I'm getting a lot of questions right now! 😴 Please try again in a minute."
    return "Sorry, I couldn't answer just now. Please try again in a moment. 🐐"


# ------------------------------------------------------------- Gemini calls
_thinking_supported = True  # turned off automatically if a model rejects the setting


def _config(pet_id: str | None):
    kwargs = dict(
        system_instruction=SYSTEM_PROMPT + "\n" + _pet_context(pet_id),
        max_output_tokens=MAX_REPLY_TOKENS,
        temperature=1.0,  # Google's recommended setting for Gemini 3 models
    )
    if _thinking_supported and THINKING_LEVEL:
        kwargs["thinking_config"] = types.ThinkingConfig(thinking_level=THINKING_LEVEL)
    return types.GenerateContentConfig(**kwargs)


def _stream_reply(pet_id: str | None, messages_ref, on_text) -> str:
    """Ask Gemini and call on_text(full_text_so_far) as the answer streams in.
    Retries and switches models only if nothing has been shown yet."""
    global _thinking_supported
    contents = _history(messages_ref)

    models = [MODEL]
    if FALLBACK_MODEL and FALLBACK_MODEL != MODEL:
        models.append(FALLBACK_MODEL)

    last_error = None
    for model in models:
        for attempt in range(len(RETRY_WAITS) + 1):
            text = ""
            try:
                for chunk in _client.models.generate_content_stream(
                    model=model, contents=contents, config=_config(pet_id)
                ):
                    piece = getattr(chunk, "text", None) or ""
                    if piece:
                        text += piece
                        on_text(text)
                if model != MODEL:
                    print(f"  (answered with backup model {model})", flush=True)
                return text
            except Exception as e:
                last_error = e
                short = " ".join(str(e).split())[:220]
                if text:  # part of the answer is already on screen: keep it
                    print(f"  (stream cut off on {model}: {short})", flush=True)
                    return text
                if _thinking_supported and "thinking" in str(e).lower():
                    print(f"  ({model} doesn't accept the thinking setting; turning it off)", flush=True)
                    _thinking_supported = False
                    continue
                if _is_daily_limit(e):
                    print(f"  (daily free limit reached on {model}: {short})", flush=True)
                    break  # retrying won't help; try the backup model
                if not _is_busy(e):
                    raise  # a real problem (bad key, wrong model name): don't keep retrying
                print(f"  (Gemini busy on {model}: {short} -- retrying...)", flush=True)
                if attempt < len(RETRY_WAITS):
                    time.sleep(RETRY_WAITS[attempt])
    raise last_error


# ------------------------------------------------------------ answering
def _answer_chat(uid: str, chat_id: str, messages_ref) -> None:
    """Answer every waiting question in one chat."""
    pet_id = None if chat_id in (GENERAL_CHAT, "_legacy") else chat_id
    pending = list(messages_ref.where(filter=FieldFilter("status", "==", "pending")).stream())

    for q in pending:
        started = time.time()
        print(f"\n[pepo] question from {uid} (chat: {chat_id})", flush=True)
        q.reference.update({"status": "answering"})

        reply_ref = None
        last_write = 0.0

        def on_text(full: str) -> None:
            nonlocal reply_ref, last_write
            now = time.time()
            if reply_ref is None:
                # First words: create Pepo's bubble and stop the "typing" dots.
                reply_ref = messages_ref.document()
                reply_ref.set({
                    "role": "pepo",
                    "text": _plain_text(full),
                    "status": "streaming",
                    "petId": pet_id,
                    "createdAt": firestore.SERVER_TIMESTAMP,
                })
                q.reference.update({"status": "answered"})
                last_write = now
            elif now - last_write >= STREAM_UPDATE_SECONDS:
                reply_ref.update({"text": _plain_text(full)})
                last_write = now

        try:
            full = _stream_reply(pet_id, messages_ref, on_text)
            reply = _plain_text(full) or "Hmm, I'm not sure how to answer that. Could you ask it another way? 🐐"
            status = "answered"
        except Exception as e:
            print(f"[pepo ERROR] {e}", flush=True)
            reply = _friendly_error(e)
            status = "error"

        if reply_ref is None:
            messages_ref.add({
                "role": "pepo",
                "text": reply,
                "status": "done",
                "petId": pet_id,
                "createdAt": firestore.SERVER_TIMESTAMP,
            })
        else:
            reply_ref.update({"text": reply, "status": "done"})
        q.reference.update({"status": status})
        print(f"[pepo] replied ({len(reply)} chars in {time.time() - started:.1f}s)", flush=True)


def _answer_user(uid: str) -> None:
    """Answer everything waiting for one user, across all of their pets' chats."""
    user_ref = db.collection("users").document(uid)
    while True:
        data = user_ref.get().to_dict() or {}
        if not data.get("pepoPending"):
            return
        chats = [str(c) for c in (data.get("pepoPendingChats") or []) if c]
        updates = {"pepoPending": False}
        if chats:
            updates["pepoPendingChats"] = firestore.ArrayRemove(chats)
        user_ref.update(updates)

        for chat_id in chats:
            messages_ref = user_ref.collection("pepoChats").document(chat_id).collection("messages")
            _answer_chat(uid, chat_id, messages_ref)

        # Older app versions kept one chat for everything; still answer those.
        if not chats:
            _answer_chat(uid, "_legacy", user_ref.collection("pepoMessages"))
        # Loop again in case a new question arrived while we were answering.


# --------------------------------------------------- listening for questions
_pool = ThreadPoolExecutor(max_workers=WORKERS, thread_name_prefix="pepo")
_busy_users: set[str] = set()
_busy_lock = threading.Lock()
_watch = None
_listen_failed = False


def _handle(uid: str) -> None:
    with _busy_lock:
        if uid in _busy_users:
            return  # already answering this user; _answer_user re-checks when done
        _busy_users.add(uid)

    def run():
        try:
            _answer_user(uid)
        except Exception as e:
            print(f"[pepo ERROR] while answering {uid}: {e}", flush=True)
        finally:
            with _busy_lock:
                _busy_users.discard(uid)
            # If another question slipped in right as we finished, pick it up.
            try:
                if (db.collection("users").document(uid).get().to_dict() or {}).get("pepoPending"):
                    _handle(uid)
            except Exception:
                pass

    _pool.submit(run)


def _on_snapshot(docs, changes, read_time) -> None:
    for doc in docs:
        _handle(doc.id)


def answer_pending() -> None:
    """Called by the worker's main loop. The first call starts a live Firestore
    listener, so questions are answered instantly instead of every few seconds.
    If the listener can't start, this falls back to checking on each call."""
    global _watch, _listen_failed
    if _client is None:
        return
    if _watch is None and not _listen_failed:
        try:
            _watch = (
                db.collection("users")
                .where(filter=FieldFilter("pepoPending", "==", True))
                .on_snapshot(_on_snapshot)
            )
            print("Pepo is listening for questions (instant replies)", flush=True)
            return
        except Exception as e:
            _listen_failed = True
            print(f"  (Pepo couldn't start live listening, checking every loop instead: {e})", flush=True)
    if _listen_failed:
        for user_doc in db.collection("users").where(filter=FieldFilter("pepoPending", "==", True)).stream():
            _handle(user_doc.id)