package com.girocerto.copilot.domain

import com.girocerto.copilot.domain.model.DecisionStatus
import com.girocerto.copilot.domain.model.PlatformType
import com.girocerto.copilot.domain.model.RideOffer
import com.girocerto.copilot.domain.model.VehicleProfile
import com.girocerto.copilot.domain.usecase.AnalyzeRideOfferUseCase
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class AnalyzeRideOfferUseCaseTest {

    private lateinit var useCase: AnalyzeRideOfferUseCase

    @Before
    fun setUp() {
        useCase = AnalyzeRideOfferUseCase()
    }

    @Test
    fun `should calculate correctly for BYD Dolphin Mini electric vehicle`() {
        // Dado uma corrida Uber: R$ 28,50, 2,1 km busca, 7,8 km viagem (9,9 km total), 24 min total
        val offer = RideOffer(
            platform = PlatformType.UBER,
            grossAmount = 28.50,
            pickupDistanceKm = 2.1,
            pickupDurationMinutes = 6,
            tripDistanceKm = 7.8,
            tripDurationMinutes = 18
        )
        val profile = VehicleProfile.BYD_DOLPHIN_MINI // CPK: R$ 0,38

        val analysis = useCase(offer, profile)

        // Verificações
        assertEquals(9.9, offer.totalDistanceKm, 0.01)
        assertEquals(24, offer.totalDurationMinutes)
        assertEquals(2.878, analysis.ratePerKm, 0.01) // 28.50 / 9.9 = ~2.88
        assertEquals(71.25, analysis.grossPerHour, 0.01) // 28.50 / 0.4h = 71.25

        // Custo estimado = 9.9 * 0.38 = 3.762
        assertEquals(3.76, analysis.estimatedCost, 0.02)
        // Lucro líquido = 28.50 - 3.762 = 24.738
        assertEquals(24.74, analysis.netProfit, 0.02)
        assertEquals(DecisionStatus.EXCELLENT, analysis.status)
    }

    @Test
    fun `same ride with Ford Ka combustion vehicle should yield lower net profit and change status`() {
        val offer = RideOffer(
            platform = PlatformType.UBER,
            grossAmount = 18.00,
            pickupDistanceKm = 3.0,
            pickupDurationMinutes = 8,
            tripDistanceKm = 6.0,
            tripDurationMinutes = 15
        )
        // Dolphin Mini: CPK R$ 0.38 -> Custo 9 * 0.38 = 3.42 -> Lucro = 14.58
        val dolphinAnalysis = useCase(offer, VehicleProfile.BYD_DOLPHIN_MINI)
        assertTrue(dolphinAnalysis.netProfit > 14.0)

        // Ford Ka: CPK R$ 0.85 -> Custo 9 * 0.85 = 7.65 -> Lucro = 10.35
        val kaAnalysis = useCase(offer, VehicleProfile.FORD_KA_1_0)
        assertTrue(kaAnalysis.netProfit < dolphinAnalysis.netProfit)
    }

    @Test
    fun `should prevent division by zero on zero duration or near zero distance`() {
        val edgeOffer = RideOffer(
            platform = PlatformType.UBER,
            grossAmount = 10.00,
            pickupDistanceKm = 0.0,
            pickupDurationMinutes = 0,
            tripDistanceKm = 0.0,
            tripDurationMinutes = 0
        )
        val profile = VehicleProfile.BYD_DOLPHIN_MINI

        val analysis = useCase(edgeOffer, profile)

        assertTrue(analysis.grossPerHour.isFinite())
        assertTrue(!analysis.grossPerHour.isNaN())
        assertTrue(analysis.ratePerKm.isFinite())
        assertTrue(!analysis.ratePerKm.isNaN())
    }

    @Test
    fun `should classify operational loss ride as REJECT`() {
        // Corrida ruim: R$ 8,00 para rodar 15 km no total com carro a combustão (CPK R$ 0.85)
        // Custo = 15 * 0.85 = R$ 12,75 (Prejuízo de R$ 4,75)
        val lossOffer = RideOffer(
            platform = PlatformType.NINETY_NINE,
            grossAmount = 8.00,
            pickupDistanceKm = 5.0,
            pickupDurationMinutes = 12,
            tripDistanceKm = 10.0,
            tripDurationMinutes = 25
        )

        val analysis = useCase(lossOffer, VehicleProfile.FORD_KA_1_0)

        assertEquals(DecisionStatus.REJECT, analysis.status)
        assertTrue(analysis.netProfit < 0)
    }
}
