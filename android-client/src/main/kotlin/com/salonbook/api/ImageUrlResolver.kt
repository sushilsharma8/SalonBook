package com.salonbook.api

/**
 * Resolves salon image paths to absolute URLs.
 *
 * The API may return full Supabase URLs or relative paths like `/uploads/salons/foo.jpg`.
 */
object ImageUrlResolver {

    fun resolve(baseUrl: String, raw: String?): String? {
        if (raw.isNullOrBlank()) return null
        val trimmed = raw.trim()
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return trimmed
        }
        val base = baseUrl.trimEnd('/')
        val path = if (trimmed.startsWith("/")) trimmed else "/$trimmed"
        return "$base$path"
    }

    /** Parses comma-separated image field from salon records. */
    fun parseImages(baseUrl: String, imagesField: String?): List<String> {
        if (imagesField.isNullOrBlank()) return emptyList()
        return imagesField
            .split(',')
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .mapNotNull { resolve(baseUrl, it) }
    }
}
