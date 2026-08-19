package com.girocerto.copilot.ui

import android.accessibilityservice.AccessibilityServiceInfo
import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.girocerto.copilot.CopilotApplication
import com.girocerto.copilot.R
import com.girocerto.copilot.data.worker.SyncOffersWorker
import com.girocerto.copilot.databinding.ActivityMainBinding
import com.girocerto.copilot.domain.model.PlatformType
import com.girocerto.copilot.domain.model.RideOffer
import com.girocerto.copilot.domain.model.VehicleProfile
import com.girocerto.copilot.event.OfferEventBus
import com.girocerto.copilot.service.FloatingOverlayService
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val app: CopilotApplication get() = application as CopilotApplication

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupPermissionsUI()
        setupVehicleSelectionUI()
        setupTargetSettingsUI()
        setupDiagnosticMonitor()
        setupActions()
    }

    override fun onResume() {
        super.onResume()
        updatePermissionsStatus()
    }

    private fun setupPermissionsUI() {
        binding.btnRequestOverlay.setOnClickListener {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                )
                startActivity(intent)
            }
        }

        binding.btnRequestAccessibility.setOnClickListener {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            startActivity(intent)
        }
    }

    private fun updatePermissionsStatus() {
        // 1. Overlay Check
        val canOverlay = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(this)
        } else {
            true
        }

        if (canOverlay) {
            binding.tvOverlayStatus.text = "✅ Autorizado com sucesso"
            binding.tvOverlayStatus.setTextColor(getColor(R.color.status_green))
            binding.btnRequestOverlay.isEnabled = false
            binding.btnRequestOverlay.text = "Ativo"
        } else {
            binding.tvOverlayStatus.text = "❌ Pendente de autorização"
            binding.tvOverlayStatus.setTextColor(getColor(R.color.status_red))
            binding.btnRequestOverlay.isEnabled = true
            binding.btnRequestOverlay.text = "Ativar"
        }

        // 2. Accessibility Check
        val isAccessibilityActive = isAccessibilityServiceEnabled()
        if (isAccessibilityActive) {
            binding.tvAccessibilityStatus.text = "✅ Leitor ativo e monitorando"
            binding.tvAccessibilityStatus.setTextColor(getColor(R.color.status_green))
            binding.btnRequestAccessibility.text = "Ativo"
        } else {
            binding.tvAccessibilityStatus.text = "❌ Serviço desligado no Android"
            binding.tvAccessibilityStatus.setTextColor(getColor(R.color.status_red))
            binding.btnRequestAccessibility.text = "Configurar"
        }
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        val enabledServices = Settings.Secure.getString(contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
        return enabledServices?.contains(packageName) == true
    }

    private fun isServiceRunning(serviceClass: Class<*>): Boolean {
        val manager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        for (service in manager.getRunningServices(Int.MAX_VALUE)) {
            if (serviceClass.name == service.service.className) {
                return true
            }
        }
        return false
    }

    private fun setupVehicleSelectionUI() {
        lifecycleScope.launch {
            val active = app.vehicleRepository.getActiveVehicleProfile()
            if (active.id == VehicleProfile.FORD_KA_1_0.id) {
                binding.rbFordKa.isChecked = true
            } else {
                binding.rbDolphinMini.isChecked = true
            }
            binding.tvCurrentCpkValue.text = "R$ ${String.format("%.2f", active.cpk)} / km"
        }

        binding.rgVehicleSelection.setOnCheckedChangeListener { _, checkedId ->
            lifecycleScope.launch {
                val selectedProfile = when (checkedId) {
                    R.id.rbFordKa -> VehicleProfile.FORD_KA_1_0
                    else -> VehicleProfile.BYD_DOLPHIN_MINI
                }
                app.vehicleRepository.setActiveVehicle(selectedProfile)
                binding.tvCurrentCpkValue.text = "R$ ${String.format("%.2f", selectedProfile.cpk)} / km"
                
                // Atualizar campos de meta com os valores do perfil selecionado
                binding.etTargetKm.setText(selectedProfile.minRatePerKm.toString())
                binding.etTargetHour.setText(selectedProfile.minGrossPerHour.toString())
                
                Toast.makeText(this@MainActivity, "Veículo ativo: ${selectedProfile.name}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun setupTargetSettingsUI() {
        lifecycleScope.launch {
            val profile = app.vehicleRepository.getActiveVehicleProfile()
            binding.etTargetKm.setText(profile.minRatePerKm.toString())
            binding.etTargetHour.setText(profile.minGrossPerHour.toString())
        }

        binding.btnSaveTargets.setOnClickListener {
            val minRate = binding.etTargetKm.text.toString().toDoubleOrNull()
            val minHour = binding.etTargetHour.text.toString().toDoubleOrNull()

            if (minRate != null && minHour != null) {
                lifecycleScope.launch {
                    app.vehicleRepository.updateTargets(minRate, minHour)
                    Toast.makeText(this@MainActivity, "Metas atualizadas com sucesso!", Toast.LENGTH_SHORT).show()
                }
            } else {
                Toast.makeText(this@MainActivity, "Por favor, insira valores válidos", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun setupDiagnosticMonitor() {
        lifecycleScope.launch {
            com.girocerto.copilot.event.DiagnosticLogBus.logs.collect { logs ->
                if (logs.isEmpty()) {
                    binding.tvDiagnosticLogs.text = "Aguardando eventos da 99 / Uber...\n(Abra a 99 ou Uber para testar a leitura)"
                } else {
                    binding.tvDiagnosticLogs.text = logs.joinToString("\n")
                }
            }
        }

        binding.btnClearLogs.setOnClickListener {
            com.girocerto.copilot.event.DiagnosticLogBus.clear()
        }

        binding.btnCopyLogs.setOnClickListener {
            val logsText = binding.tvDiagnosticLogs.text.toString()
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as? android.content.ClipboardManager
            val clip = android.content.ClipData.newPlainText("GiroCerto_Logs", logsText)
            clipboard?.setPrimaryClip(clip)
            Toast.makeText(this, "Logs copiados para a área de transferência!", Toast.LENGTH_SHORT).show()
        }
    }

    private fun setupActions() {
        binding.btnSimulateHud.setOnClickListener {
            simulateSampleOffer()
        }

        binding.btnToggleFloatingIcon.setOnClickListener {
            val serviceIntent = Intent(this, FloatingOverlayService::class.java)
            if (isServiceRunning(FloatingOverlayService::class.java)) {
                stopService(serviceIntent)
                Toast.makeText(this, "Ícone desativado", Toast.LENGTH_SHORT).show()
            } else {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent)
                } else {
                    startService(serviceIntent)
                }
                Toast.makeText(this, "Ícone ativado!", Toast.LENGTH_SHORT).show()
            }
        }

        // Simulação de corrida real da 99 para testar o histórico e o leitor
        binding.btnSimulateHud.setOnLongClickListener {
            simulate99Offer()
            true
        }

        binding.btnViewHistory.setOnClickListener {
            val intent = Intent(this, HistoryActivity::class.java)
            startActivity(intent)
        }

        binding.btnSyncSupabase.setOnClickListener {
            val syncWork = OneTimeWorkRequestBuilder<SyncOffersWorker>().build()
            WorkManager.getInstance(this).enqueue(syncWork)
            Toast.makeText(this, "Sincronização com o ERP iniciada em segundo plano!", Toast.LENGTH_SHORT).show()
        }
    }

    private fun simulateSampleOffer() {
        lifecycleScope.launch {
            val sampleOffer = RideOffer(
                platform = PlatformType.UBER,
                grossAmount = 28.50,
                pickupDistanceKm = 2.1,
                pickupDurationMinutes = 5,
                tripDistanceKm = 7.8,
                tripDurationMinutes = 18,
                rawTextDump = "UberX | R$ 28,50 | 2,1 km (5 min) | 7,8 km (18 min)"
            )

            val profile = app.vehicleRepository.getActiveVehicleProfile()
            val analysis = app.analyzeRideOfferUseCase(sampleOffer, profile)

            // Garantir que o serviço de Overlay está ativo
            val serviceIntent = Intent(this@MainActivity, FloatingOverlayService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }

            // Emitir evento para o HUD
            OfferEventBus.emitOffer(analysis)
            Toast.makeText(this@MainActivity, "Card simulado exibido na tela!", Toast.LENGTH_SHORT).show()
        }
    }

    private fun simulate99Offer() {
        lifecycleScope.launch {
            val text99 = "99Pop | R$ 15,60 | Aceitar | 1,2 km | 4 min | 6,5 km | 12 min"
            val parser = app.parserFactory.getParserForPlatform(PlatformType.NINETY_NINE)
            val offer = parser.parseFromTextDump(text99) ?: return@launch
            
            val profile = app.vehicleRepository.getActiveVehicleProfile()
            val analysis = app.analyzeRideOfferUseCase(offer, profile)
            
            // Salvar no histórico
            app.rideHistoryRepository.saveAnalysis(analysis)
            
            // Emitir para o HUD
            OfferEventBus.emitOffer(analysis)
            Toast.makeText(this@MainActivity, "Simulação 99 salva no histórico e exibida!", Toast.LENGTH_SHORT).show()
        }
    }
}
