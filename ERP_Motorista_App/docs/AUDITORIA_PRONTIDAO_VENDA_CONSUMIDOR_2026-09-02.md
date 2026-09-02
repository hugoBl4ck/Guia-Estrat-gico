# Auditoria de Prontidao para Venda ao Consumidor

**Projeto:** GiroCerto ERP / ERP Driver Finance  
**Data:** 2026-09-02  
**Escopo:** prontidao tecnica, seguranca, privacidade, operacao e monetizacao para venda B2C.

## Veredito executivo

**Status: NAO APTO para venda ampla neste momento.**

O aplicativo esta apto para uma beta controlada gratuita, desde que os usuarios sejam informados de que se trata de uma versao de testes. O build passa e o deployment oficial responde, mas ainda existem bloqueios de produto, seguranca operacional, privacidade e monetizacao que precisam ser resolvidos antes de cobrar consumidores.

## Evidencias verificadas

- `npm test -- --run`: 11 arquivos e 38 testes aprovados.
- `npm run build`: concluido com sucesso.
- `https://app-girocerto.vercel.app`: deployment respondeu com HTML HTTP 200 via Vercel CLI.
- `npm run lint`: nao executou porque `eslint` nao esta instalado/declarado no `package.json`.
- O working tree possui alteracoes locais nao commitadas em autenticacao, persistencia, sincronizacao e seguranca. O processo de release precisa incluir revisao e commit controlado antes de novas publicacoes.

## Bloqueios P0

### P0-01 — Nao existe cobranca nem controle de acesso pago

**Evidencia:** nao foram encontrados Stripe, Mercado Pago, checkout, webhook, assinatura, entitlement ou tabela de planos no frontend, scripts ou schema. A landing page apresenta o acesso como `R$ 0,00` e "periodo de testes".

**Impacto:** nao ha como vender, confirmar pagamento, liberar o plano Pro, suspender inadimplentes ou reconciliar transacoes.

**Aceite para resolver:** escolher um provedor de pagamento no Brasil; criar checkout hospedado; implementar webhook autenticado/idempotente em backend ou Edge Function; persistir status da assinatura; aplicar limites no servidor; criar fluxo de cancelamento e reembolso; testar pagamentos aprovados, recusados, duplicados e estornados.

### P0-02 — Privacidade, termos e direitos do titular ausentes

**Evidencia:** nao foram localizados no app politica de privacidade, termos de uso, consentimento, contato do controlador, canal LGPD, exclusao de conta ou exportacao de dados do titular.

**Impacto:** bloqueio de conformidade e risco elevado ao tratar email, dados financeiros, veiculos, motoristas, comprovantes e possiveis dados fiscais.

**Aceite para resolver:** publicar Politica de Privacidade e Termos de Uso em portugues; informar finalidade, base legal, retenção, subprocessadores e contato; solicitar consentimento quando aplicavel; implementar exportacao, correcao e exclusao de conta/dados; registrar versao/data do aceite.

### P0-03 — Comprovantes privados nao possuem leitura privada correta

**Evidencia:** `src/services/supabaseClient.ts` grava no bucket privado `receipts`, mas retorna URL obtida por `getPublicUrl`. O bucket e privado segundo `data/supabase_migration_v9_receipts_storage.sql`.

**Impacto:** o fluxo de leitura pode falhar para o proprio usuario ou induzir a uma futura abertura publica do bucket. O upload tambem nao valida tamanho, MIME real e extensao permitida.

**Aceite para resolver:** usar `createSignedUrl` com expiracao curta; validar tipo, extensao, tamanho e nome; limitar formatos; confirmar que o caminho inicia pelo `auth.uid()`; testar leitura autorizada e negada; evitar guardar URLs permanentes de arquivos sensiveis.

### P0-04 — RLS depende de validacao externa e schema canonico nao esta consolidado

**Evidencia:** `data/supabase_migration_v8_uid_policies.sql` aplica policies por `auth.uid()` nas tabelas legadas, enquanto `DATABASE_SCHEMA.sql` descreve outro modelo (`drivers`, `vehicles`, `earnings`, `expenses`) com `password_hash`. O proprio checklist registra que as policies reais e o teste A/B com dois usuarios ainda nao foram concluídos.

**Impacto:** risco de erro de deploy/migration, isolamento incompleto ou manutencao de tabelas com contratos divergentes.

**Aceite para resolver:** escolher um schema oficial; versionar migrations; remover ou marcar o schema legado; executar teste real com dois usuarios; confirmar SELECT/INSERT/UPDATE/DELETE e Storage; registrar evidencias sem tokens ou dados pessoais.

**Status em 2026-09-02: parcialmente resolvido.**

