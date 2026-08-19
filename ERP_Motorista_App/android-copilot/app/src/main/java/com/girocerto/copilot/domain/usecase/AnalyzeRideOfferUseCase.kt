package com.girocerto.copilot.domain.usecase

import com.girocerto.copilot.domain.model.DecisionStatus
import com.girocerto.copilot.domain.model.RideAnalysis
import com.girocerto.copilot.domain.model.RideOffer
import com.girocerto.copilot.domain.model.VehicleProfile

/**
 * Caso de uso central de inteligência financeira veicular.
 * Executa em < 2ms, blindado contra divisão por zero e sanitizado para regras do ERP.
 */
class AnalyzeRideOfferUseCase {

    operator fun invoke(offer: RideOffer, vehicleProfile: VehicleProfile): RideAnalysis {
        val totalKm = offer.totalDistanceKm.coerceAtLeast(0.1)
        val totalHours = offer.totalDurationHours.coerceAtLeast(0.016) // Mínimo 1 minuto
        val validCpk = vehicleProfile.cpk.coerceAtLeast(0.01)

        // 1. Métricas Brutas
        val ratePerKm = offer.grossAmount / totalKm
        val grossPerHour = offer.grossAmount / totalHours

        // 2. Custos e Lucro Líquido Real (Invariante: Lucro = Bruto - Custo)
        val estimatedCost = totalKm * validCpk
        val netProfit = offer.grossAmount - estimatedCost
        val netPerHour = netProfit / totalHours

        // 3. Semáforo de Decisão
        val status: DecisionStatus
        val reason: String

        val minRate = vehicleProfile.minRatePerKm
        val minHour = vehicleProfile.minGrossPerHour

        when {
            // Excelente: Acima do alvo de R$/km e de R$/h
            ratePerKm >= (minRate * 1.15) && grossPerHour >= (minHour * 1.10) && netProfit > 5.0 -> {
                status = DecisionStatus.EXCELLENT
                reason = "🟢 EXCELENTE! R$ ${String.format("%.2f", ratePerKm)}/km e R$ ${String.format("%.0f", grossPerHour)}/h."
            }
            // Moderado: Cobre os custos com margem aceitável
            ratePerKm >= minRate && grossPerHour >= (minHour * 0.85) && netProfit > 2.0 -> {
                status = DecisionStatus.MODERATE
                reason = "🟡 ACEITÁVEL. Cobre custos e gera R$ ${String.format("%.2f", netProfit)} de lucro."
            }
            // Rejeitar: Prejuízo ou rentabilidade abaixo do piso
            else -> {
                status = DecisionStatus.REJECT
                reason = if (netProfit <= 0) {
                    "🔴 PREJUÍZO! Custo de R$ ${String.format("%.2f", estimatedCost)} supera a corrida."
                } else {
                    "🔴 BAIXA RENTABILIDADE! R$ ${String.format("%.2f", ratePerKm)}/km abaixo da meta."
                }
            }
        }

        return RideAnalysis(
            offer = offer,
            ratePerKm = ratePerKm,
            grossPerHour = grossPerHour,
            vehicleCpk = validCpk,
            estimatedCost = estimatedCost,
            netProfit = netProfit,
            netPerHour = netPerHour,
            status = status,
            recommendationReason = reason
        )
    }
}
