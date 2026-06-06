# Security Specification: AgriVision AI Cloud Security Model

This document outlines the rigorous, zero-trust security policies and database invariants for the AgriVision AI platform.

## 1. Data Invariants & Access Policies

- **User Collection**: Keyed by `userId`. An authenticated user may read and write only their own profile.
- **Crop Analysis**: An authenticated user may read and create analysis reports under their own `userId`. They can never modify a crop analysis report after creation (read/insert only; updates prohibited).
- **Soil Reports**: Read & insert only. Checked with exact field structural counts to prevent phantom injections.
- **Weather Reports**: Read & insert only. Users can generate agrometeorological reports; can read only reports with `userId == request.auth.uid`.
- **AI Chats**: Read & insert only. Chat histories of previous conversations.
- **Environmental Reports**: Read & insert only. Prevent anonymous spam.

---

## 2. Invalidation & Data Protection (The "Dirty Dozen" Payloads)

### Payload 1: Unauthorized Profile Manipulation
- **Attack**: Try to register/modify user profile with `userId` of a target victim.
- **Status**: `PERMISSION_DENIED` - UID lock in `users/{userId}` match blocks fake user ownership.

### Payload 2: Disease Report Creation For Another User
- **Attack**: Insert `CropAnalysis` setting `userId` to a target user.
- **Status**: `PERMISSION_DENIED` - The rule forces `incoming().userId == request.auth.uid`.

### Payload 3: Injected Admin Field
- **Attack**: Adding `isAdmin` or `role: "admin"` to a User document.
- **Status**: `PERMISSION_DENIED` - Schema validation forbids `isAdmin` or role keys.

### Payload 4: Invalid Format Crop Name (Junk characters)
- **Attack**: Crop analysis with crop_name > 128 characters or special symbols.
- **Status**: `PERMISSION_DENIED` - Size validation limits sizes of cropName.

### Payload 5: Spoofed High-Confidence Match
- **Attack**: Post a manual CropAnalysis setting confidence of 1000%.
- **Status**: `PERMISSION_DENIED` - Confidence float must strictly be `<= 100` and `>= 0`.

### Payload 6: Soil pH Overflow
- **Attack**: Injecting soil pH of `99.9` or `-5`.
- **Status**: `PERMISSION_DENIED` - Enforced boundary `ph >= 0 && ph <= 14`.

### Payload 7: Phantom Soil Water Level
- **Attack**: Posting moisture of `500%`.
- **Status**: `PERMISSION_DENIED` - Moisture percentage must be `<= 100` and `>= 0`.

### Payload 8: Anonymous Chat Logging
- **Attack**: Submitting a chatbot question without logging in.
- **Status**: `PERMISSION_DENIED` - Require `isSignedIn()` authentication on all writes.

### Payload 9: Mutation of Historic Crop Diagnosis
- **Attack**: Modifying `diseaseName` or any field on an existing `CropAnalysis`.
- **Status**: `PERMISSION_DENIED` - `allow update` is disabled (`if false`), ensuring historic records are immutable write-once registers.

### Payload 10: Injected Giant Payload (Denial-of-Wallet)
- **Attack**: Submitting an extremely long symptoms string (>10,000 characters).
- **Status**: `PERMISSION_DENIED` - Enforced boundary sizing on strings.

### Payload 11: Cross-User List Query Scraping
- **Attack**: Query all crop analyses in the database without filtering by `userId`.
- **Status**: `PERMISSION_DENIED` - Secured list queries require checking `resource.data.userId == request.auth.uid`.

### Payload 12: Invalid Timestamp Forging
- **Attack**: Submission of historic dates in `createdAt`.
- **Status**: `PERMISSION_DENIED` - Timestamp must match `request.time`.
