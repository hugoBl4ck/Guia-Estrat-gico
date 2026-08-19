package com.girocerto.copilot.service

import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.girocerto.copilot.CopilotApplication
import com.girocerto.copilot.R
import com.girocerto.copilot.event.OfferEventBus
import com.girocerto.copilot.ui.MainActivity
import com.girocerto.copilot.ui.hud.FloatingHudManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class FloatingOverlayService : Service() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private lateinit var hudManager: FloatingHudManager

    override fun onCreate() {
        super.onCreate()
        hudManager = FloatingHudManager(this)

        startForegroundWithNotification()
        hudManager.showPersistentBubble()
        observeIncomingOffers()
    }

    private fun startForegroundWithNotification() {
        // Criar ação para esconder/fechar o HUD via notificação
        val hideIntent = Intent(this, FloatingOverlayService::class.java).apply {
            putExtra("ACTION", "STOP_SERVICE")
        }
        val hidePendingIntent = PendingIntent.getService(this, 1, hideIntent, PendingIntent.FLAG_IMMUTABLE)

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CopilotApplication.NOTIFICATION_CHANNEL_ID)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(getString(R.string.service_running_notification))
            .setSmallIcon(R.drawable.ic_copilot_logo)
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Parar Monitoramento", hidePendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val fgsType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            } else {
                0
            }
            startForeground(1001, notification, fgsType)
        } else {
            startForeground(1001, notification)
        }
    }

    private fun observeIncomingOffers() {
        serviceScope.launch {
            OfferEventBus.incomingOffers.collectLatest { analysis ->
                android.util.Log.d("CopilotHUD", "EventBus received offer from ${analysis.offer.platform}")
                hudManager.showOrUpdateHud(analysis)
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.getStringExtra("ACTION")
        when (action) {
            "HIDE_HUD" -> hudManager.hideHud()
            "STOP_SERVICE" -> stopSelf()
        }
        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        hudManager.destroy()
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        hudManager.destroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
