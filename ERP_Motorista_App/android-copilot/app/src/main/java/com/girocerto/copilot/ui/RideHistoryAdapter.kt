package com.girocerto.copilot.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.girocerto.copilot.R
import com.girocerto.copilot.databinding.ItemHistoryRideBinding
import com.girocerto.copilot.domain.model.DecisionStatus
import com.girocerto.copilot.domain.model.PlatformType
import com.girocerto.copilot.domain.model.RideAnalysis
import java.text.SimpleDateFormat
import java.util.*

class RideHistoryAdapter : ListAdapter<RideAnalysis, RideHistoryAdapter.ViewHolder>(DiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemHistoryRideBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    class ViewHolder(private val binding: ItemHistoryRideBinding) : RecyclerView.ViewHolder(binding.root) {
        private val dateFormat = SimpleDateFormat("dd/MM HH:mm", Locale.getDefault())

        fun bind(analysis: RideAnalysis) {
            val offer = analysis.offer
            binding.tvPlatform.text = offer.platform.displayName
            binding.tvPlatform.setBackgroundResource(
                when (offer.platform) {
                    PlatformType.UBER -> R.color.badge_uber
                    PlatformType.NINETY_NINE -> R.color.badge_99
                    PlatformType.INDRIVE -> R.color.badge_indrive
                    else -> R.color.surface_card
                }
            )

            binding.tvTimestamp.text = dateFormat.format(Date(offer.timestamp))
            binding.tvGrossAmount.text = "R$ ${String.format("%.2f", offer.grossAmount)}"
            
            binding.tvStatus.text = when (analysis.status) {
                DecisionStatus.EXCELLENT -> "🟢 EXCELENTE"
                DecisionStatus.MODERATE -> "🟡 ACEITÁVEL"
                DecisionStatus.REJECT -> "🔴 REJEITAR"
            }
            binding.tvStatus.setTextColor(binding.root.context.getColor(
                when (analysis.status) {
                    DecisionStatus.EXCELLENT -> R.color.status_green
                    DecisionStatus.MODERATE -> R.color.status_yellow
                    DecisionStatus.REJECT -> R.color.status_red
                }
            ))

            binding.tvDetails.text = "${String.format("%.1f", offer.totalDistanceKm)} km | ${offer.totalDurationMinutes} min | R$ ${String.format("%.2f", analysis.ratePerKm)}/km"
            binding.tvNetProfit.text = "Lucro Líquido: R$ ${String.format("%.2f", analysis.netProfit)}"
        }
    }

    class DiffCallback : DiffUtil.ItemCallback<RideAnalysis>() {
        override fun areItemsTheSame(oldItem: RideAnalysis, newItem: RideAnalysis): Boolean {
            return oldItem.offer.id == newItem.offer.id
        }

        override fun areContentsTheSame(oldItem: RideAnalysis, newItem: RideAnalysis): Boolean {
            return oldItem == newItem
        }
    }
}
