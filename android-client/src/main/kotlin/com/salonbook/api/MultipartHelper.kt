package com.salonbook.api

import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File

object MultipartHelper {

    /** Builds multipart parts for `POST /api/seller/upload-images`. */
    fun imageParts(files: List<File>): List<MultipartBody.Part> =
        files.map { file ->
            MultipartBody.Part.createFormData(
                name = "images",
                filename = file.name,
                body = file.asRequestBody("image/*".toMediaTypeOrNull()),
            )
        }
}
