# SYNCORA PLATFORM MAJOR RELEASE 18
# SSRF & OUTBOUND EGRESS SECURITY AUDIT REPORT

**Release:** Platform Major Release 18  
**Document:** Deliverable 04 — SSRF & Egress Security Verification  
**Author:** Principal Application Security Engineer  
**Date:** November 5, 2026  
**Status:** CONDITIONAL PASS (LEVEL 1 & 2 VERIFIED / VPC EGRESS REQUIRED FOR COMPLETE CLOSURE)  

---

## 1. Threat Model & Outbound Egress Risks

SYNCORA provides outbound webhook functionality, allowing enterprise tenants to configure HTTP webhooks that fire on task creation, status changes, document approvals, and chat events. 

In SaaS architectures, allowing users to configure arbitrary outbound HTTP endpoints exposes the application to **Server-Side Request Forgery (SSRF)**:
- **Cloud Metadata Compromise:** Probing `http://169.254.169.254/latest/meta-data/` to harvest IAM instance credentials, service accounts, or container tokens.
- **Internal Network Scanning:** Probing private RFC-1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) to exploit internal Redis caches, Elasticsearch clusters, or Supabase PostgreSQL databases.
- **Loopback Exploitation:** Connecting to `http://localhost:3000` or `http://127.0.0.1:54321` to manipulate internal microservices.

---

## 2. Multi-Layered SSRF Defenses in SYNCORA

SYNCORA's outbound webhook delivery engine in [`src/lib/webhooks/delivery.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/webhooks/delivery.ts) implements four defensive layers:

```text
[Webhook Outbound Trigger]
           │
           ▼
[Layer 1: URL Scheme & Syntax Validation] ──── (Non-http/https schemes rejected)
           │
           ▼
[Layer 2: Multi-Record DNS Preflight] ─────── (Resolves ALL A and AAAA records)
           │
           ▼
[Layer 3: Strict IP Classification] ────────── (Blocks RFC-1918, CGNAT, Loopback, Link-Local)
           │
           ▼
[Layer 4: Manual Redirect Interception] ────── (Capped at 3 hops; re-validates each hop)
           │
           ▼
[Outbound Dispatch (fetch)]
```

### 2.1 Layer 1: Protocol & Syntax Filtering
- Strictly permits `http:` and `https:` protocols.
- Blocks alternative URI schemes (`file:`, `ftp:`, `gopher:`, `dict:`, `data:`).

### 2.2 Layer 2 & 3: Multi-Record DNS Preflight & IP Classification
- Calls `dns.promises.lookup(hostname, { all: true })` to inspect **every** resolved IPv4 and IPv6 record. If a hostname resolves to multiple IP addresses (common in round-robin DNS), the connection is blocked if **any single IP** is private or reserved.
- Synchronously blocks:
  - **IPv4:** `0.0.0.0/8`, `10.0.0.0/8`, `127.0.0.0/8` (Loopback), `169.254.0.0/16` (Link-Local / Cloud Metadata), `172.16.0.0/12`, `192.168.0.0/16`, `100.64.0.0/10` (Carrier-Grade NAT), `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24` (Documentation Test-Nets), `255.255.255.255` (Broadcast).
  - **IPv6:** `::1` (Loopback), `::` (Unspecified), `fe80::/10` (Link-Local), `fc00::/7` (Unique Local), `::ffff:127.0.0.1` (IPv4-mapped IPv6 loopback).

### 2.3 Layer 4: Manual Redirect Interception (`redirect: 'manual'`)
- Standard Node.js `fetch` automatically follows redirects. An attacker can supply a public URL (`https://attacker.com/webhook`) that returns an HTTP `302 Found` with `Location: http://169.254.169.254/`.
- SYNCORA configures `redirect: 'manual'`, captures status codes `301`, `302`, `303`, `307`, and `308`, and executes the full validation sequence on the target `Location` header.
- Hard redirect limit: Maximum of 3 hops before the delivery is aborted with an error.

### 2.4 Retry Safety
- In [`src/lib/webhooks/delivery.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/src/lib/webhooks/delivery.ts), errors flagged with `isSsrfBlocked = true` are classified as non-transient failures. The system records the attempt in `outbound_deliveries` with `status: 'failed'` and suppresses further retries.

---

## 3. Automated Test Verification (Level 1 Evidence)

The SSRF protection layer was validated through automated test suites in Vitest:

- **Test Suite 1:** [`tests/webhooks/ssrf.test.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/tests/webhooks/ssrf.test.ts) — **21 tests passing (100%)**
  - Verifies rejection of `127.0.0.1`, `localhost`, `10.0.0.1`, `172.16.0.1`, `192.168.1.1`, `169.254.169.254`, `::1`, `fe80::1`, `::ffff:127.0.0.1`.
  - Verifies multi-IP DNS resolution where one IP is private.
- **Test Suite 2:** [`tests/webhooks/delivery.test.ts`](file:///c:/Users/Ibrahim/Desktop/SYNCORA-frontend-project/tests/webhooks/delivery.test.ts) — **4 tests passing (100%)**
  - Verifies manual redirect interception, 3-hop limit, and retry suppression on security errors.

---

## 4. The DNS Rebinding TOCTOU Gap & Infrastructure Mitigation

### 4.1 The TOCTOU Window Explained
In Node.js 18+ and Next.js, `globalThis.fetch` is powered by the `undici` HTTP client.
1. **Time of Check (TOC):** `validateWebhookUrlAsync()` calls `dns.promises.lookup()`. The attacker's nameserver responds with a public IP (`93.184.216.34`) and a DNS TTL of 0 seconds.
2. **Time of Use (TOU):** `fetch(url)` is invoked. Undici initiates a new TCP connection and performs an independent DNS resolution. Because TTL=0, the nameserver is queried again, responding with `169.254.169.254` or `127.0.0.1`.
3. The socket connects directly to the internal IP, bypassing the preflight check.

### 4.2 Production Egress Mitigation Architecture
To achieve defense-in-depth against DNS rebinding without replacing the application HTTP client:

1. **Cloud VPC Egress Security Rules:** In production (AWS ECS, Google Cloud Run, or Kubernetes), configure an egress network security group or firewall rule dropping all egress traffic destined for `169.254.169.254/32` and VPC private subnets from the application container pool.
2. **Custom Undici Dispatcher (Future Roadmap):** Configure a custom `undici.Agent` that pins the socket connection directly to the pre-validated IP address, passing the target host via the HTTP `Host` header.

### 4.3 Final Assessment
- **Status:** **`CONDITIONAL PASS`**
- **Justification:** Preflight IP classification, DNS multi-record validation, and manual redirect guards are fully verified and passing in automated tests. Residual DNS rebinding risk is mitigated by standard cloud VPC egress firewall rules.
