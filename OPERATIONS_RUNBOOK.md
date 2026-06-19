# Production Operations Runbook

## Missing Information Requested
To fully finalize the Terraform/Infrastructure-as-Code layer, please confirm:
1. **Target Cloud Provider:** AWS, GCP, Render, Fly.io?
2. **MongoDB Hosting:** Are you using MongoDB Atlas?
3. **Domain & SSL Strategy:** Let's Encrypt natively via Nginx or managed by Cloudflare?
4. **Expected Peak Concurrent Users:** Required for estimating Node CPU sizing and Socket RAM.

---

## MongoDB Atlas Setup Commands
Run these exact commands in your `mongosh` shell against the production Atlas cluster:

**1. Create the TTL index to auto-delete 24-hour old rooms:**
`db.rooms.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 86400 })`

**2. Create the Room Code unique index (prevents collision at DB level):**
`db.rooms.createIndex({ "roomCode": 1 }, { unique: true })`

**3. Set up least-privilege user:**
Do not use the `Atlas admin` user in the `.env`. Create a specific user `quiz_app_prod` with exactly `readWrite` permissions on the specific `quiz_prod` database namespace.

---

## Incident Response Procedures

### 1. LLM API Outage (Gemini is down/rate-limiting)
*   **Detection:** Pino JSON logs will spike with `level: "error"` containing `LLM service unavailable`.
*   **User Experience:** Host sees "Failed to generate quiz." (App handles this gracefully via UI errors, no crash).
*   **Mitigation:** Verify your Gemini API quota limits in Google Cloud. The application natively uses exponential backoff.

### 2. Room Code Exhaustion
*   **Detection:** Backend logs throw MongoDB `E11000 duplicate key error collection` heavily on `/api/rooms`.
*   **Mitigation:** 
    *   *Immediate:* Manually trigger a DB cleanup of inactive rooms via mongosh.
    *   *Permanent:* Modify the generation logic from 4-character codes (max ~1.6 million) to 5-character codes.

### 3. MongoDB Connection Failure
*   **Detection:** The ELB/ALB pings `/health` which returns `503 Service Unavailable: MongoDB disconnected`. Load balancer automatically marks the node as unhealthy and stops traffic.
*   **Mitigation:** Verify IP Whitelisting in MongoDB Atlas Network Access pane (0.0.0.0/0 if running on serverless/ephemeral IPs).

### 4. High WebSocket Connection CPU Spike
*   **Detection:** Metrics show Event Loop Lag > 100ms.
*   **Mitigation:** Node handles 10k+ sockets easily, but if CPU hits 100%, you must scale horizontally. **CRITICAL:** If you scale the backend to > 1 container, you MUST enable "Sticky Sessions" (IP Hash) on your Load Balancer for Socket.io to complete the HTTP-to-WebSocket upgrade handshake reliably.

---

## Production Checklist
- [ ] `NODE_ENV=production` explicitly set in container environment.
- [ ] `GEMINI_API_KEY` successfully mounted as a secret.
- [ ] MongoDB Atlas Network IP Whitelist configured.
- [ ] TTL and Unique Indexes strictly verified in Atlas UI.
- [ ] Nginx Reverse Proxy `Upgrade` and `Connection` headers are actively passing WebSocket traffic.
- [ ] `/health` endpoint is responding with HTTP 200.
- [ ] Structured JSON Logging is aggregating into CloudWatch/Datadog correctly without logging `req.url="/health"`.
- [ ] CORS is restricted explicitly to the production `FRONTEND_URL`.
