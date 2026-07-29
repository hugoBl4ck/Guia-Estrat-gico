import { PlatformType, EarningDraft } from '../types';

/**
 * Módulo Parser de Notificações e Clipboard (Leitura de Uber Driver / 99 Driver / InDrive)
 * 
 * ANÁLISE DE VIABILIDADE TÉCNICA PWA vs. NATIVO:
 * - Em PWA (Navegador/Web standard), as Web Notifications APIs possuem restrição estrita de sandbox pelo SO (Android/iOS).
 *   Um web app não tem permissão para ler notificações recebidas de OUTROS aplicativos (ex: Uber Driver).
 * - MIGRATIVO RECOMENDADO PARA APP NATIVO: Para captura automatizada background via push no Android, 
 *   recomenda-se migrar o PWA usando o wrapper Capacitor/React Native e o plugin Android `NotificationListenerService`
 *   interceptando pacotes de `com.ubercab.driver`, `com.taxis99.driver` e `com.indrive.driver`.
 * - FALLBACK INTELIGENTE NO PWA ATUAL: Leitor de Área de Transferência (Clipboard Listener) & Colagem Rápida.
 *   Quando o motorista copia o texto da notificação ou cola no aplicativo, o sistema processa automaticamente
 *   e gera um Rascunho Pendente de Confirmação.
 */

export function parseNotificationOrClipboardText(text: string): EarningDraft | null {
  if (!text || text.trim().length === 0) return null;

  const textLower = text.toLowerCase();

  // Identificação da Plataforma
  let platform: PlatformType = 'UBER';
  if (textLower.includes('99') || textLower.includes('pop') || textLower.includes('99driver')) {
    platform = 'NINETY_NINE';
  } else if (textLower.includes('indrive') || textLower.includes('in drive') || textLower.includes('indriver')) {
    platform = 'INDRIVE';
  } else if (textLower.includes('particular') || textLower.includes('privado')) {
    platform = 'PRIVATE';
  } else if (!textLower.includes('uber') && !textLower.includes('ganho') && !textLower.includes('corrida') && !textLower.includes('r$')) {
    return null;
  }

  // Extração Monetária R$
  const moneyMatch = 
    textLower.match(/(\d+[\.,]?\d*)\s*(brl|reais|conto|real|r\$)/i) || 
    textLower.match(/(r\$\s*|brl\s*)(\d+[\.,]?\d*)/i) ||
    textLower.match(/(\d+[\.,]?\d*)/i);

  let grossAmount = moneyMatch ? parseFloat((moneyMatch[1] || moneyMatch[2]).replace(',', '.')) : 0;
  if (isNaN(grossAmount) || grossAmount <= 0) return null;

  // Tratar valores digitados em centavos sem vírgula (ex: 1500 -> 15.00)
  if (grossAmount > 1000 && !textLower.includes('relatório')) {
    grossAmount = grossAmount / 100;
  }

  // Extração de Gorjeta (se presente)
  const tipMatch = textLower.match(/(gorjeta|extra|adicional)\s*(de)?\s*(r\$\s*)?(\d+[\.,]?\d*)/i);
  const tipsAmount = tipMatch ? parseFloat(tipMatch[4].replace(',', '.')) : 0;

  // Extração de Quilometragem
  const kmMatch = textLower.match(/(\d+[\.,]?\d*)\s*(km|quilômetros|quilometro)/i);
  const rideDistanceKm = kmMatch ? parseFloat(kmMatch[1].replace(',', '.')) : 5.0;

  // Extração de Número de Corridas
  const tripsMatch = textLower.match(/(\d+)\s*(corridas|viagens)/i);
  const totalTrips = tripsMatch ? parseInt(tripsMatch[1], 10) : 1;

  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    platform,
    grossAmount,
    tipsAmount,
    rideDistanceKm,
    totalTrips,
    rawText: text,
    source: 'clipboard',
    timestamp: new Date().toISOString(),
  };
}
