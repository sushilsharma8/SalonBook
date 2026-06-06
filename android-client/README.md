# SalonBook Android API Client

Minimal Kotlin + Retrofit client for the **customer booking flow**. Copy the `src/` files into a new Android Studio project.

## Setup

### 1. Create an Android project

Android Studio → **New Project** → Empty Activity (Kotlin, min SDK 24+).

### 2. Add dependencies (`app/build.gradle.kts`)

```kotlin
dependencies {
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-moshi:2.11.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("com.squareup.moshi:moshi-kotlin:1.15.1")
}
```

Enable Moshi codegen (optional but recommended):

```kotlin
plugins {
    id("com.google.devtools.ksp") version "2.0.21-1.0.27"
}
dependencies {
    ksp("com.squareup.moshi:moshi-kotlin-codegen:1.15.1")
}
```

### 3. Copy source files

Copy everything under `src/main/kotlin/com/salonbook/api/` into your app's `app/src/main/java/com/salonbook/api/` (or keep the same package path).

### 4. Set your API base URL

In `ApiClient.kt`, change `BASE_URL`:

```kotlin
// Production
const val BASE_URL = "https://your-app.vercel.app/"

// Local dev (use your machine's LAN IP, not localhost)
const val BASE_URL = "http://192.168.1.42:3000/"
```

For Android emulator hitting localhost on your Mac/PC:

```kotlin
const val BASE_URL = "http://10.0.2.2:3000/"
```

Add `android:usesCleartextTraffic="true"` in `AndroidManifest.xml` only for local HTTP dev.

### 5. Internet permission

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

## Usage

```kotlin
// 1. Build client (pass token after login)
val repo = SalonBookRepository(
    baseUrl = ApiClient.BASE_URL,
    tokenProvider = { tokenStore.getToken() }
)

// 2. Login
val auth = repo.login("user@example.com", "password123")
tokenStore.saveToken(auth.token)

// 3. Browse salons
val salons = repo.listSalons()
val salon = repo.getSalon(salons.first().id)

// 4. Check slots & book
val serviceIds = listOf(salon.services.first().id)
val slots = repo.getSlots(salon.id, serviceIds, "2026-06-06")
val available = slots.slots.filter { it.available }

val booking = repo.createBooking(
    salonId = salon.id,
    serviceIds = serviceIds,
    date = "2026-06-06",
    timeUtc = available.first().time  // e.g. "10:30"
)

// 5. My bookings & cancel
val my = repo.getMyBookings()
repo.cancelBooking(my.bookings.first().id)
```

## Booking time format

The web app sends UTC ISO timestamps. `SalonBookRepository.createBooking()` builds this for you:

```
2026-06-06T10:30:00.000Z
```

Slot `time` values from `/api/slots` are `HH:mm` in UTC — pass them directly to `createBooking()`.

## Image URLs

Salon `images` may be comma-separated paths like `/uploads/salons/foo.jpg` or full Supabase URLs. Use `ImageUrlResolver.resolve()` before loading with Coil/Glide.

## Seller usage

```kotlin
// Save salon (after uploading images)
val imageUrls = repo.uploadSalonImages(listOf(photoFile))
val salon = repo.saveSellerSalon(
    SaveSalonRequest(
        name = "Glow Studio",
        address = "12 MG Road, Bangalore",
        openTime = "09:00",
        closeTime = "21:00",
        images = """["${imageUrls.urls.first()}"]""",
        categories = """{"primary":"Hair","related":["Spa"]}""",
        weeklyHours = (0..6).map { day ->
            WeeklyHoursInput(day, isOpen = day != 0, "09:00", "21:00")
        },
    )
)

// Manage services & staff
repo.addSellerService("Haircut", listOf(
    ServiceVariantInput(ServiceTargetGender.MALE, price = 300, duration = 30),
    ServiceVariantInput(ServiceTargetGender.FEMALE, price = 400, duration = 45),
))
repo.addSellerStaff("Priya", skills = "Hair, Color", gender = UserGender.FEMALE)

// Bookings
val bookings = repo.getSellerBookings()
repo.confirmBooking(bookings.first().id)
```

## Admin usage

```kotlin
val stats = repo.getAdminStats()          // users, salons, bookings, revenue
val users = repo.getAdminUsers()
repo.reactivateUser(users.first().id)
repo.deleteUser(userId)

val salons = repo.getAdminSalons()
val salon = repo.getAdminSalon(salons.first().id)
repo.updateAdminSalon(salon.id, UpdateAdminSalonRequest(...))
repo.addAdminSalonService(salon.id, "Facial", variants)
repo.deleteAdminSalonStaff(salon.id, staffId)
```

## OpenAPI spec

Full API documentation: [`../docs/openapi.yaml`](../docs/openapi.yaml)

Import into [Postman](https://www.postman.com/) or [Swagger Editor](https://editor.swagger.io/) for testing.
