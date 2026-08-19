package com.girocerto.copilot.data.remote

import com.girocerto.copilot.BuildConfig
import com.girocerto.copilot.domain.model.RideAnalysis
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

class SupabaseRestClient(
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build(),
    private val gson: Gson = Gson()
) {
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    suspend fun syncOffersToCloud(offers: List<RideAnalysis>): Boolean = withContext(Dispatchers.IO) {
        if (offers.isEmpty()) return@withContext true

        val supabaseUrl = BuildConfig.SUPABASE_URL
        val anonKey = BuildConfig.SUPABASE_ANON_KEY

        if (supabaseUrl.contains("your-supabase-project")) {
            // Em modo demonstração local sem chaves ativas
            return@withContext true
        }

        val payloadList = offers.map {
            mapOf(
                "offer_id" to it.offer.id,
                "platform" to it.offer.platform.name,
                "gross_amount" to it.offer.grossAmount,
                "total_km" to it.offer.totalDistanceKm,
                "total_minutes" to it.offer.totalDurationMinutes,
                "rate_per_km" to it.ratePerKm,
                "gross_per_hour" to it.grossPerHour,
                "net_profit" to it.netProfit,
                "status" to it.status.name,
                "created_at" to java.time.Instant.ofEpochMilli(it.offer.timestamp).toString()
            )
        }

        val jsonBody = gson.toJson(payloadList)
        val requestBody = jsonBody.toRequestBody(jsonMediaType)

        val request = Request.Builder()
            .url("$supabaseUrl/rest/v1/copilot_offers")
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $anonKey")
            .addHeader("Content-Type", "application/json")
            .addHeader("Prefer", "resolution=merge-duplicates")
            .post(requestBody)
            .build()

        try {
            client.newCall(request).execute().use { response ->
                response.isSuccessful
            }
        } catch (e: Exception) {
            false
        }
    }
}
