package com.girocerto.copilot.property

import com.girocerto.copilot.domain.model.PlatformType
import com.girocerto.copilot.domain.model.RideOffer
import com.girocerto.copilot.domain.model.VehicleProfile
import com.girocerto.copilot.domain.usecase.AnalyzeRideOfferUseCase
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

class FinancialInvariantsTest {

    private val useCase = AnalyzeRideOfferUseCase()

    @Test
    fun `invariant - net profit must always strictly equal gross amount minus total estimated cost`() {
        val random = Random(42)

        for (i in 0 until 1000) {
            val gross = random.nextDouble(5.0, 300.0)
            val pickupKm = random.nextDouble(0.1, 15.0)
            val tripKm = random.nextDouble(0.5, 60.0)
            val pickupMin = random.nextInt(1, 25)
            val tripMin = random.nextInt(3, 120)
            val cpk = random.nextDouble(0.20, 1.50)

            val offer = RideOffer(
                platform = PlatformType.values()[random.nextInt(PlatformType.values().size)],
                grossAmount = gross,
                pickupDistanceKm = pickupKm,
                pickupDurationMinutes = pickupMin,
                tripDistanceKm = tripKm,
                tripDurationMinutes = tripMin
            )

            val profile = VehicleProfile(
                id = "rand_$i",
                name = "Test Vehicle $i",
                cpk = cpk
            )

            val analysis = useCase(offer, profile)

            // Invariante 1: Custo Estimado = KM Total * CPK
            val expectedCost = offer.totalDistanceKm * cpk
            assertEquals(expectedCost, analysis.estimatedCost, 0.0001)

            // Invariante 2: Lucro Líquido = Bruto - Custo Estimado
            val expectedNet = gross - expectedCost
            assertEquals(expectedNet, analysis.netProfit, 0.0001)

            // Invariante 3: Valores finitos
            assertTrue(analysis.netProfit.isFinite())
            assertTrue(analysis.ratePerKm.isFinite())
            assertTrue(analysis.grossPerHour.isFinite())
            assertTrue(analysis.netPerHour.isFinite())
        }
    }
}
