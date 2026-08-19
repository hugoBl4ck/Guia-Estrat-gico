package com.girocerto.copilot.domain.model

enum class DecisionStatus(val label: String) {
    EXCELLENT("🟢 ACEITAR"),
    MODERATE("🟡 AVALIAR"),
    REJECT("🔴 RECUSAR")
}
