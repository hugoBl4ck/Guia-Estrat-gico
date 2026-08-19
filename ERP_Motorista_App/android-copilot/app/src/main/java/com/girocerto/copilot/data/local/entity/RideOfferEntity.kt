package com.girocerto.copilot.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "ride_offers")
data class RideOfferEntity(
    @PrimaryKey
    val id: String,
    val platform: String,
    val grossAmount: Double,
    val pickupDistanceKm: Double,
    val pickupDurationMinutes: Int,
    val tripDistanceKm: Double,
    val tripDurationMinutes: Int,
    val totalDistanceKm: Double,
    val totalDurationMinutes: Int,
    val ratePerKm: Double,
    val grossPerHour: Double,
    val vehicleCpk: Double,
    val estimatedCost: Double,
    val netProfit: Double,
    val netPerHour: Double,
    val status: String,
    val recommendationReason: String,
    val timestamp: Long,
    val isSynced: Boolean = false
)
