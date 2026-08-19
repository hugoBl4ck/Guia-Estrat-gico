package com.girocerto.copilot.data.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.girocerto.copilot.CopilotApplication
import com.girocerto.copilot.data.remote.SupabaseRestClient

class SyncOffersWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val restClient = SupabaseRestClient()

    override suspend fun doWork(): Result {
        val app = applicationContext as? CopilotApplication ?: return Result.failure()
        val repository = app.rideHistoryRepository

        val pending = repository.getPendingSyncOffers()
        if (pending.isEmpty()) {
            return Result.success()
        }

        val success = restClient.syncOffersToCloud(pending)
        return if (success) {
            val ids = pending.map { it.offer.id }
            repository.markOffersAsSynced(ids)
            Result.success()
        } else {
            Result.retry()
        }
    }
}
