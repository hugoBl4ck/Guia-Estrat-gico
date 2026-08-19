package com.girocerto.copilot.data.parser

import com.girocerto.copilot.domain.model.PlatformType
import com.girocerto.copilot.domain.model.RideOffer
import com.girocerto.copilot.domain.repository.IOfferParser
import java.util.regex.Pattern

class UberOfferParser : IOfferParser {

    override val platform: PlatformType = PlatformType.UBER

    private val pricePattern = Pattern.compile("""R\$\s?(\d+[\.,]\d{2})""", Pattern.CASE_INSENSITIVE)
    private val kmPattern = Pattern.compile("""(\d+[\.,]?\d*)\s?km""", Pattern.CASE_INSENSITIVE)
    private val minPattern = Pattern.compile("""(\d+)\s?min""", Pattern.CASE_INSENSITIVE)

    private val rideKeywords = listOf(
        "uberx", "comfort", "black", "flash", "moto", "promo", "vip", "bag", "direct",
        "aceitar", "recusar", "viagem", "embarque", "desembarque", "passageiro", "destino",
        "para o local", "toque para aceitar", "min", "km"
    )

    override fun parseFromTextDump(textDump: String): RideOffer? {
        if (textDump.isBlank()) return null
        val lowerDump = textDump.lowercase()

        // 1. FILTRO DE CONTEXTO: Deve conter termos típicos de corrida Uber
        if (!rideKeywords.any { lowerDump.contains(it) }) {
            return null
        }

        // 2. Extração de Preço
        val priceMatcher = pricePattern.matcher(textDump)
        if (!priceMatcher.find()) return null
        val rawPrice = priceMatcher.group(1) ?: return null
        val price = rawPrice.replace(".", "").replace(",", ".").toDoubleOrNull() ?: return null
        if (price < 3.0 || price > 5000.0) return null // Filtro de sanidade

        // 2. Extração de Distâncias (KM)
        val kmMatcher = kmPattern.matcher(textDump)
        val kmList = mutableListOf<Double>()
        while (kmMatcher.find()) {
            val kmVal = kmMatcher.group(1)?.replace(",", ".")?.toDoubleOrNull()
            if (kmVal != null && kmVal in 0.05..300.0) {
                kmList.add(kmVal)
            }
        }
        if (kmList.isEmpty()) return null

        // 3. Extração de Tempos (Minutos)
        val minMatcher = minPattern.matcher(textDump)
        val minList = mutableListOf<Int>()
        while (minMatcher.find()) {
            val minVal = minMatcher.group(1)?.toIntOrNull()
            if (minVal != null && minVal in 1..480) {
                minList.add(minVal)
            }
        }

        val pickupKm = if (kmList.size >= 2) kmList[0] else 1.5
        val tripKm = if (kmList.size >= 2) kmList[1] else kmList[0]

        val pickupMin = if (minList.size >= 2) minList[0] else 5
        val tripMin = if (minList.size >= 2) minList[1] else (minList.firstOrNull() ?: 15)

        return RideOffer(
            platform = PlatformType.UBER,
            grossAmount = price,
            pickupDistanceKm = pickupKm,
            pickupDurationMinutes = pickupMin,
            tripDistanceKm = tripKm,
            tripDurationMinutes = tripMin,
            rawTextDump = textDump
        )
    }
}
