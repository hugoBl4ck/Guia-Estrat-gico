# Kit de Divulgação & Ativação Stripe — GiroCerto ERP

Link oficial para divulgação: **https://app-girocerto.vercel.app/**

---

## 1. Ativação da Stripe em Produção (Passo a Passo)

As rotas serverless já estão prontas em `api/stripe-checkout.ts`, `api/stripe-webhook.ts` e `api/stripe-portal.ts`. Para começar a cobrar com liberação automática no Supabase:

1. **Executar as migrations no Supabase SQL Editor** (se ainda não executou):
   - `data/supabase_migration_v11_personal_finance_and_plans.sql`
   - `data/supabase_migration_v12_fornecedores.sql`
   - `data/supabase_migration_v13_stripe_customer.sql`

2. **Criar o Produto/Preço na Stripe Dashboard**:
   - Crie o produto **GiroCerto Wealth** com recorrência mensal de **R$ 49,90/mês** (BRL) e copie o **Price ID** (`price_...`).

3. **Configurar Variáveis de Ambiente na Vercel** (*Project Settings > Environment Variables*):
   - `STRIPE_SECRET_KEY` = `sk_live_...` (ou `sk_test_...` para testes)
   - `STRIPE_PRICE_ID_WEALTH` = `price_...`
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...` (obtido no passo 4)
   - `SUPABASE_URL` = URL do seu projeto Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` = chave `service_role` do Supabase *(apenas no servidor, nunca com prefixo `VITE_`)*

4. **Cadastrar o Webhook na Stripe Dashboard** (*Developers > Webhooks > Add endpoint*):
   - **URL:** `https://app-girocerto.vercel.app/api/stripe-webhook`
   - **Eventos:**
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Copie o **Signing secret (`whsec_...`)** e salve em `STRIPE_WEBHOOK_SECRET` na Vercel, depois faça um redeploy.

---

## 2. Kit de Divulgação Pronto para Usar

### A. Mensagem para Grupos de WhatsApp / Telegram de Motoristas
> 🚗⚡ **Você sabe quanto realmente sobra limpo por hora e por KM no seu bolso depois de descontar recarga/combustível, revisão, pneus, prestação e depreciação?**
>
> Criei o **GiroCerto ERP**, um app feito direto pra realidade de motorista de app (Uber, 99, carro elétrico ou flex):
> ✅ Calcula seu **CPK real** e lucro líquido por hora/km
> ✅ Funciona **mesmo sem internet** na rua e sincroniza na nuvem
> ✅ Divide **prestação e despesas por motorista** (50%/50% ou personalizado)
> ✅ Leitor de **NF-e XML** e cadastro de postos, eletropostos e oficinas com CNPJ
> ✅ Exporta **Excel com abas separadas** e **PDF alinhado**
> ✅ Módulo **GiroCerto Wealth** para finanças pessoais, reserva de emergência e investimentos (7 dias grátis!)
>
> Testa grátis agora no celular ou PC (dá pra instalar como App):
> 👉 **https://app-girocerto.vercel.app/**

---

### B. Roteiro Curto para Reels / TikTok / YouTube Shorts (30s)
- **0–5s (Gancho):** *"Motorista, fazer R$ 300 no dia não significa que você lucrou R$ 300."*
- **5–18s (Dor + Demo):** Mostre a tela do **GiroCerto ERP** mostrando o faturamento bruto vs custo por km (recarga/combustível + reserva de manutenção + parcela) e o **Lucro Limpo Real** por hora.
- **18–25s (Diferencial):** *"Ele ainda lê nota fiscal XML, exporta Excel e PDF organizados e separa seu dinheiro pessoal da operação do carro."*
- **25–30s (CTA):** *"O acesso base é gratuito e você pode testar no navegador ou instalar no celular. Link na bio / comentários: app-girocerto.vercel.app"*

---

### C. Texto Curto para Anúncios (Meta Ads / Google Ads)
- **Título:** *Pare de rodar no escuro: descubra seu Lucro Real por KM e por Hora*
- **Descrição:** *Controle corridas, recargas, combustível, revisões, rateio entre motoristas e finanças pessoais em um só ERP offline-first. Comece grátis hoje.*
