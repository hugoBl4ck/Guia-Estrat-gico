package com.girocerto.copilot.domain.model

/**
 * Resultado da análise financeira em tempo real da oferta.
 */
data class RideAnalysis(
    val offer: RideOffer,
    val ratePerKm: Double,          // R$/km Total
    val grossPerHour: Double,       // R$/h Bruto
    val vehicleCpk: Double,         // Custo por KM do veículo ativo (R$/km)
    val estimatedCost: Double,      // Custo operacional estimado (R$)
    val netProfit: Double,          // Lucro líquido real (R$)
    val netPerHour: Double,         // Lucro líquido por hora (R$)
    val status: DecisionStatus,     // EXCELLENT, MODERATE, REJECT
    val recommendationReason: String
)
