# SalonBook Android — Google AI Studio Pack

Use this document + attached files when building the Android app in Google AI Studio.

---

## COPY THIS PROMPT INTO GOOGLE AI STUDIO

```
Build a native Android app (Kotlin + Jetpack Compose) for "SalonBook" — a salon discovery and booking platform in India.

## Backend
- REST JSON API (already built and deployed)
- Base URL: REPLACE_WITH_YOUR_API_URL (must end with /)
  Examples:
  - Production: https://your-app.vercel.app/
  - Local emulator: http://10.0.2.2:3000/
- Auth: JWT Bearer token in header: Authorization: Bearer <token>
- Errors: JSON { "error": "message" }

## Use the attached Kotlin API client
I am providing pre-built Retrofit/Moshi files under package `com.salonbook.api`:
- ApiClient.kt, SalonBookApi.kt, SalonBookRepository.kt, Models.kt
- AuthInterceptor.kt, ImageUrlResolver.kt, MultipartHelper.kt

DO NOT rewrite the networking layer from scratch. Integrate these files and build UI on top of SalonBookRepository.

Gradle dependencies required:
- retrofit2:2.11.0, converter-moshi:2.11.0
- okhttp3 logging-interceptor:4.12.0
- moshi-kotlin:1.15.1
- coil-compose (images)
- androidx.navigation (Compose)
- DataStore or EncryptedSharedPreferences for JWT storage

## App scope — 3 roles after login
Route users by user.role: CUSTOMER | SELLER | ADMIN

### CUSTOMER screens
1. Login / Register (phone required, gender required for customers)
2. Salon list (name, address, rating, service count) — GET /api/salons
3. Salon detail (services with gender variants, reviews, hours, staff) — GET /api/salons/:id
4. Booking flow: pick services → pick date → fetch slots — GET /api/slots?salonId=&serviceIds=&date=
5. Confirm booking — POST /api/bookings with time as UTC ISO: yyyy-MM-ddTHH:mm:00.000Z
6. My bookings — GET /api/bookings/my (cancel via PUT /api/bookings/:id/status { status: "CANCELLED" })
7. Leave review after COMPLETED visit — POST /api/reviews
8. Edit profile (name, phone, gender) — PUT /api/users/profile

### SELLER screens
1. My salon setup (name, address, hours, categories, photos)
2. Upload photos — multipart POST /api/seller/upload-images
3. Save salon — POST /api/seller/salon
4. Add/delete services (variants: MALE/FEMALE/UNISEX with price + duration in minutes)
5. Add/delete staff
6. Incoming bookings list — confirm / complete / cancel / no-show

### ADMIN screens
1. Dashboard stats (users, salons, bookings, revenue)
2. User list — delete / reactivate
3. Salon list — manage any salon, services, staff, bookings

## Important business rules
- Customer gender must be set before checking slots or booking
- Slot times from API are HH:mm in UTC; repository.createBooking() builds the ISO timestamp
- Salon images field may be JSON string array OR comma-separated URLs; some are relative (/uploads/...) — use ImageUrlResolver.resolve(baseUrl, url)
- Prices are integers in INR (₹)
- Indian phone: 10 digits starting 6-9
- Payment is pay-at-shop (no in-app payment gateway)

## UI / UX
- Material 3, clean modern salon app aesthetic
- Primary flows: browse → book → manage bookings
- Loading states, error toasts from SalonBookApiException.message
- Pull-to-refresh on lists
- Bottom nav for customer: Home | Bookings | Profile

## Demo test accounts (if API has seed data)
- Customer: customer1@example.com / password123 (gender MALE)
- Seller: seller1@example.com / password123
- Admin: admin@example.com / password123

## Deliverables
- Complete Android Studio project structure
- AndroidManifest with INTERNET permission
- Token persisted across app restarts
- ApiClient.BASE_URL as a single configurable constant
- For local HTTP dev only: usesCleartextTraffic=true

## Out of scope (do not build unless asked)
- In-app payments
- Push notifications
- OAuth / Google Sign-In
```

