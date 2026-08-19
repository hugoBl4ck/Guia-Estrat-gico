package com.girocerto.copilot

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.girocerto.copilot.data.local.AppDatabase
import com.girocerto.copilot.data.local.PreferencesManager
import com.girocerto.copilot.data.parser.OfferParserFactory
import com.girocerto.copilot.data.repository.RideHistoryRepositoryImpl
import com.girocerto.copilot.data.repository.VehicleRepositoryImpl
import com.girocerto.copilot.data.worker.SyncOffersWorker
import com.girocerto.copilot.domain.repository.IRideHistoryRepository
import com.girocerto.copilot.domain.repository.IVehicleRepository
import com.girocerto.copilot.domain.usecase.AnalyzeRideOfferUseCase
import java.util.concurrent.TimeUnit

class CopilotApplication : Application() {

    lateinit var database: AppDatabase private set
    lateinit var preferencesManager: PreferencesManager private set
    lateinit var vehicleRepository: IVehicleRepository private set
    lateinit var rideHistoryRepository: IRideHistoryRepository private set
    lateinit var analyzeRideOfferUseCase: AnalyzeRideOfferUseCase private set
    lateinit var parserFactory: OfferParserFactory private set

    companion object {
        const val NOTIFICATION_CHANNEL_ID = "copilot_foreground_service"
    }

    override fun onCreate() {
        super.onCreate()

        // 1. Inicializar Camada de Dados e Injeção
        database = AppDatabase.getDatabase(this)
        preferencesManager = PreferencesManager(this)
        vehicleRepository = VehicleRepositoryImpl(preferencesManager)
        rideHistoryRepository = RideHistoryRepositoryImpl(database.rideOfferDao())
        analyzeRideOfferUseCase = AnalyzeRideOfferUseCase()
        parserFactory = OfferParserFactory()

        // 2. Criar Canais de Notificação para Android 8+ e 14+
        createNotificationChannel()

        // 3. Agendar Sincronização em Segundo Plano via WorkManager
        schedulePeriodicSync()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                getString(R.string.notification_channel_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.notification_channel_desc)
                setShowBadge(false)
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager?.createNotificationChannel(channel)
        }
    }

    private fun schedulePeriodicSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncRequest = PeriodicWorkRequestBuilder<SyncOffersWorker>(15, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "SyncOffersPeriodicWork",
            ExistingPeriodicWorkPolicy.KEEP,
            syncRequest
        )
    }
}
