package com.girocerto.copilot.domain.model

import java.util.UUID

/**
 * Representa uma oferta de corrida capturada na tela do smartphone.
 */
data class RideOffer(
    val id: String = UUID.randomUUID().toString(),
    val platform: PlatformType,
    val grossAmount: Double,          // Valor bruto em R$ pago pela corrida
    val pickupDistanceKm: Double,     // Distância até o passageiro (km)
    val pickupDurationMinutes: Int,   // Tempo estimado até o passageiro (min)
    val tripDistanceKm: Double,       // Distância da viagem (km)
    val tripDurationMinutes: Int,     // Tempo estimado da viagem (min)
    val passengerRating: Double? = null,
    val destinationAddress: String? = null,
    val rawTextDump: String = "",
    val timestamp: Long = System.currentTimeMillis()
) {
    val totalDistanceKm: Double
        get() = (pickupDistanceKm + tripDistanceKm).coerceAtLeast(0.01)

    val totalDurationMinutes: Int
        get() = (pickupDurationMinutes + tripDurationMinutes).coerceAtLeast(1)

    val totalDurationHours: Double
        get() = (totalDurationMinutes / 60.0).coerceAtLeast(0.016) // Mínimo 1 minuto em horas
}
