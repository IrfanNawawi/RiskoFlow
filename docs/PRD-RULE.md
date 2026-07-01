# PRD Authoring Rule (Production Ready)

## Scope

Rule ini berlaku untuk seluruh file Product Requirement Document (`**/PRD*.md`) yang dibuat, diubah, maupun direvisi.

Termasuk:

* Membuat PRD baru
* Feature enhancement
* Bug fix requirement
* Feature deprecation
* Requirement clarification
* Requirement refactoring
* Requirement versioning

Template utama yang digunakan:

```
docs/PRD-TEMPLATE.md
```

---

# Objectives

Semua PRD harus:

* Konsisten
* Mudah dipahami Product, Designer, QA, Backend, Frontend, Mobile
* Menjadi single source of truth
* Dapat diturunkan menjadi Technical Design tanpa asumsi berlebihan
* Production Ready

---

# Mandatory Rules

## 1. Template

Gunakan struktur section dari `PRD-TEMPLATE.md` **secara identik**.

Dilarang:

* menghapus section
* menambah section
* mengubah urutan section

kecuali diminta secara eksplisit.

---

## 2. Core Feature Format

Setiap fitur wajib memiliki format berikut.

```text
Description
Business Value
User Story
Business Rules
Validation Rules
Inputs
Outputs
Permissions
Failure Scenarios
Edge Cases
Dependencies
Analytics Events
```

---

## 3. Functional Requirement

Setiap Functional Requirement WAJIB memiliki:

```text
Requirement ID
Description
Acceptance Criteria
Priority
Dependencies
Risk
```

Priority menggunakan standar:

```
Must
Should
Could
Won't
```

(MoSCoW)

---

## 4. Acceptance Criteria

Acceptance Criteria wajib:

* testable
* measurable
* objective
* tidak ambigu

Contoh:

✅

```
Given user has logged in
When user submits payment
Then payment history appears within 2 seconds
```

❌

```
System should work correctly
```

---

## 5. Non Functional Requirements

Setiap PRD wajib menjelaskan:

```
Performance
Security
Accessibility
Availability
Scalability
Localization
Offline Support
Logging
Monitoring
Backup & Recovery
```

---

## 6. API Contract

Jika terdapat API, wajib dijelaskan minimal:

```
Method
Endpoint
Headers
Authentication
Request
Response
Error Response
Rate Limit
```

---

## 7. Data Model

ER Diagram wajib menggunakan Mermaid.

Selain ERD, setiap entity wajib memiliki:

```
Field
Type
Nullable
Default
Constraint
Description
```

---

## 8. Diagram

Diagram hanya menggunakan Mermaid.

Diizinkan:

```
flowchart
sequenceDiagram
erDiagram
stateDiagram
classDiagram
```

Dilarang:

* screenshot
* draw.io export
* PNG
* JPG

---

## 9. Decision Log

Semua perubahan requirement wajib dicatat.

Format:

| Date | Version | Decision | Reason | Impact |
| ---- | ------- | -------- | ------ | ------ |

Jenis decision:

* Product
* Business
* UX
* Technical

Impact harus menjelaskan:

* Breaking Change
* Migration Required
* API Changed
* Database Changed
* UI Changed
* None

---

## 10. Versioning

Gunakan Semantic Versioning.

```
Major.Minor.Patch
```

Contoh

```
1.0.0
Major
breaking requirement
Minor
new feature
Patch
clarification
```

Setiap perubahan signifikan wajib:

* update Version
* update Last Updated
* update Decision Log

---

## 11. Traceability

Semua requirement harus dapat ditelusuri.

Contoh:

```
FR-001
↓
AC-001
↓
TC-001
```

Gunakan format:

```
FR-xxx
NFR-xxx
UC-xxx
AC-xxx
TC-xxx
```

---

# Required Sections

Setiap PRD wajib memiliki informasi berikut.

## Functional Requirements

Lengkap dengan Acceptance Criteria.

---

## Non Functional Requirements

Performance
Security
Accessibility
Availability
Offline
Monitoring
Logging

---

## Risks

Minimal mencakup:

```
Technical Risk
Business Risk
Migration Risk
Dependency Risk
```

---

## Assumptions

Semua asumsi harus dijelaskan.

Contoh:

```
Internet tersedia
GPS aktif
Camera permission diberikan
User sudah login
```

---

## Open Questions

Jika masih ada keputusan yang belum ditentukan, wajib dicatat.

Contoh:

```
OCR Provider?
Payment Gateway?
Notification Provider?
Storage Provider?
```

AI tidak boleh membuat asumsi terhadap Open Questions.

