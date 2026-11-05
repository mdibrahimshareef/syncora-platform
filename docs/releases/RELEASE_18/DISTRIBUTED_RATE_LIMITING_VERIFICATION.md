# SYNCORA PLATFORM MAJOR RELEASE 18
# DISTRIBUTED RATE LIMITING & MULTI-INSTANCE TOPOLOGY REPORT

**Release:** Platform Major Release 18  
**Document:** Deliverable 05 — Distributed Rate Limiting Verification  
**Author:** Principal Infrastructure & Security Architect  
**Date:** November 5, 2026  
**Status:** CONDITIONAL PASS (LEVEL 1 & 2 VERIFIED / EDGE WAF REQUIRED FOR DISTRIBUTED TOPOLOGY)  

---

## 1. Context & Operational Objectives

Public APIs and webhook ingestion endpoints are primary targets for denial-of-service (DoS) floods, credential stuffing, and resource exhaustion attacks. 

Rate limiting ensures that SYNCORA maintains service availability, protects downstream Supabase connection pools, and prevents malicious actors from overwhelming background job queues.

---

## 2. In-Memory Sliding-Window Implementation

SYNCORA implements an in-memory sliding-window rate limiter in [`src/lib/rate-limit.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/rate-limit.ts).

### 2.1 Architectural Characteristics
- **Sliding-Window Algorithm:** Tracks request timestamps per key in a `Map<string, number[]>`. On each request, timestamps older than `now - windowMs` are evicted, accurately measuring request rate without the boundary-burst vulnerabilities of fixed-window counters.
- **Memory Management & Garbage Collection:** A periodic cleanup timer runs every 60 seconds (`setInterval.unref()`) to delete idle keys from the map, preventing memory leaks on long-running instances.
- **RFC Standard HTTP Headers:** Every response evaluated by the rate limiter includes standard operational headers:
  - `X-RateLimit-Limit`: Maximum requests permitted in the sliding window.
  - `X-RateLimit-Remaining`: Count of remaining requests available before throttling.
  - `X-RateLimit-Reset`: Unix epoch timestamp (seconds) when the window resets.
  - `Retry-After`: Seconds to wait before retrying (emitted on HTTP 429).

### 2.2 Integration Endpoints
- **Inbound Webhooks:** [`src/app/api/webhooks/inbound/[provider]/route.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/app/api/webhooks/inbound/[provider]/route.ts) applies rate limiting per client IP and provider key:
  - Default policy: **60 requests per minute** per `ip:provider`.
  - Exceeding the threshold returns HTTP `429 Too Many Requests` with a structured JSON error body.

---

## 3. Automated Test Verification (Level 1 Evidence)

The rate limiter was tested under simulated traffic via Vitest in [`tests/rate-limit.test.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/tests/rate-limit.test.ts):

- **Test Suite Results:** **4 tests passing (100%)**
  - **Burst Allowance:** Allows requests up to the defined limit within the window.
  - **Rejection Enforcement:** Returns `success: false` on request $N+1$ with correct `Retry-After` interval.
  - **Header Emission:** Emits valid RFC rate limit headers across both accepted and rejected requests.
  - **Window Sliding:** Allows subsequent requests once the sliding time window elapses.

---

## 4. Multi-Instance & Serverless Limitations

### 4.1 The Distributed Topology Constraint
In modern cloud deployments (e.g. AWS ECS, Google Cloud Run, or Vercel serverless functions), multiple application instances or serverless workers run concurrently behind a load balancer.

Because [`src/lib/rate-limit.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/rate-limit.ts) maintains state in local Node.js process memory:
- **Local Isolation:** Instance A cannot inspect request counts tracked in Instance B's memory.
- **Effective Rate Limit Multiplier:** If 5 container instances are running in an autoscaling group with equal load distribution, an attacker generating 300 requests/min will hit each instance ~60 times/min, effectively allowing 300 requests before an instance triggers a 429 response.

```text
               ┌────────────────────────────────────────────────────────┐
               │         Public Internet / Inbound HTTP Floods          │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │           Cloud Load Balancer (Round-Robin)            │
               └───────┬───────────────────┼───────────────────┬────────┘
                       │                   │                   │
                       ▼                   ▼                   ▼
                 [Instance 1]        [Instance 2]        [Instance 3]
                 (Memory: 60)        (Memory: 60)        (Memory: 60)
                       │                   │                   │
                       └───────────────────┼───────────────────┘
                                           │
                                           ▼
                           Total Throughput: ~180 req/min
```

### 4.2 Production Recommendations & Edge Architecture
To achieve strictly enforced global rate limits across horizontally autoscaled deployments:

1. **Edge WAF Enforcement (Recommended Primary Defense):** Configure rate limiting upstream at the CDN / Edge layer (e.g. Cloudflare WAF or Vercel Edge Middleware). The Edge layer aggregates traffic across all global points of presence before requests reach application compute instances.
2. **Centralized Redis Store (Secondary Option):** For API tiers requiring application-level user/workspace quotas, migrate [`src/lib/rate-limit.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/rate-limit.ts) to an atomic Redis-backed sliding window (e.g. Upstash Redis `@upstash/ratelimit`).

### 4.3 Final Assessment
- **Status:** **`CONDITIONAL PASS`**
- **Justification:** The in-memory sliding window provides robust protection against single-instance resource exhaustion and localized burst attacks. Multi-instance global rate enforcement is delegated to Edge WAF infrastructure as documented in production operational standards.
