package com.girocerto.copilot.service

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.girocerto.copilot.CopilotApplication
import com.girocerto.copilot.event.DiagnosticLogBus
import com.girocerto.copilot.event.OfferEventBus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class RideAccessibilityService : AccessibilityService() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var lastOfferSignature: String = ""
    private var lastOfferTimestamp: Long = 0

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val packageName = event.packageName?.toString() ?: "unknown"
        
        // 1. Extração profunda de nós (event.source + rootInActiveWindow + windows)
        val allDumps = mutableListOf<String>()
        
        // Extrai da origem do evento (mais confiável em transições de layout)
        event.source?.let {
            val srcDump = extractTextDumpFromNode(it)
            if (srcDump.isNotBlank()) allDumps.add(srcDump)
        }

        // Extrai da raiz da janela ativa
        rootInActiveWindow?.let {
            val rootDump = extractTextDumpFromNode(it)
            if (rootDump.isNotBlank()) allDumps.add(rootDump)
        }

        // Extrai de todas as janelas do sistema (pop-ups, modais, overlays da 99/Uber)
        try {
            for (window in windows) {
                window.root?.let {
                    val winDump = extractTextDumpFromNode(it)
                    if (winDump.isNotBlank()) allDumps.add(winDump)
                }
            }
        } catch (_: Exception) {
        }

        if (allDumps.isEmpty()) return

        val rideKeywords = listOf(
            "99pop", "99plus", "99moto", "99entrega", "99comfort", "99negocia", "99 táxi", "99taxi",
            "uberx", "uber comfort", "uber black", "uber flash", "uber moto", "uber promo",
            "indrive", "indriver", "aceitar", "recusar", "rejeitar", "embarque", "desembarque",
            "passageiro", "destino", "nova corrida", "nova chamada", "toque para aceitar", "viagem"
        )

        // Priorizar o dump que contiver palavras de corrida e valor R$
        val textDump = allDumps.firstOrNull { dump ->
            val lower = dump.lowercase()
            rideKeywords.any { lower.contains(it) } && (dump.contains("R$") || dump.contains("R $") || dump.contains("r$"))
        } ?: allDumps.firstOrNull { dump ->
            val lower = dump.lowercase()
            rideKeywords.any { lower.contains(it) }
        } ?: allDumps.firstOrNull { it.contains("R$") } ?: allDumps.firstOrNull { it.isNotBlank() } ?: ""

        if (textDump.isBlank()) return

        // Log diagnóstico em tempo real
        val preview = if (textDump.length > 90) textDump.take(90) + "..." else textDump
        DiagnosticLogBus.log("App: $packageName | Texto: \"$preview\"")

        // Processar em thread de background (Dispatchers.Default)
        serviceScope.launch {
            try {
                val app = application as? CopilotApplication ?: return@launch
                val parser = app.parserFactory.getParserForPackageOrContent(packageName, textDump)

                // 2. Parsing
                val offer = parser.parseFromTextDump(textDump)
                if (offer == null) {
                    return@launch
                }

                DiagnosticLogBus.log("✅ OFERTA RECONHECIDA: ${offer.platform.name} -> R$ ${String.format("%.2f", offer.grossAmount)} (${String.format("%.1f", offer.totalDistanceKm)} km)")

                // 3. Debounce para evitar reprocessar o mesmo card no mesmo ciclo de 4 segundos
                val signature = "${offer.platform.name}_${offer.grossAmount}_${offer.totalDistanceKm}"
                val now = System.currentTimeMillis()
                if (signature == lastOfferSignature && (now - lastOfferTimestamp) < 4000) {
                    return@launch
                }
                lastOfferSignature = signature
                lastOfferTimestamp = now

                // 4. Executar Análise Financeira com o Veículo Ativo
                val vehicleProfile = app.vehicleRepository.getActiveVehicleProfile()
                val analysis = app.analyzeRideOfferUseCase(offer, vehicleProfile)

                DiagnosticLogBus.log("🚀 HUD DISPARADO: Lucro R$ ${String.format("%.2f", analysis.netProfit)} (${analysis.status.name})")

                // 5. Garantir que o serviço de Overlay está ativo e emitir para o EventBus
                withContext(Dispatchers.Main) {
                    val overlayIntent = Intent(applicationContext, FloatingOverlayService::class.java)
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        startForegroundService(overlayIntent)
                    } else {
                        startService(overlayIntent)
                    }
                }

                OfferEventBus.emitOffer(analysis)

                // 6. Salvar no histórico local Room em background
                app.rideHistoryRepository.saveAnalysis(analysis)

            } catch (e: Exception) {
                DiagnosticLogBus.log("❌ Erro ao analisar: ${e.message}")
                e.printStackTrace()
            }
        }
    }

    private fun extractTextDumpFromNode(node: AccessibilityNodeInfo?): String {
        if (node == null) return ""
        val textList = ArrayList<String>(20)
        collectNodeTexts(node, textList)
        return textList.joinToString(" | ")
    }

    private fun collectNodeTexts(node: AccessibilityNodeInfo?, result: MutableList<String>) {
        if (node == null) return

        node.text?.toString()?.trim()?.let {
            if (it.isNotEmpty() && !result.contains(it)) result.add(it)
        }

        node.contentDescription?.toString()?.trim()?.let {
            if (it.isNotEmpty() && !result.contains(it)) result.add(it)
        }

        for (i in 0 until node.childCount) {
            collectNodeTexts(node.getChild(i), result)
        }
    }

    override fun onInterrupt() {
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
    }
}
