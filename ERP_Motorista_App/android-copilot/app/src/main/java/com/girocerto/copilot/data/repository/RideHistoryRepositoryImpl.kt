package com.girocerto.copilot.data.repository

import com.girocerto.copilot.data.local.dao.RideOfferDao
import com.girocerto.copilot.data.local.entity.RideOfferEntity
import com.girocerto.copilot.domain.model.*
import com.girocerto.copilot.domain.repository.IRideHistoryRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class RideHistoryRepositoryImpl(
    private val rideOfferDao: RideOfferDao
) : IRideHistoryRepository {

    override fun getRecentAnalyses(): Flow<List<RideAnalysis>> {
        return rideOfferDao.getRecentOffers().map { list ->
            list.map { entity -> toDomain(entity) }
        }
    }

    override suspend fun saveAnalysis(analysis: RideAnalysis) {
        val entity = RideOfferEntity(
            id = analysis.offer.id,
            platform = analysis.offer.platform.name,
            grossAmount = analysis.offer.grossAmount,
            pickupDistanceKm = analysis.offer.pickupDistanceKm,
            pickupDurationMinutes = analysis.offer.pickupDurationMinutes,
            tripDistanceKm = analysis.offer.tripDistanceKm,
            tripDurationMinutes = analysis.offer.tripDurationMinutes,
            totalDistanceKm = analysis.offer.totalDistanceKm,
            totalDurationMinutes = analysis.offer.totalDurationMinutes,
            ratePerKm = analysis.ratePerKm,
            grossPerHour = analysis.grossPerHour,
            vehicleCpk = analysis.vehicleCpk,
            estimatedCost = analysis.estimatedCost,
            netProfit = analysis.netProfit,
            netPerHour = analysis.netPerHour,
            status = analysis.status.name,
            recommendationReason = analysis.recommendationReason,
            timestamp = analysis.offer.timestamp,
            isSynced = false
        )
        rideOfferDao.insertOffer(entity)
    }

    override suspend fun getPendingSyncOffers(): List<RideAnalysis> {
        return rideOfferDao.getPendingSyncOffers().map { toDomain(it) }
    }

    override suspend fun markOffersAsSynced(offerIds: List<String>) {
        rideOfferDao.markOffersAsSynced(offerIds)
    }

    private fun toDomain(entity: RideOfferEntity): RideAnalysis {
        val platform = try {
            PlatformType.valueOf(entity.platform)
        } catch (e: Exception) {
            PlatformType.UNKNOWN
        }

        val status = try {
            DecisionStatus.valueOf(entity.status)
        } catch (e: Exception) {
            DecisionStatus.MODERATE
        }

        val offer = RideOffer(
            id = entity.id,
            platform = platform,
            grossAmount = entity.grossAmount,
            pickupDistanceKm = entity.pickupDistanceKm,
            pickupDurationMinutes = entity.pickupDurationMinutes,
            tripDistanceKm = entity.tripDistanceKm,
            tripDurationMinutes = entity.tripDurationMinutes,
            timestamp = entity.timestamp
        )

        return RideAnalysis(
            offer = offer,
            ratePerKm = entity.ratePerKm,
            grossPerHour = entity.grossPerHour,
            vehicleCpk = entity.vehicleCpk,
            estimatedCost = entity.estimatedCost,
            netProfit = entity.netProfit,
            netPerHour = entity.netPerHour,
            status = status,
            recommendationReason = entity.recommendationReason
        )
    }
}
