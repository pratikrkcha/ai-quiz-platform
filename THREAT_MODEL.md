# Application Threat Model (STRIDE)

## 1. REST API
*   **Spoofing:** Host tokens are UUIDv4, practically unguessable. Rate-limiting prevents brute-forcing tokens.
*   **Tampering:** All request bodies strictly parsed via `zod`. `express.json({ limit: '10kb' })` prevents memory tampering.
*   **Repudiation:** Request UUIDs added to every HTTP connection. All major interactions logged natively.
*   **Information Disclosure:** CORS restricted to frontend URL. Helmet CSP explicitly prevents loading external scripts.
*   **Denial of Service:** `express-rate-limit` enforces 100req/15min globally and 5req/15min on room creation.
*   **Elevation of Privilege:** No user accounts exist. Room controls tied to ephemeral `hostToken`.

## 2. Socket.io Handlers
*   **Spoofing:** Participants cannot spoof the host. `socket.data.isHost` is securely assigned via server-side verification of `hostToken`.
*   **Tampering:** Event payloads validated via Zod. `correctIndex` leak completely eradicated.
*   **Repudiation:** Socket connections logged with injected UUIDs.
*   **Information Disclosure:** `correctIndex` explicitly checked and omitted from broadcasts. Only sent to the specific answering client post-answer.
*   **Denial of Service:** Per-socket event wrapper limits `submit_answer` (5/sec) and `player_join` (10/min) preventing CPU/DB exhaustion loops.
*   **Elevation of Privilege:** Player attempting `host_start_game` throws `Unauthorized` due to missing `socket.data.isHost`.

## 3. MongoDB Data Access Layer
*   **Tampering:** Atomic MongoDB operators (`$set`, `$inc`, `$push`) used exclusively. 
*   **Information Disclosure:** No NoSQL injection is possible. Zod guarantees primitive strings for identifiers before querying Mongoose. Mongoose strictly enforces `String` schema.

## 4. LLM Service
*   **Tampering:** Prompt injection detection intercepts system-prompt overwrite attempts natively.
*   **Denial of Service:** Resilient backoff logic handles provider timeouts without bringing down the Express process.

## 5. React Frontend
*   **Information Disclosure:** UI components do not store correct answers. Server relies strictly on local state memory or server validation.
*   **Tampering (XSS):** Nickname strictly regex filtered to `/^[a-zA-Z0-9 ]+$/`. React escapes output natively, but Zod blocks `<script>` tags at the socket ingress layer immediately.
