package com.girocerto.copilot.ui.hud

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.util.Log
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.*
import androidx.appcompat.view.ContextThemeWrapper
import android.widget.ImageButton
import android.widget.TextView
import com.girocerto.copilot.R
import com.girocerto.copilot.domain.model.DecisionStatus
import com.girocerto.copilot.domain.model.PlatformType
import com.girocerto.copilot.domain.model.RideAnalysis

class FloatingHudManager(private val context: Context) {

    private val windowManager: WindowManager =
        context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val hapticHelper = HapticFeedbackHelper(context)
    private val mainHandler = Handler(Looper.getMainLooper())

    private var hudView: View? = null
    private var bubbleView: View? = null
    private var isViewAttached = false
    private var isBubbleAttached = false

    private val autoDismissRunnable = Runnable {
        hideHud()
    }

    @SuppressLint("InflateParams", "ClickableViewAccessibility")
    fun showPersistentBubble() {
        mainHandler.post {
            if (isBubbleAttached) return@post
            try {
                val inflater = LayoutInflater.from(context)
                bubbleView = inflater.inflate(R.layout.view_floating_bubble, null)

                val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                } else {
                    @Suppress("DEPRECATION")
                    WindowManager.LayoutParams.TYPE_PHONE
                }

                val params = WindowManager.LayoutParams(
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    layoutType,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                    PixelFormat.TRANSLUCENT
                ).apply {
                    gravity = Gravity.CENTER_VERTICAL or Gravity.START
                    x = 0
                    y = 0
                }

                var initialX = 0
                var initialY = 0
                var initialTouchX = 0f
                var initialTouchY = 0f

                bubbleView?.setOnTouchListener { v, event ->
                    when (event.action) {
                        MotionEvent.ACTION_DOWN -> {
                            initialX = params.x
                            initialY = params.y
                            initialTouchX = event.rawX
                            initialTouchY = event.rawY
                            true
                        }
                        MotionEvent.ACTION_MOVE -> {
                            params.x = initialX + (event.rawX - initialTouchX).toInt()
                            params.y = initialY + (event.rawY - initialTouchY).toInt()
                            windowManager.updateViewLayout(bubbleView, params)
                            true
                        }
                        MotionEvent.ACTION_UP -> {
                            // Se for apenas um clique, abre o app
                            val diffX = Math.abs(event.rawX - initialTouchX)
                            val diffY = Math.abs(event.rawY - initialTouchY)
                            if (diffX < 10 && diffY < 10) {
                                val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                                intent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                context.startActivity(intent)
                            }
                            true
                        }
                        else -> false
                    }
                }

                windowManager.addView(bubbleView, params)
                isBubbleAttached = true
            } catch (e: Exception) {
                Log.e("CopilotHUD", "Error showing bubble", e)
            }
        }
    }

    fun hideBubble() {
        mainHandler.post {
            if (isBubbleAttached && bubbleView != null) {
                try {
                    windowManager.removeView(bubbleView)
                } catch (_: Exception) {
                } finally {
                    bubbleView = null
                    isBubbleAttached = false
                }
            }
        }
    }

    @SuppressLint("InflateParams", "ClickableViewAccessibility")
    fun showOrUpdateHud(analysis: RideAnalysis) {
        Log.d("CopilotHUD", "Requested HUD for: ${analysis.offer.platform}")
        mainHandler.post {
            try {
                if (hudView == null) {
                    val themedContext = ContextThemeWrapper(context, R.style.Theme_GiroCertoCopilot)
                    val inflater = LayoutInflater.from(themedContext)
                    hudView = inflater.inflate(R.layout.view_floating_hud, null)
                    
                    // Garantir que a view tenha foco para os temas de botões funcionarem
                    hudView?.isClickable = true
                    hudView?.isFocusable = true

                    val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                    } else {
                        @Suppress("DEPRECATION")
                        WindowManager.LayoutParams.TYPE_PHONE
                    }

                    val params = WindowManager.LayoutParams(
                        WindowManager.LayoutParams.MATCH_PARENT,
                        WindowManager.LayoutParams.WRAP_CONTENT,
                        layoutType,
                        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                        PixelFormat.TRANSLUCENT
                    ).apply {
                        gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
                        y = 150
                    }

                    // Touch drag listener para mover o card se o motorista quiser
                    var initialY = 0
                    var initialTouchY = 0f

                    hudView?.setOnTouchListener { _, event ->
                        when (event.action) {
                            MotionEvent.ACTION_DOWN -> {
                                initialY = params.y
                                initialTouchY = event.rawY
                                true
                            }
                            MotionEvent.ACTION_MOVE -> {
                                params.y = initialY + (event.rawY - initialTouchY).toInt()
                                if (isViewAttached && hudView != null) {
                                    try {
                                        windowManager.updateViewLayout(hudView, params)
                                    } catch (_: Exception) {}
                                }
                                true
                            }
                            else -> false
                        }
                    }

                    hudView?.findViewById<ImageButton>(R.id.btnCloseHud)?.setOnClickListener {
                        hideHud()
                    }

                    windowManager.addView(hudView, params)
                    isViewAttached = true
                    Log.d("CopilotHUD", "HUD view successfully added to WindowManager")
                }

                // Atualizar dados do card
                bindDataToView(analysis)

                // Feedback tátil veicular
                hapticHelper.vibrateForDecision(analysis.status)

                // Resetar auto-dismiss (14 segundos)
                mainHandler.removeCallbacks(autoDismissRunnable)
                mainHandler.postDelayed(autoDismissRunnable, 14000)

            } catch (e: Exception) {
                Log.e("CopilotHUD", "Critical error in FloatingHudManager", e)
            }
        }
    }

    private fun bindDataToView(analysis: RideAnalysis) {
        val view = hudView ?: return

        val badgePlatform = view.findViewById<TextView>(R.id.badgePlatform)
        val tvRecommendation = view.findViewById<TextView>(R.id.tvRecommendation)
        val tvHudPrice = view.findViewById<TextView>(R.id.tvHudPrice)
        val tvHudRateKm = view.findViewById<TextView>(R.id.tvHudRateKm)
        val tvHudRateHour = view.findViewById<TextView>(R.id.tvHudRateHour)
        val tvHudNetProfit = view.findViewById<TextView>(R.id.tvHudNetProfit)
        val tvTripDetails = view.findViewById<TextView>(R.id.tvTripDetails)
        val tvVehicleCpkUsed = view.findViewById<TextView>(R.id.tvVehicleCpkUsed)
        val cardContainer = view.findViewById<View>(R.id.cardContainer)

        badgePlatform.text = analysis.offer.platform.displayName
        badgePlatform.setBackgroundResource(
            when (analysis.offer.platform) {
                PlatformType.UBER -> R.color.badge_uber
                PlatformType.NINETY_NINE -> R.color.badge_99
                PlatformType.INDRIVE -> R.color.badge_indrive
                PlatformType.UNKNOWN -> R.color.surface_card
            }
        )

        tvHudPrice.text = "R$ ${String.format("%.2f", analysis.offer.grossAmount)}"
        tvHudRateKm.text = "R$ ${String.format("%.2f", analysis.ratePerKm)}/km"
        tvHudRateHour.text = "R$ ${String.format("%.0f", analysis.grossPerHour)}/h"
        tvHudNetProfit.text = "R$ ${String.format("%.2f", analysis.netProfit)}"

        tvTripDetails.text = "Busca: ${String.format("%.1f", analysis.offer.pickupDistanceKm)} km • Viagem: ${String.format("%.1f", analysis.offer.tripDistanceKm)} km (${analysis.offer.totalDurationMinutes} min)"
        tvVehicleCpkUsed.text = "CPK: R$ ${String.format("%.2f", analysis.vehicleCpk)}/km"

        when (analysis.status) {
            DecisionStatus.EXCELLENT -> {
                tvRecommendation.text = "🟢 ACEITAR (Excelente)"
                tvRecommendation.setTextColor(context.getColor(R.color.status_green))
                cardContainer.setBackgroundResource(R.drawable.bg_hud_green)
            }
            DecisionStatus.MODERATE -> {
                tvRecommendation.text = "🟡 AVALIAR (Médio)"
                tvRecommendation.setTextColor(context.getColor(R.color.status_yellow))
                cardContainer.setBackgroundResource(R.drawable.bg_hud_yellow)
            }
            DecisionStatus.REJECT -> {
                tvRecommendation.text = "🔴 RECUSAR (Prejuízo)"
                tvRecommendation.setTextColor(context.getColor(R.color.status_red))
                cardContainer.setBackgroundResource(R.drawable.bg_hud_red)
            }
        }
    }

    fun hideHud() {
        mainHandler.post {
            mainHandler.removeCallbacks(autoDismissRunnable)
            if (isViewAttached && hudView != null) {
                try {
                    windowManager.removeView(hudView)
                } catch (e: IllegalArgumentException) {
                    // View já foi removida
                } catch (e: Exception) {
                    e.printStackTrace()
                } finally {
                    hudView = null
                    isViewAttached = false
                }
            }
        }
    }

    fun destroy() {
        hideHud()
    }
}
