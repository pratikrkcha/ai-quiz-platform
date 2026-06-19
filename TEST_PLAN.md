# Test Plan

## 1. Scope & Missing Information Required
Before finalizing external integration layers, please confirm:
1. **Browser E2E Scope:** Are Cypress or Playwright tests required for the MVP, or is Node-level simulated E2E sufficient for now?
2. **Coverage Thresholds:** We have defined 80% lines, 75% branches. Are there specific CI enforcement constraints to apply globally?

## 2. Test Categories

### Unit Tests (Existing)
*   **LLM Service:** Verifies prompt formatting, JSON sanitization, and fallback/retry logic. (Mocks: Node `fetch`).
*   **Room DAL:** Verifies atomic updates, schema creation, and index usage. (Mocks: `mongodb-memory-server`).

### Integration Tests (New)
*   **Database/API Integration:** Verifies HTTP endpoints correctly persist data to MongoDB and respect rate limits.
*   **Socket/State Integration:** Verifies socket events correctly update MongoDB and trigger timer/state transitions.

### Security Tests (Existing)
*   **Injection:** Rejects `{$gt: ""}` NoSQL manipulation.
*   **XSS:** Validates Zod nickname sanitization natively.
*   **Rate Limiting & Flood Control:** Asserts spamming socket connections blocks excess queries.

### End-to-End (Simulated Game Lifecycle)
*   **Happy Path:** Simulates full match. Verifies room creation, connections, questions iterating, scoring logic, and final leaderboard.
*   **Concurrency:** Emits simultaneous answers from N participants. Asserts exactly N points awarded via atomic DB transactions.
*   **Reconnection Resilience:** Asserts dropping connection mid-match and rejoining restores the exact state without duplicate players.
*   **Host Drop Handling:** Asserts the timer pauses and participants are notified if the Host network drops.
