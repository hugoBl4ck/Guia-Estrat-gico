package com.girocerto.copilot.data.parser

import com.girocerto.copilot.domain.model.PlatformType
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class InDriveOfferParserTest {

    private lateinit var parser: InDriveOfferParser

    @Before
    fun setUp() {
        parser = InDriveOfferParser()
    }

    @Test
    fun `should parse InDrive passenger offer dump`() {
        val sampleDump = "InDrive | Oferta: R$ 32,00 | 2,5 km até o passageiro | 11,0 km até o destino | Dinheiro"

        val offer = parser.parseFromTextDump(sampleDump)

        assertNotNull(offer)
        assertEquals(PlatformType.INDRIVE, offer?.platform)
        assertEquals(32.00, offer?.grossAmount ?: 0.0, 0.01)
        assertEquals(2.5, offer?.pickupDistanceKm ?: 0.0, 0.01)
        assertEquals(11.0, offer?.tripDistanceKm ?: 0.0, 0.01)
    }
}
