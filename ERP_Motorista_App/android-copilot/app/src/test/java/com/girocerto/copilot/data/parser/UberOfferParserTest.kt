package com.girocerto.copilot.data.parser

import com.girocerto.copilot.domain.model.PlatformType
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class UberOfferParserTest {

    private lateinit var parser: UberOfferParser

    @Before
    fun setUp() {
        parser = UberOfferParser()
    }

    @Test
    fun `should parse standard UberX offer text dump`() {
        val sampleDump = "UberX | R$ 24,50 | 2,3 km (6 min) de você | Viagem de 7,8 km (18 min) | Destino: Av. Paulista"

        val offer = parser.parseFromTextDump(sampleDump)

        assertNotNull(offer)
        assertEquals(PlatformType.UBER, offer?.platform)
        assertEquals(24.50, offer?.grossAmount ?: 0.0, 0.01)
        assertEquals(2.3, offer?.pickupDistanceKm ?: 0.0, 0.01)
        assertEquals(6, offer?.pickupDurationMinutes)
        assertEquals(7.8, offer?.tripDistanceKm ?: 0.0, 0.01)
        assertEquals(18, offer?.tripDurationMinutes)
    }

    @Test
    fun `should parse Uber Comfort offer with dots in thousands`() {
        val sampleDump = "Uber Comfort | R$ 1.250,00 | 12,5 km (25 min) | Viagem de 85,0 km (110 min)"

        val offer = parser.parseFromTextDump(sampleDump)

        assertNotNull(offer)
        assertEquals(1250.00, offer?.grossAmount ?: 0.0, 0.01)
        assertEquals(12.5, offer?.pickupDistanceKm ?: 0.0, 0.01)
        assertEquals(85.0, offer?.tripDistanceKm ?: 0.0, 0.01)
    }

    @Test
    fun `should return null if text dump has no price or invalid format`() {
        val invalidDump = "Você está online | Procurando viagens na região..."
        val offer = parser.parseFromTextDump(invalidDump)
        assertNull(offer)
    }

    @Test
    fun `should reject price below sanity threshold`() {
        val abnormalDump = "R$ 0,50 | 1,0 km | 5 min"
        val offer = parser.parseFromTextDump(abnormalDump)
        assertNull(offer)
    }
}
