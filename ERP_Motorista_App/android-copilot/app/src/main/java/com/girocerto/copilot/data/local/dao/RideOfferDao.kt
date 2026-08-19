package com.girocerto.copilot.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.girocerto.copilot.data.local.entity.RideOfferEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface RideOfferDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOffer(entity: RideOfferEntity)

    @Query("SELECT * FROM ride_offers ORDER BY timestamp DESC LIMIT 50")
    fun getRecentOffers(): Flow<List<RideOfferEntity>>

    @Query("SELECT * FROM ride_offers WHERE isSynced = 0 ORDER BY timestamp ASC")
    suspend fun getPendingSyncOffers(): List<RideOfferEntity>

    @Query("UPDATE ride_offers SET isSynced = 1 WHERE id IN (:offerIds)")
    suspend fun markOffersAsSynced(offerIds: List<String>)

    @Query("DELETE FROM ride_offers WHERE timestamp < :olderThanTimestamp")
    suspend fun deleteOldOffers(olderThanTimestamp: Long)
}
