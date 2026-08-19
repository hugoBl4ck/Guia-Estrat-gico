package com.girocerto.copilot.domain.repository

import com.girocerto.copilot.domain.model.PlatformType
import com.girocerto.copilot.domain.model.RideOffer

interface IOfferParser {
    val platform: PlatformType
    
    /**
     * Extrai os dados da chamada a partir da lista de textos e descrições dos nós da tela.
     */
    fun parseFromTextDump(textDump: String): RideOffer?
}
