package com.salonbook.api

import com.squareup.moshi.JsonClass

enum class UserGender { MALE, FEMALE, OTHER }

enum class UserRole { CUSTOMER, SELLER, ADMIN }

enum class BookingStatus {
    PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW
}

enum class ServiceTargetGender { MALE, FEMALE, UNISEX }

// --- Auth ---

@JsonClass(generateAdapter = true)
data class LoginRequest(
    val email: String,
    val password: String,
)

@JsonClass(generateAdapter = true)
data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String,
    val phone: String,
    val role: String = "CUSTOMER",
    val gender: UserGender? = null,
)

@JsonClass(generateAdapter = true)
data class User(
    val id: String,
    val name: String,
    val email: String?,
    val role: UserRole,
    val phone: String?,
    val gender: UserGender?,
)

@JsonClass(generateAdapter = true)
data class AuthResponse(
    val token: String,
    val user: User,
)

// --- Salons ---

@JsonClass(generateAdapter = true)
data class SalonListItem(
    val id: String,
    val name: String,
    val address: String,
    val images: String?,
    val categories: String?,
    val openTime: String,
    val closeTime: String,
    val serviceCount: Int?,
    val reviewCount: Int?,
    val avgRating: Double?,
)

@JsonClass(generateAdapter = true)
data class ServiceVariant(
    val id: String,
    val serviceId: String,
    val targetGender: ServiceTargetGender,
    val price: Int,
    val duration: Int,
)

@JsonClass(generateAdapter = true)
data class Service(
    val id: String,
    val salonId: String,
    val name: String,
    val variants: List<ServiceVariant>?,
)

@JsonClass(generateAdapter = true)
data class SalonHours(
    val id: String?,
    val dayOfWeek: Int,
    val isOpen: Boolean,
    val startTime: String,
    val endTime: String,
)

@JsonClass(generateAdapter = true)
data class Staff(
    val id: String,
    val salonId: String,
    val name: String,
    val gender: UserGender?,
    val skills: String?,
    val isActive: Boolean?,
)

@JsonClass(generateAdapter = true)
data class Review(
    val id: String,
    val userId: String?,
    val salonId: String?,
    val rating: Int,
    val comment: String?,
    val createdAt: String?,
    val user: ReviewUser?,
)

@JsonClass(generateAdapter = true)
data class ReviewUser(
    val name: String,
)

@JsonClass(generateAdapter = true)
data class SalonOwner(
    val name: String,
    val phone: String?,
)

@JsonClass(generateAdapter = true)
data class SalonDetail(
    val id: String,
    val name: String,
    val address: String,
    val images: String?,
    val categories: String?,
    val openTime: String,
    val closeTime: String,
    val lat: Double?,
    val lng: Double?,
    val services: List<Service>?,
    val hours: List<SalonHours>?,
    val staff: List<Staff>?,
    val reviews: List<Review>?,
    val owner: SalonOwner?,
)

// --- Bookings ---

@JsonClass(generateAdapter = true)
data class TimeSlot(
    val time: String,
    val available: Boolean,
)

@JsonClass(generateAdapter = true)
data class SlotsResponse(
    val slots: List<TimeSlot>,
    val reason: String? = null,
    val message: String? = null,
)

@JsonClass(generateAdapter = true)
data class CreateBookingRequest(
    val salonId: String,
    val serviceIds: List<String>,
    val time: String,
    val staffId: String? = null,
)

@JsonClass(generateAdapter = true)
data class Booking(
    val id: String,
    val userId: String,
    val salonId: String,
    val staffId: String,
    val startTime: String,
    val endTime: String,
    val totalAmount: Int,
    val status: BookingStatus,
    val paymentStatus: String?,
    val actionToken: String?,
    val createdAt: String?,
    val salon: SalonDetail?,
    val services: List<BookingServiceItem>?,
    val staff: Staff?,
)

@JsonClass(generateAdapter = true)
data class BookingServiceItem(
    val id: String?,
    val serviceNameAtBooking: String?,
    val priceAtBooking: Int?,
    val durationAtBooking: Int?,
    val service: Service?,
)

@JsonClass(generateAdapter = true)
data class MyBookingsResponse(
    val bookings: List<Booking>,
    val reviews: List<Review>,
)

@JsonClass(generateAdapter = true)
data class UpdateBookingStatusRequest(
    val status: BookingStatus,
)

// --- Reviews & Profile ---

