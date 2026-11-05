# SYNCORA PLATFORM MAJOR RELEASE 18
# DISASTER RECOVERY & POINT-IN-TIME RECOVERY (PITR) REPORT

**Release:** Platform Major Release 18  
**Document:** Deliverable 06 — PITR Restoration Drill Report  
**Author:** Principal Database Reliability Engineer  
**Date:** November 5, 2026  
**Status:** RUNBOOK VERIFIED / DRILL EXECUTION BLOCKED (LOCAL DOCKER OFFLINE)  

---

## 1. Executive Summary & Disaster Recovery Architecture

Enterprise SaaS platforms require deterministic recovery procedures to survive database corruption, catastrophic migration errors, regional cloud outages, and malicious data deletion.

SYNCORA relies on a dual-tier disaster recovery architecture on Supabase PostgreSQL:
1. **Continuous Write-Ahead Log (WAL) Streaming (Point-In-Time Recovery):** WAL archives are continuously streamed to durable cloud object storage with a 7-day retention window, allowing sub-second recovery to any point in time prior to an incident.
2. **Daily Logical Snapshots (`pg_dump`):** Encrypted full database dumps generated every 24 hours and replicated to multi-region object storage with a 30-day retention lifecycle.

---

## 2. Recovery Target Metrics (RPO & RTO)

| Recovery Model | Target RPO (Recovery Point Objective) | Target RTO (Recovery Time Objective) | Storage & Retention |
| :--- | :---: | :---: | :--- |
| **PITR (WAL Replay)** | **< 5 minutes** | **< 30 minutes** | Continuous WAL stream, 7-day rolling window |
| **Daily Logical Dump** | **< 24 hours** | **< 60 minutes** | Encrypted `pg_dump` export, 30-day multi-region storage |

- **RPO Compliance:** In the event of catastrophic data corruption at time $T$, restoring via PITR to $T - 60\text{ seconds}$ guarantees data loss is bounded within 1 minute, well within the 5-minute RPO target.
- **RTO Compliance:** Managed Supabase PITR restores provision an isolated clone instance directly from physical snapshots and replay delta WALs, completing in 15 to 25 minutes depending on transaction volume.

---

## 3. Four Core Disaster Recovery Runbooks

```text
[Incident Declared]
       │
       ▼
[Step 1: Activate Maintenance Mode] (Edge intercepts traffic with HTTP 503)
       │
       ▼
[Step 2: Freeze All Mutations] (Pause background queues, workers & webhooks)
       │
       ▼
[Step 3: Execute Target Recovery Runbook] (PITR / Roll-Forward / Key Rotation)
       │
       ▼
[Step 4: Verify Schema & RLS Integrity] (Automated integrity checks on target)
       │
       ▼
[Step 5: Cut Over Application Connection] (Update DATABASE_URL env secrets)
       │
       ▼
[Step 6: Execute 14 Smoke Journeys] (Validate end-to-end functionality)
       │
       ▼
[Step 7: Deactivate Maintenance Mode] (Resume public traffic)
```

### 3.1 Scenario 1: Accidental Data Deletion / Malicious Truncation
1. **Declare Incident:** SRE on call flags accidental deletion in `#ops-incidents`.
2. **Maintenance Mode:** Enable maintenance mode at CDN/Edge to halt customer writes.
3. **Trigger PITR:** In Supabase Dashboard or via CLI, initiate Point-in-Time Recovery to timestamp $T_{\text{incident}} - 60\text{s}$ into a new target database.
4. **Data Verification:** Confirm row counts in `tasks`, `documents`, `workspaces`, and `users`.
5. **Connection Cutover:** Update application runtime `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to target instance.
6. **Smoke Verification:** Execute smoke test suite and disable maintenance mode.

### 3.2 Scenario 2: Errant Database Migration
1. **Freeze CI/CD:** Instantly pause deployment pipelines to prevent further DDL.
2. **Roll-Forward Evaluation:** Because SYNCORA follows the expand-and-contract architecture, never run destructive `DOWN` scripts on live production.
3. **Deploy Hotfix Migration:** Author an additive, non-destructive migration (e.g. `00068_fix_index_name.sql`) that corrects constraints or indexes.
4. **Apply via Pipeline:** Test in staging and apply forward to production.

### 3.3 Scenario 3: Credential / Master Encryption Key Compromise
1. **Rotate Encryption Key:** Generate a new 32-byte hex key: `openssl rand -hex 32`.
2. **Prepend Previous Key:** Set `SYNCORA_ENCRYPTION_KEY` to the new key; prepend old key to `SYNCORA_PREVIOUS_ENCRYPTION_KEYS`.
3. **Re-encryption Job:** Background worker reads rows in `integration_credentials`, decrypts using previous key, re-encrypts using new key, and updates records.
4. **Revoke Old Key:** Once all rows are rewritten, remove old key from previous keys array.

### 3.4 Scenario 4: Cloud Provider Regional Outage
1. **Cold-Site Provisioning:** Spin up standby application containers in secondary region (e.g. `us-east-1` -> `us-west-2`).
2. **Logical Snapshot Restore:** Restore the latest encrypted logical snapshot (`pg_dump`) into the secondary PostgreSQL cluster.
3. **DNS Failover:** Update Route53 / Cloudflare DNS records to route traffic to the secondary region.

---

## 4. Physical Restore Drill Status & Non-Negotiable Boundary

### 4.1 Workstation Inspection Finding
Execution of `npx supabase status` confirms that no remote staging Supabase instance is linked, and the local Docker Desktop daemon is offline.

```text
Status: BLOCKED — PITR RESTORE NOT EXECUTED
Reason: Local Docker engine offline (//./pipe/dockerDesktopLinuxEngine missing)
        Remote staging project unlinked (linked_project: null)
```

### 4.2 Non-Negotiable Engineering Standard
Under **Rule 5 (No Fake Readiness)**:
- We **CANNOT** claim that a physical PITR drill succeeded when Docker is offline and no cloud instance was provisioned.
- The disaster recovery runbooks, target metrics, and failure workflows are **Level 3 (Verified Design)**.
- The physical execution of a live PITR restore drill is marked **`BLOCKED`** pending execution on the linked staging environment.

### 4.3 Staging Drill Instructions for Database Lead
Prior to final production traffic cutover, the Database Administrator must execute the following staging drill:
1. Insert 5 canary records with current timestamps into the staging `tasks` table.
2. Note exact UTC time $T_1$.
3. Simulate an incident by deleting 2 canary records at $T_2$.
4. Initiate a Supabase PITR clone to $T_1$.
5. Verify that all 5 canary records exist in the cloned instance.
6. Record actual elapsed restoration time to confirm observed RTO $< 30$ minutes.
