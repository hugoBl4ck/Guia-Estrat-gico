package com.girocerto.copilot.data.parser

import com.girocerto.copilot.domain.model.PlatformType
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class NinetyNineOfferParserTest {

    private lateinit var parser: NinetyNineOfferParser

    @Before
    fun setUp() {
        parser = NinetyNineOfferParser()
    }

    @Test
    fun `should parse 99 Pop call offer text dump`() {
        val sampleDump = "99Pop | R$ 19,80 | 1,4 km (4 min) | 6,2 km (16 min) | Aceitar | Recusar"

        val offer = parser.parseFromTextDump(sampleDump)

        assertNotNull(offer)
        assertEquals(PlatformType.NINETY_NINE, offer?.platform)
        assertEquals(19.80, offer?.grossAmount ?: 0.0, 0.01)
        assertEquals(1.4, offer?.pickupDistanceKm ?: 0.0, 0.01)
        assertEquals(4, offer?.pickupDurationMinutes)
        assertEquals(6.2, offer?.tripDistanceKm ?: 0.0, 0.01)
        assertEquals(16, offer?.tripDurationMinutes)
    }

    @Test
    fun `should return null for pure promotional screen without ride intent`() {
        val promoDump = "99Pay | Abasteça no posto Shell e ganhe R$ 10,00 de desconto a cada 30 km rodados | Indique e ganhe"
        val offer = parser.parseFromTextDump(promoDump)
        assertNull("Deveria ignorar tela puramente promocional sem chamada de corrida", offer)
    }

    @Test
    fun `should parse ride offer even if background contains 99pay or promo banner`() {
        val mixedDump = "Abasteça com R$ 0,20/L | 99Pay | 99Pop | R$ 25,40 | 2,0 km (5 min) | 8,5 km (20 min) | Toque para aceitar"
        val offer = parser.parseFromTextDump(mixedDump)

        assertNotNull(offer)
        assertEquals(25.40, offer?.grossAmount ?: 0.0, 0.01)
        assertEquals(2.0, offer?.pickupDistanceKm ?: 0.0, 0.01)
        assertEquals(8.5, offer?.tripDistanceKm ?: 0.0, 0.01)
    }

    @Test
    fun `should parse 99 Moto and 99 Entrega calls`() {
        val motoDump = "99Moto | R$ 12,50 | Embarque: 0,8 km | Destino: 4,0 km | Aceitar"
        val offer = parser.parseFromTextDump(motoDump)

        assertNotNull(offer)
        assertEquals(12.50, offer?.grossAmount ?: 0.0, 0.01)
        assertEquals(0.8, offer?.pickupDistanceKm ?: 0.0, 0.01)
        assertEquals(4.0, offer?.tripDistanceKm ?: 0.0, 0.01)
    }

    @Test
    fun `should parse 99 Pop offer with fragmented text views`() {
        val fragmentedDump = "99Pop | R$ | 21,90 | 1,5 | km | 5 | min | 7,0 | km | 18 | min | Aceitar"
        val offer = parser.parseFromTextDump(fragmentedDump)

        assertNotNull(offer)
        assertEquals(21.90, offer?.grossAmount ?: 0.0, 0.01)
        assertEquals(1.5, offer?.pickupDistanceKm ?: 0.0, 0.01)
        assertEquals(7.0, offer?.tripDistanceKm ?: 0.0, 0.01)
    }

    @Test
    fun `should return null when 99 screen does not contain price`() {
        val dumpWithoutPrice = "99 Motorista | Toque para aceitar | 5,0 km"
        val offer = parser.parseFromTextDump(dumpWithoutPrice)
        assertNull(offer)
    }
}
