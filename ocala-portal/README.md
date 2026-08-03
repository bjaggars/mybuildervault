# Ocala Portal — Eat-Our-Own-Dog-Food Reference

This is the working instance of the concept that became MyBuilderVault.
Built during the Jaggars/Brije custom home build in Ocala, FL.

**Live URL:** jaggars-ocala-build.netlify.app  
**Stack:** Single-file HTML, Firebase Firestore, Firebase Storage, Netlify (drag-deploy)  
**Purpose:** UX/feature reference for MyBuilderVault product development. Demo vehicle for Eric meeting.

## What this is NOT
- Not the MyBuilderVault product
- Not multi-tenant
- Not on the JSH doctrine stack
- Not the shipping artifact

## What this IS
- Proof the concept works end-to-end
- 11 pages, 117 functions, fully working in production
- The demo Brice shows Eric to make it real

## Secrets
Firebase config and admin password are redacted in this file.
The live deployment has real credentials in Netlify env vars (not committed anywhere).

## Features implemented
Dashboard, Timeline/Phases, Budget (with base price breakdown), Change Orders (full status 
workflow incl. Included status), Selections, Action Items, Meetings, Decisions, Contacts,
Document Vault, Reports Hub, Excel export (matches Brije PDF format), Rich-text email
reports, Builder/Admin view toggle, Photo upload with compression, Real-time Firebase sync.
