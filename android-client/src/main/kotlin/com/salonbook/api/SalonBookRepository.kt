package com.salonbook.api

import retrofit2.HttpException
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory

/**
 * High-level wrapper around [SalonBookApi] with error handling and booking helpers.
 */
class SalonBookRepository(
    baseUrl: String = ApiClient.BASE_URL,
    tokenProvider: () -> String? = { null },
) {
    private val api: SalonBookApi = ApiClient.create(baseUrl, tokenProvider)
    private val errorAdapter = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()
        .adapter(ApiError::class.java)

    val imageBaseUrl: String = baseUrl

    // --- Auth ---

    suspend fun login(email: String, password: String): AuthResponse =
        safeCall { api.login(LoginRequest(email, password)) }

    suspend fun register(
        name: String,
        email: String,
        password: String,
        phone: String,
        gender: UserGender,
    ): AuthResponse = safeCall {
        api.register(
            RegisterRequest(
                name = name,
                email = email,
                password = password,
                phone = phone,
                role = "CUSTOMER",
                gender = gender,
            )
        )
    }

    // --- Salons ---

    suspend fun listSalons(): List<SalonListItem> = safeCall { api.listSalons() }

    suspend fun getSalon(id: String): SalonDetail = safeCall { api.getSalon(id) }

    // --- Booking flow ---

    suspend fun getSlots(
        salonId: String,
        serviceIds: List<String>,
        date: String,
        staffId: String? = null,
    ): SlotsResponse = safeCall {
        api.getSlots(
            salonId = salonId,
            serviceIds = serviceIds.joinToString(","),
            date = date,
            staffId = staffId,
        )
    }

    /**
     * Creates a booking using the same UTC ISO format as the web app.
     *
     * @param date yyyy-MM-dd
     * @param timeUtc slot time from `/api/slots`, e.g. "10:30"
     */
    suspend fun createBooking(
        salonId: String,
        serviceIds: List<String>,
        date: String,
        timeUtc: String,
        staffId: String? = null,
    ): Booking = safeCall {
        val isoTime = "${date}T${timeUtc}:00.000Z"
        api.createBooking(
            CreateBookingRequest(
                salonId = salonId,
                serviceIds = serviceIds,
                time = isoTime,
                staffId = staffId,
            )
        )
    }

    suspend fun getMyBookings(): MyBookingsResponse = safeCall { api.getMyBookings() }

    suspend fun cancelBooking(id: String) = safeCall {
        api.updateBookingStatus(id, UpdateBookingStatusRequest(BookingStatus.CANCELLED))
    }

    // --- Reviews & profile ---

    suspend fun submitReview(salonId: String, rating: Int, comment: String? = null): Review =
        safeCall {
            api.createReview(CreateReviewRequest(salonId, rating, comment))
        }

    suspend fun updateProfile(
        name: String? = null,
        phone: String? = null,
        gender: UserGender? = null,
    ): User = safeCall {
        api.updateProfile(UpdateProfileRequest(name, phone, gender))
    }

    suspend fun updateBookingStatus(id: String, status: BookingStatus) = safeCall {
        api.updateBookingStatus(id, UpdateBookingStatusRequest(status))
    }

    // --- Seller ---

    suspend fun getSellerSalon(): SellerSalon? = safeCall { api.getSellerSalon() }

    suspend fun saveSellerSalon(request: SaveSalonRequest): SellerSalon =
        safeCall { api.saveSellerSalon(request) }

    suspend fun uploadSalonImages(files: List<java.io.File>): UploadImagesResponse =
        safeCall { api.uploadSalonImages(MultipartHelper.imageParts(files)) }

    suspend fun addSellerService(name: String, variants: List<ServiceVariantInput>): Service =
        safeCall { api.addSellerService(CreateServiceRequest(name, variants)) }

    suspend fun deleteSellerService(id: String): SuccessResponse =
        safeCall { api.deleteSellerService(id) }

    suspend fun addSellerStaff(name: String, skills: String? = null, gender: UserGender? = null): Staff =
        safeCall { api.addSellerStaff(CreateStaffRequest(name, skills, gender)) }

    suspend fun deleteSellerStaff(id: String): SuccessResponse =
        safeCall { api.deleteSellerStaff(id) }

    suspend fun getSellerBookings(): List<SellerBooking> = safeCall { api.getSellerBookings() }

    suspend fun confirmBooking(id: String) = updateBookingStatus(id, BookingStatus.CONFIRMED)

    suspend fun completeBooking(id: String) = updateBookingStatus(id, BookingStatus.COMPLETED)

    suspend fun markBookingNoShow(id: String) = updateBookingStatus(id, BookingStatus.NO_SHOW)

    suspend fun getBookingByActionToken(token: String): SellerBooking =
        safeCall { api.getBookingByActionToken(token) }

    suspend fun confirmBookingByToken(token: String): Booking =
        safeCall { api.performBookingAction(token, BookingActionRequest(BookingStatus.CONFIRMED)) }

    suspend fun cancelBookingByToken(token: String): Booking =
        safeCall { api.performBookingAction(token, BookingActionRequest(BookingStatus.CANCELLED)) }

    // --- Admin ---

    suspend fun getAdminStats(): AdminStats = safeCall { api.getAdminStats() }

    suspend fun getAdminActivity(): List<SellerBooking> = safeCall { api.getAdminActivity() }

    suspend fun getAdminUsers(): List<AdminUser> = safeCall { api.getAdminUsers() }

    suspend fun reactivateUser(id: String): ReactivateUserResponse =
        safeCall { api.reactivateAdminUser(id) }

    suspend fun deleteUser(id: String): SuccessResponse = safeCall { api.deleteAdminUser(id) }

    suspend fun getAdminSalons(): List<AdminSalonListItem> = safeCall { api.getAdminSalons() }

    suspend fun deleteSalon(id: String): SuccessResponse = safeCall { api.deleteAdminSalon(id) }

    suspend fun getAdminSalon(id: String): AdminSalonDetail = safeCall { api.getAdminSalon(id) }

    suspend fun updateAdminSalon(id: String, request: UpdateAdminSalonRequest): AdminSalonDetail =
        safeCall { api.updateAdminSalon(id, request) }

    suspend fun addAdminSalonService(salonId: String, name: String, variants: List<ServiceVariantInput>): Service =
        safeCall { api.addAdminSalonService(salonId, CreateServiceRequest(name, variants)) }

    suspend fun deleteAdminSalonService(salonId: String, serviceId: String): SuccessResponse =
        safeCall { api.deleteAdminSalonService(salonId, serviceId) }

    suspend fun addAdminSalonStaff(salonId: String, name: String, skills: String? = null, gender: UserGender? = null): Staff =
        safeCall { api.addAdminSalonStaff(salonId, CreateStaffRequest(name, skills, gender)) }

    suspend fun deleteAdminSalonStaff(salonId: String, staffId: String): SuccessResponse =
        safeCall { api.deleteAdminSalonStaff(salonId, staffId) }

    // --- Helpers ---

    private suspend fun <T> safeCall(block: suspend () -> T): T {
        try {
            return block()
        } catch (e: HttpException) {
            val body = e.response()?.errorBody()?.string()
            val message = body?.let { raw ->
                runCatching { errorAdapter.fromJson(raw)?.error }.getOrNull()
            } ?: e.message()
            throw SalonBookApiException(e.code(), message ?: "Request failed")
        }
    }
}
