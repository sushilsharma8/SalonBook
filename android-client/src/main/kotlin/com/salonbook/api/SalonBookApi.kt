package com.salonbook.api

import okhttp3.MultipartBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

interface SalonBookApi {

    // --- Public ---

    @GET("api/health")
    suspend fun health(): Map<String, String>

    @POST("api/auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponse

    @POST("api/auth/register")
    suspend fun register(@Body body: RegisterRequest): AuthResponse

    @GET("api/salons")
    suspend fun listSalons(): List<SalonListItem>

    @GET("api/salons/{id}")
    suspend fun getSalon(@Path("id") id: String): SalonDetail

    // --- Customer ---

    @GET("api/slots")
    suspend fun getSlots(
        @Query("salonId") salonId: String,
        @Query("serviceIds") serviceIds: String,
        @Query("date") date: String,
        @Query("staffId") staffId: String? = null,
    ): SlotsResponse

    @POST("api/bookings")
    suspend fun createBooking(@Body body: CreateBookingRequest): Booking

    @GET("api/bookings/my")
    suspend fun getMyBookings(): MyBookingsResponse

    @PUT("api/bookings/{id}/status")
    suspend fun updateBookingStatus(
        @Path("id") id: String,
        @Body body: UpdateBookingStatusRequest,
    ): Map<String, Any?>

    @POST("api/reviews")
    suspend fun createReview(@Body body: CreateReviewRequest): Review

    @PUT("api/users/profile")
    suspend fun updateProfile(@Body body: UpdateProfileRequest): User

    // --- Seller ---

    @GET("api/seller/salon")
    suspend fun getSellerSalon(): SellerSalon?

    @POST("api/seller/salon")
    suspend fun saveSellerSalon(@Body body: SaveSalonRequest): SellerSalon

    @Multipart
    @POST("api/seller/upload-images")
    suspend fun uploadSalonImages(
        @Part images: List<MultipartBody.Part>,
    ): UploadImagesResponse

    @POST("api/seller/services")
    suspend fun addSellerService(@Body body: CreateServiceRequest): Service

    @DELETE("api/seller/services/{id}")
    suspend fun deleteSellerService(@Path("id") id: String): SuccessResponse

    @POST("api/seller/staff")
    suspend fun addSellerStaff(@Body body: CreateStaffRequest): Staff

    @DELETE("api/seller/staff/{id}")
    suspend fun deleteSellerStaff(@Path("id") id: String): SuccessResponse

    @GET("api/seller/bookings")
    suspend fun getSellerBookings(): List<SellerBooking>

    // --- Booking actions (seller / admin via token link) ---

    @GET("api/bookings/action/{token}")
    suspend fun getBookingByActionToken(@Path("token") token: String): SellerBooking

    @POST("api/bookings/action/{token}")
    suspend fun performBookingAction(
        @Path("token") token: String,
        @Body body: BookingActionRequest,
    ): Booking

    // --- Admin ---

    @GET("api/admin/stats")
    suspend fun getAdminStats(): AdminStats

    @GET("api/admin/activity")
    suspend fun getAdminActivity(): List<SellerBooking>

    @GET("api/admin/users")
    suspend fun getAdminUsers(): List<AdminUser>

    @POST("api/admin/users/{id}/reactivate")
    suspend fun reactivateAdminUser(@Path("id") id: String): ReactivateUserResponse

    @DELETE("api/admin/users/{id}")
    suspend fun deleteAdminUser(@Path("id") id: String): SuccessResponse

    @GET("api/admin/salons")
    suspend fun getAdminSalons(): List<AdminSalonListItem>

    @DELETE("api/admin/salons/{id}")
    suspend fun deleteAdminSalon(@Path("id") id: String): SuccessResponse

    @GET("api/admin/salons/{id}")
    suspend fun getAdminSalon(@Path("id") id: String): AdminSalonDetail

    @PUT("api/admin/salons/{id}")
    suspend fun updateAdminSalon(
        @Path("id") id: String,
        @Body body: UpdateAdminSalonRequest,
    ): AdminSalonDetail

    @POST("api/admin/salons/{id}/services")
    suspend fun addAdminSalonService(
        @Path("id") salonId: String,
        @Body body: CreateServiceRequest,
    ): Service

    @DELETE("api/admin/salons/{salonId}/services/{serviceId}")
    suspend fun deleteAdminSalonService(
        @Path("salonId") salonId: String,
        @Path("serviceId") serviceId: String,
    ): SuccessResponse

    @POST("api/admin/salons/{id}/staff")
    suspend fun addAdminSalonStaff(
        @Path("id") salonId: String,
        @Body body: CreateStaffRequest,
    ): Staff

    @DELETE("api/admin/salons/{salonId}/staff/{staffId}")
    suspend fun deleteAdminSalonStaff(
        @Path("salonId") salonId: String,
        @Path("staffId") staffId: String,
    ): SuccessResponse
}