---

## FILES TO UPLOAD / ATTACH IN AI STUDIO

### Required (minimum set)

| File | Path in repo |
|------|----------------|
| OpenAPI spec | `docs/openapi.yaml` |
| API README | `android-client/README.md` |
| Models | `android-client/src/main/kotlin/com/salonbook/api/Models.kt` |
| Retrofit interface | `android-client/src/main/kotlin/com/salonbook/api/SalonBookApi.kt` |
| Repository | `android-client/src/main/kotlin/com/salonbook/api/SalonBookRepository.kt` |
| HTTP client setup | `android-client/src/main/kotlin/com/salonbook/api/ApiClient.kt` |
| Auth interceptor | `android-client/src/main/kotlin/com/salonbook/api/AuthInterceptor.kt` |
| Image URL helper | `android-client/src/main/kotlin/com/salonbook/api/ImageUrlResolver.kt` |
| Multipart helper | `android-client/src/main/kotlin/com/salonbook/api/MultipartHelper.kt` |
| This pack | `docs/google-ai-studio-android-pack.md` |

### Optional (reference only)

| File | Why |
|------|-----|
| `server.ts` | Full server source if AI needs edge-case behavior |
| `prisma/schema.prisma` | Exact data model |
| `src/pages/SalonDetails.tsx` | Web booking flow reference |
| `src/pages/CustomerDashboard.tsx` | My bookings / cancel / review reference |
| `src/pages/SellerDashboard.tsx` | Seller dashboard reference |

---

## BEFORE YOU START — FILL IN THESE VALUES

Replace placeholders in the prompt:

1. **API_BASE_URL** — your live URL, e.g. `https://salonbook-xxx.vercel.app/`
2. Confirm seed data exists (`npm run seed`) if using demo accounts

---

## QUICK ZIP COMMAND (share all required files)

From project root:

```bash
zip -r salonbook-android-pack.zip \
  docs/openapi.yaml \
  docs/google-ai-studio-android-pack.md \
  android-client/README.md \
  android-client/src/main/kotlin/com/salonbook/api/
```

Upload `salonbook-android-pack.zip` to Google AI Studio.

---

## API ENDPOINT CHEAT SHEET

| Method | Path | Auth | Role |
|--------|------|------|------|
| POST | /api/auth/login | No | All |
| POST | /api/auth/register | No | CUSTOMER/SELLER |
| GET | /api/salons | No | All |
| GET | /api/salons/:id | No | All |
| GET | /api/slots | Bearer | CUSTOMER |
| POST | /api/bookings | Bearer | CUSTOMER |
| GET | /api/bookings/my | Bearer | CUSTOMER |
| PUT | /api/bookings/:id/status | Bearer | All (rules apply) |
| POST | /api/reviews | Bearer | CUSTOMER |
| PUT | /api/users/profile | Bearer | All |
| GET | /api/seller/salon | Bearer | SELLER |
| POST | /api/seller/salon | Bearer | SELLER |
| POST | /api/seller/upload-images | Bearer | SELLER |
| POST | /api/seller/services | Bearer | SELLER |
| POST | /api/seller/staff | Bearer | SELLER |
| GET | /api/seller/bookings | Bearer | SELLER |
| GET | /api/admin/stats | Bearer | ADMIN |
| GET | /api/admin/users | Bearer | ADMIN |
| GET | /api/admin/salons | Bearer | ADMIN |

Full list: see `docs/openapi.yaml` and `SalonBookApi.kt`.

---

## NOTE ON NEWER SERVER ENDPOINTS

The live server may also expose menu OCR endpoints not yet in the Kotlin client:
- POST /api/seller/services/extract-from-menu
- POST /api/seller/services/bulk
- POST /api/admin/salons/:id/services/extract-from-menu

You can skip these in v1 of the Android app or add them later.