@JsonClass(generateAdapter = true)
data class CreateReviewRequest(
    val salonId: String,
    val rating: Int,
    val comment: String? = null,
)

@JsonClass(generateAdapter = true)
data class UpdateProfileRequest(
    val name: String? = null,
    val phone: String? = null,
    val gender: UserGender? = null,
)

// --- Seller ---

@JsonClass(generateAdapter = true)
data class WeeklyHoursInput(
    val dayOfWeek: Int,
    val isOpen: Boolean,
    val startTime: String,
    val endTime: String,
)

@JsonClass(generateAdapter = true)
data class SaveSalonRequest(
    val name: String,
    val address: String,
    val openTime: String,
    val closeTime: String,
    val images: String,
    val categories: String,
    val weeklyHours: List<WeeklyHoursInput>,
)

@JsonClass(generateAdapter = true)
data class ServiceVariantInput(
    val targetGender: ServiceTargetGender,
    val price: Int,
    val duration: Int,
)

@JsonClass(generateAdapter = true)
data class CreateServiceRequest(
    val name: String,
    val variants: List<ServiceVariantInput>,
)

@JsonClass(generateAdapter = true)
data class CreateStaffRequest(
    val name: String,
    val skills: String? = null,
    val gender: UserGender? = null,
)

@JsonClass(generateAdapter = true)
data class UploadImagesResponse(
    val urls: List<String>,
)

@JsonClass(generateAdapter = true)
data class SellerSalon(
    val id: String,
    val name: String,
    val address: String,
    val images: String?,
    val categories: String?,
    val openTime: String,
    val closeTime: String,
    val services: List<Service>?,
    val hours: List<SalonHours>?,
    val staff: List<Staff>?,
)

@JsonClass(generateAdapter = true)
data class BookingUser(
    val id: String?,
    val name: String,
    val email: String?,
    val phone: String?,
)

@JsonClass(generateAdapter = true)
data class SellerBooking(
    val id: String,
    val userId: String,
    val salonId: String,
    val staffId: String,
    val startTime: String,
    val endTime: String,
    val totalAmount: Int,
    val status: BookingStatus,
    val paymentStatus: String?,
    val createdAt: String?,
    val user: BookingUser?,
    val services: List<BookingServiceItem>?,
    val staff: Staff?,
)

// --- Admin ---

@JsonClass(generateAdapter = true)
data class AdminStats(
    val users: Int,
    val salons: Int,
    val bookings: Int,
    val revenue: Int,
)

@JsonClass(generateAdapter = true)
data class AdminUser(
    val id: String,
    val name: String,
    val email: String?,
    val role: UserRole,
    val isActive: Boolean,
    val noShowCount: Int?,
    val createdAt: String?,
)

@JsonClass(generateAdapter = true)
data class AdminSalonOwner(
    val name: String,
    val email: String?,
    val phone: String?,
)

@JsonClass(generateAdapter = true)
data class AdminSalonListItem(
    val id: String,
    val name: String,
    val address: String,
    val images: String?,
    val categories: String?,
    val openTime: String,
    val closeTime: String,
    val createdAt: String?,
    val owner: AdminSalonOwner?,
)

@JsonClass(generateAdapter = true)
data class AdminSalonDetail(
    val id: String,
    val name: String,
    val address: String,
    val images: String?,
    val categories: String?,
    val openTime: String,
    val closeTime: String,
    val services: List<Service>?,
    val staff: List<Staff>?,
    val bookings: List<SellerBooking>?,
    val owner: AdminSalonOwner?,
)

@JsonClass(generateAdapter = true)
data class UpdateAdminSalonRequest(
    val name: String,
    val address: String,
    val openTime: String,
    val closeTime: String,
    val images: String,
    val categories: String?,
)

@JsonClass(generateAdapter = true)
data class ReactivateUserResponse(
    val success: Boolean,
    val user: AdminUserSummary?,
)

@JsonClass(generateAdapter = true)
data class AdminUserSummary(
    val id: String,
    val isActive: Boolean,
    val noShowCount: Int?,
)

@JsonClass(generateAdapter = true)
data class SuccessResponse(
    val success: Boolean,
)

@JsonClass(generateAdapter = true)
data class BookingActionRequest(
    val action: BookingStatus,
)

// --- Errors ---

@JsonClass(generateAdapter = true)
data class ApiError(
    val error: String,
)

class SalonBookApiException(
    val code: Int,
    message: String,
) : Exception(message)
