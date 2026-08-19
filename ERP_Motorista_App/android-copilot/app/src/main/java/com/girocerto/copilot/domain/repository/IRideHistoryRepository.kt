package com.girocerto.copilot.domain.repository

import com.girocerto.copilot.domain.model.RideAnalysis
import com.girocerto.copilot.domain.model.RideOffer
import kotlinx.coroutines.flow.Flow

interface IRideHistoryRepository {
    fun getRecentAnalyses(): Flow<List<RideAnalysis>>
    suspend fun saveAnalysis(analysis: RideAnalysis)
    suspend fun getPendingSyncOffers(): List<RideAnalysis>
    suspend fun markOffersAsSynced(offerIds: List<String>)
}
