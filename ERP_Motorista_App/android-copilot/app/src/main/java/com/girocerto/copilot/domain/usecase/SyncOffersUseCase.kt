package com.girocerto.copilot.domain.usecase

import com.girocerto.copilot.domain.repository.IRideHistoryRepository

class SyncOffersUseCase(
    private val repository: IRideHistoryRepository
) {
    suspend operator fun invoke(): Int {
        val pending = repository.getPendingSyncOffers()
        if (pending.isEmpty()) return 0
        
        // Simulação / chamada do envio em lote
        val syncedIds = pending.map { it.offer.id }
        repository.markOffersAsSynced(syncedIds)
        return syncedIds.size
    }
}