- `DATABASE_SCHEMA.sql` (raiz e `database/`) e `data/schema.sql` foram marcados com aviso explicito de legado, apontando para a cadeia real `data/supabase_migration_v3.sql` ate `v10`.
- Confirmado por auditoria: a tabela `veiculos` ja existia com RLS por `auth.uid()` (v3/v6/v7/v8), mas o frontend nunca gravava nela — a frota so existia no IndexedDB local, sem backup em nuvem nem restauracao entre dispositivos.
- Corrigido: `src/services/vehicleCloudSync.ts` (com testes) mapeia `Vehicle` <-> linha da tabela `veiculos`; `repository.saveVehicles` agora faz upsert real na nuvem e `repository.fetchVehiclesFromCloud` busca a frota por `user_id`; `App.tsx` mescla frota local e da nuvem no boot e no login, sem sobrescrever veiculos criados offline e sem regredir o odometro (reaproveita `vehicleOdometer.ts`).
- Nova migration aditiva `data/supabase_migration_v10_veiculos_full_sync.sql` adiciona as colunas que faltavam em `veiculos` (usage_mode, weekly_rental_income, tenant_name/phone, financing/insurance due day, precos etanol/gasolina, maintenance_schedule) e reafirma as 4 policies por `auth.uid()` de forma idempotente. Nenhuma tabela ou coluna foi removida.
- **Migration v10 aplicada e verificada em producao em 2026-09-02** com evidencia real (nao suposta): consulta pos-migracao nas duas linhas reais confirmou `modelo=model`, `ano=year`, `placa=license_plate`, `is_eletrico=is_electric` copiados sem alteracao, `vehicle_type` derivado corretamente (`COMBUSTION` para o Ford Ka, `ELECTRIC` para o BYD) e `current_odometer_km=0.0` como esperado para uma coluna nova sem equivalente legado. Nenhuma linha ou coluna antiga foi alterada ou removida.
- Pendente: validar o fluxo de upsert em uso real (salvar edicao na aba Financiamentos e recarregar) e executar o teste real com dois usuarios autenticados (ainda bloqueado por so existir 1 usuario Auth no projeto).

## Bloqueios P1

### P1-01 — Segredo operacional no ambiente local e historico de release precisa ser auditado

`.env` esta ignorado e nao aparece como arquivo rastreado pelo Git, o que e correto. Ainda assim, credenciais e tokens ja foram manuseados durante o desenvolvimento. Antes da venda, revisar o historico e rotacionar qualquer chave ou sessao que tenha sido exposta fora do ambiente seguro. A chave `anon` do Supabase e publica por natureza, mas nunca deve ser confundida com `service_role`.

### P1-02 — Sessao do Supabase no navegador exige endurecimento e politica de risco

O cliente Supabase e inicializado no frontend e o fluxo de autenticacao usa a sessao padrao do SDK. Isso e comum em SPA, mas deixa a protecao dependente de CSP, ausencia de XSS e policies corretas. O token de confirmacao chega no fragmento da URL e agora e removido apos `setSession`, o que reduz exposição, mas o fluxo ainda precisa ser testado em navegador real em producao.

### P1-03 — Validacao de qualidade nao esta reproduzivel

`npm run lint` falha porque `eslint` nao esta declarado nas dependencias/scripts instalados. O build emite alerta de chunk JavaScript acima de 500 kB.

**Aceite para resolver:** adicionar e fixar ESLint/configuração compatível ou remover o script; executar lint em CI; avaliar code splitting para reduzir carregamento inicial em celulares.

### P1-04 — Dados demonstrativos e alegacoes de marketing precisam sair do produto comercial

A aplicação contém valores default/mock de veículos, despesas e ganhos. A landing page também usa alegações como "nº 1" e dados estruturados com `aggregateRating` de 4.9 e 128 avaliações sem evidência apresentada.

**Impacto:** risco de confundir o consumidor, contaminar seus dados e criar alegações publicitárias não comprovadas.

**Aceite para resolver:** onboarding vazio para conta nova; dados demo apenas em ambiente de demonstração explícito; remover avaliações/posição não comprovadas; revisar textos, imagens e promessas financeiras com base verificável.

### P1-05 — Backup e recuperação do consumidor não estão operacionais como produto

Existe sincronização e scripts de backup, porém não há política de retenção, restauração testada, monitoramento, RPO/RTO ou comunicação de incidentes.

**Aceite para resolver:** backup automatizado e criptografado; restauração periódica em ambiente separado; retenção definida; alertas de falha; procedimento de incidente e suporte.

## P2 — Melhorias importantes

- Criar canal visível de suporte e procedimento para falhas de sincronização.
- Testar offline, reconexão, dois dispositivos, concorrência e troca de veículo com dados reais.
- Validar acessibilidade, textos de erro, teclado, leitores de tela e telas pequenas.
- Adicionar observabilidade sem registrar emails, tokens, comprovantes ou dados financeiros em logs.
- Definir limites de uso e custos do Supabase/Vercel antes de escalar.
- Revisar o modelo de dados para não guardar mapas auxiliares de motorista/veículo serializados em `turnos.notes`.
- Adicionar política para exclusão de dados locais no logout e em dispositivo compartilhado.
- Confirmar domínio próprio, email transacional confiável e monitoramento de entrega de emails.

## Plano mínimo para lançamento pago

1. Fechar schema e RLS com teste A/B real.
2. Corrigir Storage com signed URLs e validação de arquivos.
3. Publicar Termos, Privacidade, LGPD, suporte e exclusão de conta.
4. Implementar pagamento, webhook e entitlements server-side.
5. Remover mocks e alegações não comprovadas da experiência comercial.
6. Tornar lint/CI reproduzíveis e executar build, testes e auditoria de dependências.
7. Fazer beta fechada com métricas de ativação, retenção, falhas de sync e suporte.
8. Só então iniciar cobrança pública e acompanhar reembolso, chargeback e incidentes.

## Decisão recomendada

Manter o deployment atual como **beta gratuita controlada**. Não anunciar como produto pago nem processar dados sensíveis em escala até os quatro bloqueios P0 serem concluídos e validados com evidencias executaveis.
