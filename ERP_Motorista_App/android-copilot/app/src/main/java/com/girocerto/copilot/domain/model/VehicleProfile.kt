package com.girocerto.copilot.domain.model

data class VehicleProfile(
    val id: String,
    val name: String,
    val cpk: Double,             // R$/km
    val isElectric: Boolean = false,
    val minRatePerKm: Double = 2.20,
    val minGrossPerHour: Double = 40.0
) {
    companion object {
        val BYD_DOLPHIN_MINI = VehicleProfile(
            id = "byd_dolphin_mini",
            name = "BYD Dolphin Mini (Elétrico)",
            cpk = 0.38,
            isElectric = true,
            minRatePerKm = 2.00,
            minGrossPerHour = 38.0
        )

        val FORD_KA_1_0 = VehicleProfile(
            id = "ford_ka_1_0",
            name = "Ford Ka 1.0 Flex",
            cpk = 0.85,
            isElectric = false,
            minRatePerKm = 2.40,
            minGrossPerHour = 45.0
        )
    }
}