---

## Analytics

Setiap fitur wajib mendefinisikan event analytics.

Contoh:

```
Screen Viewed
Button Clicked
Submit Success
Submit Failed
Retry
Conversion
```

---

## Error States

Setiap fitur harus memiliki:

```
Loading
Empty
Offline
Timeout
Retry
Validation Error
Unknown Error
```

---

## Security Checklist

Setiap fitur harus menjelaskan:

```
Authentication
Authorization
Sensitive Data
PII
Encryption
Audit Log
Rate Limit
Fraud Prevention
Abuse Prevention
```

---

# Default Technology Stack

Apabila PRD tidak menentukan stack lain, gunakan standar berikut.

## Mobile

* React Native 0.74+ (New Architecture)
* TypeScript Strict Mode
* React Navigation v6
* Zustand
* TanStack Query
* React Hook Form
* Zod
* Axios
* MMKV
* WatermelonDB
* NativeWind
* Reanimated
* Gesture Handler
* Shared Element
* Socket.IO
* React Native Keychain
* AES-256 Encryption
* Jest
* React Native Testing Library
* Maestro
* Sentry
* EAS Build
* Golang atau Supabase

---

## Web

* Next.js 14+ App Router
* TypeScript Strict
* Zustand
* TanStack Query
* React Hook Form
* Zod
* Axios
* Tailwind CSS
* Shadcn/UI
* Framer Motion
* Socket.IO
* HttpOnly Cookie
* Web Crypto API
* Jest / Vitest
* RTL
* GitHub Actions
* Docker
* Vercel

---

## Backend

* Go 1.21+
* Fiber / Gin
* PostgreSQL
* GORM / sqlx
* Redis
* golang-migrate
* validator
* bcrypt
* JWT / PASETO
* Testify
* Mockery

---

# Engineering Deliverables

Apabila PRD meminta implementasi teknis, hasil minimal harus mencakup:

## Mobile

* Feature-based Architecture
* Typed Navigation
* TanStack Query Configuration
* Global Error Handling
* Zustand Persist (MMKV)
* Custom API Hooks
* Dark Mode
* React Hook Form + Zod
* Unit Test
* SOLID
* KISS

---

## Web

* Feature-based Architecture
* App Router
* TanStack Query
* SSR-friendly Configuration
* Zustand Persist
* Custom Hooks
* Dark Mode
* React Hook Form
* Zod
* Unit Test
* SOLID
* KISS

---

## Backend

* Clean Architecture / DDD
* Repository Pattern
* Service Layer
* Dependency Injection
* Global Error Middleware
* Redis Cache
* Strict Validation
* Unit Test
* SOLID
* KISS

---

# Definition of Done

PRD dianggap selesai apabila:

* Seluruh placeholder (`{{...}}`) telah terisi.
* Semua Functional Requirement memiliki Acceptance Criteria.
* Semua Non Functional Requirement telah didefinisikan.
* Semua API memiliki Request dan Error Response.
* Semua Entity memiliki tipe data lengkap.
* Semua perubahan tercatat di Decision Log.
* Version dan Last Updated telah diperbarui.
* Seluruh Open Questions telah diselesaikan atau didokumentasikan.
* Risks telah diidentifikasi.
* Analytics Events telah didefinisikan.
* Security Checklist telah dilengkapi.
* Diagram Mermaid dapat dirender tanpa error.
* Requirement dapat ditelusuri hingga Acceptance Criteria dan Test Case (Traceability).

---

# Prohibited

Dilarang:

* Mengubah struktur `PRD-TEMPLATE.md` tanpa instruksi eksplisit.
* Mengubah Tech Stack tanpa mencatat alasannya di Decision Log.
* Menambahkan requirement yang bertentangan dengan Non Goals.
* Membuat requirement tanpa Acceptance Criteria.
* Membuat API tanpa Error Response.
* Membuat Entity tanpa tipe data.
* Menggunakan placeholder `{{...}}` pada PRD final.
* Menggunakan istilah ambigu seperti "sebaiknya", "mungkin", atau "sesuai kebutuhan" tanpa penjelasan.
* Menambahkan dependency baru tanpa mencatat alasan pada Decision Log.
* Menjadikan asumsi sebagai requirement.
* Menggunakan lebih dari satu `TBD` pada satu section.
* Menambahkan scope baru yang sudah ditetapkan sebagai Out of Scope.
* Menggunakan diagram selain Mermaid.
* Menyisipkan gambar eksternal sebagai pengganti diagram.
* Menyatakan PRD selesai apabila masih terdapat informasi yang belum lengkap atau belum tervalidasi.