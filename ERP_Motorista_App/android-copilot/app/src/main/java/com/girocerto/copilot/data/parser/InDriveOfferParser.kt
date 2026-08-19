package com.girocerto.copilot.data.parser

import com.girocerto.copilot.domain.model.PlatformType
import com.girocerto.copilot.domain.model.RideOffer
import com.girocerto.copilot.domain.repository.IOfferParser
import java.util.regex.Pattern

class InDriveOfferParser : IOfferParser {

    override val platform: PlatformType = PlatformType.INDRIVE

    private val pricePattern = Pattern.compile("""(?:R\$\s?|valor:\s?|oferta:\s?)(\d+[\.,]\d{2})""", Pattern.CASE_INSENSITIVE)
    private val kmPattern = Pattern.compile("""(\d+[\.,]?\d*)\s?km""", Pattern.CASE_INSENSITIVE)
    private val minPattern = Pattern.compile("""(\d+)\s?min""", Pattern.CASE_INSENSITIVE)

    private val rideKeywords = listOf(
        "indrive", "indriver", "corrida", "oferta", "passageiro", "contraproposta",
        "aceitar", "recusar", "buscar", "destino", "embarque", "desembarque", "ponto", "km", "min"
    )

    override fun parseFromTextDump(textDump: String): RideOffer? {
        if (textDump.isBlank()) return null
        val lowerDump = textDump.lowercase()

        // 1. FILTRO DE CONTEXTO: Deve conter termos do inDrive
        if (!rideKeywords.any { lowerDump.contains(it) }) {
            return null
        }

        val priceMatcher = pricePattern.matcher(textDump)
        if (!priceMatcher.find()) return null
        val rawPrice = priceMatcher.group(1) ?: return null
        val price = rawPrice.replace(".", "").replace(",", ".").toDoubleOrNull() ?: return null
        if (price < 3.0 || price > 5000.0) return null

        val kmMatcher = kmPattern.matcher(textDump)
        val kmList = mutableListOf<Double>()
        while (kmMatcher.find()) {
            val kmVal = kmMatcher.group(1)?.replace(",", ".")?.toDoubleOrNull()
            if (kmVal != null && kmVal in 0.05..300.0) {
                kmList.add(kmVal)
            }
        }
        if (kmList.isEmpty()) return null

        val minMatcher = minPattern.matcher(textDump)
        val minList = mutableListOf<Int>()
        while (minMatcher.find()) {
            val minVal = minMatcher.group(1)?.toIntOrNull()
            if (minVal != null && minVal in 1..480) {
                minList.add(minVal)
            }
        }

        val pickupKm = if (kmList.size >= 2) kmList[0] else 1.8
        val tripKm = if (kmList.size >= 2) kmList[1] else kmList[0]

        val pickupMin = if (minList.size >= 2) minList[0] else 6
        val tripMin = if (minList.size >= 2) minList[1] else (minList.firstOrNull() ?: 18)

        return RideOffer(
            platform = PlatformType.INDRIVE,
            grossAmount = price,
            pickupDistanceKm = pickupKm,
            pickupDurationMinutes = pickupMin,
            tripDistanceKm = tripKm,
            tripDurationMinutes = tripMin,
            rawTextDump = textDump
        )
    }
}
