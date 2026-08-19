package com.girocerto.copilot.data.parser

import com.girocerto.copilot.domain.model.PlatformType
import com.girocerto.copilot.domain.model.RideOffer
import com.girocerto.copilot.domain.repository.IOfferParser
import java.util.regex.Pattern

class NinetyNineOfferParser : IOfferParser {

    override val platform: PlatformType = PlatformType.NINETY_NINE

    // Padrões de Preço da 99 (ex: R$ 19,80, R$19.80, Ganhos estimados: R$ 24,50, Valor: R$ 15,00)
    private val pricePattern = Pattern.compile("""(?:R\$\s?|Ganhos(?:\sestimados)?:\s?R\$\s?|Valor(?:\stotal)?:\s?R\$\s?)(\d+[\.,]\d{2})""", Pattern.CASE_INSENSITIVE)
    
    // Padrões de Distância da 99 (ex: 1,4 km, 1.4km, 6,2 km, 12 km)
    private val kmPattern = Pattern.compile("""(\d+[\.,]?\d*)\s?(?:km|quil[ôo]metros)""", Pattern.CASE_INSENSITIVE)
    
    // Padrões de Tempo da 99 (ex: 4 min, 4min, 16 mins, 16 minutos)
    private val minPattern = Pattern.compile("""(\d+)\s?(?:min|mins|minutos)""", Pattern.CASE_INSENSITIVE)

    // Palavras-chave obrigatórias que confirmam que se trata de uma chamada/oferta de corrida real da 99
    private val rideIntentKeywords = listOf(
        "99pop", "99plus", "99moto", "99entrega", "99comfort", "99negocia", "99 táxi", "99taxi", "99compartilhado",
        "aceitar", "recusar", "rejeitar", "nova corrida", "nova chamada", "toque para aceitar",
        "embarque", "desembarque", "passageiro", "destino", "buscar em", "distância total", "viagem"
    )

    // Palavras puramente promocionais que NÃO caracterizam corrida se não houver contexto de corrida
    private val purePromoKeywords = listOf(
        "abasteça", "99pay", "indique e ganhe", "indique um amigo", "desconto no combustível",
        "empréstimo", "cartão 99", "cashback", "clube 99", "seguro de vida", "posto shell"
    )

    override fun parseFromTextDump(textDump: String): RideOffer? {
        if (textDump.isBlank()) return null
        
        // 1. Normalização de fragmentação de TextViews comuns no Android da 99
        // Ex: "R$ | 19,80", "R$ | 19 | ,80", "1,4 | km", "4 | min"
        val normalizedDump = textDump
            .replace(Regex("""R\$\s*\|\s*(\d+)"""), "R$ $1")
            .replace(Regex("""(\d+)\s*\|\s*,\s*(\d{2})"""), "$1,$2")
            .replace(Regex("""(\d+[\.,]?\d*)\s*\|\s*km""", RegexOption.IGNORE_CASE), "$1 km")
            .replace(Regex("""(\d+)\s*\|\s*min""", RegexOption.IGNORE_CASE), "$1 min")

        val lowerDump = normalizedDump.lowercase()

        // 2. FILTRO DE CONTEXTO: Deve conter termos de intenção de corrida OU presença simultânea de R$ e KM
        val hasRideIntent = rideIntentKeywords.any { lowerDump.contains(it) }
        val hasPriceAndDistance = (normalizedDump.contains("R$") || normalizedDump.contains("R $")) && 
                                  (lowerDump.contains("km") || lowerDump.contains("min"))

        if (!hasRideIntent && !hasPriceAndDistance) {
            return null
        }

        // Se for uma tela de propaganda sem qualquer menção a corrida ou aceitar/recusar, descarta
        val hasPurePromoOnly = purePromoKeywords.any { lowerDump.contains(it) } && 
                               !rideIntentKeywords.any { lowerDump.contains(it) }
        if (hasPurePromoOnly) {
            return null
        }

        // 3. Extração de Preço (testa múltiplos formatos)
        var price: Double? = null
        
        // Padrão 1: R$ 19,80 ou R$19.80
        val p1 = Pattern.compile("""R\$\s?(\d+[\.,]\d{2})""", Pattern.CASE_INSENSITIVE).matcher(normalizedDump)
        while (p1.find()) {
            val v = p1.group(1)?.replace(".", "")?.replace(",", ".")?.toDoubleOrNull()
            if (v != null && v in 3.5..2500.0) {
                price = v
                break
            }
        }

        // Padrão 2: Preço inteiro R$ 19
        if (price == null) {
            val p2 = Pattern.compile("""R\$\s?(\d{1,4})(?!\d)""", Pattern.CASE_INSENSITIVE).matcher(normalizedDump)
            while (p2.find()) {
                val v = p2.group(1)?.toDoubleOrNull()
                if (v != null && v in 4.0..2500.0) {
                    price = v
                    break
                }
            }
        }

        // Padrão 3: Valor isolado com vírgula após palavra-chave de ganho
        if (price == null) {
            val p3 = Pattern.compile("""(?:ganhos?|valor|total|corrida)[\s:]*R?\$?\s*(\d+[\.,]\d{2})""", Pattern.CASE_INSENSITIVE).matcher(normalizedDump)
            if (p3.find()) {
                val v = p3.group(1)?.replace(".", "")?.replace(",", ".")?.toDoubleOrNull()
                if (v != null && v in 3.5..2500.0) {
                    price = v
                }
            }
        }

        if (price == null) return null

        // 4. Extração de Distâncias (KM)
        val kmMatcher = kmPattern.matcher(normalizedDump)
        val kmList = mutableListOf<Double>()
        while (kmMatcher.find()) {
            val kmVal = kmMatcher.group(1)?.replace(",", ".")?.toDoubleOrNull()
            if (kmVal != null && kmVal in 0.1..300.0) {
                kmList.add(kmVal)
            }
        }

        // 5. Extração de Tempos (Minutos)
        val minMatcher = minPattern.matcher(normalizedDump)
        val minList = mutableListOf<Int>()
        while (minMatcher.find()) {
            val minVal = minMatcher.group(1)?.toIntOrNull()
            if (minVal != null && minVal in 1..480) {
                minList.add(minVal)
            }
        }

        // Validação mínima de sanidade
        if (kmList.isEmpty() && minList.isEmpty()) {
            return null
        }

        // Atribuição de Busca vs Viagem
        val pickupKm = if (kmList.size >= 2) kmList[0] else (kmList.firstOrNull()?.let { it * 0.2 } ?: 1.2)
        val tripKm = if (kmList.size >= 2) kmList[1] else (kmList.firstOrNull() ?: 5.0)

        val pickupMin = if (minList.size >= 2) minList[0] else 4
        val tripMin = if (minList.size >= 2) minList[1] else (minList.firstOrNull() ?: 15)

        return RideOffer(
            platform = PlatformType.NINETY_NINE,
            grossAmount = price,
            pickupDistanceKm = pickupKm,
            pickupDurationMinutes = pickupMin,
            tripDistanceKm = tripKm,
            tripDurationMinutes = tripMin,
            rawTextDump = textDump
        )
    }
}
