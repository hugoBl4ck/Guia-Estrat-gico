# Plano de Correções e Checklist da Auditoria

**Projeto:** GiroCerto ERP / ERP Driver Finance  
**Data de início:** 2026-08-27  
**Status geral:** `AUDITORIA CONCLUÍDA | CORREÇÕES NÃO INICIADAS`  
**Regra de execução:** nenhuma correção deve ser marcada como concluída sem validação executável registrada.

## Como usar este documento

Este arquivo é o registro vivo da auditoria e da execução das melhorias. Para cada item:

- `[ ]` não iniciado
- `[-]` em andamento
- `[x]` concluído e validado
- `[!]` bloqueado ou aguardando investigação

Ao iniciar uma correção, atualize o status para `[-]`, registre a data e descreva o escopo. Ao concluir, marque `[x]` somente após executar o teste, build, lint ou verificação de segurança correspondente.

## Estado atual da aplicação

- Frontend: React 18, TypeScript 5.2+, Vite 5 e Tailwind CSS.
- Persistência local: IndexedDB, com migração legada de LocalStorage.
- Nuvem: Supabase Auth, PostgreSQL e Storage.
- Estado: `useReducer` em `src/services/financeReducer.ts`, orquestrado principalmente por `src/App.tsx`.
- Sincronização: fila local no IndexedDB e snapshots completos enviados pelo `DataRepository`.
- Testes: Vitest.
- Verificação inicial: `npm test -- --run` passou com 6 arquivos e 22 testes.
- Backend próprio: não identificado no workspace; o acesso cloud é feito diretamente pelo cliente Supabase.

## Critérios gerais de conclusão

- [ ] Não há credenciais, tokens ou segredos expostos no relatório ou nos commits.
- [ ] Nenhuma alteração destrutiva foi executada sem autorização explícita.
- [ ] O build de produção passa.
- [ ] O lint passa sem warnings permitidos.
- [x] A suíte de testes passa: 9 arquivos e 33 testes em 2026-08-27.
- [x] Os fluxos alterados possuem testes específicos para ownership no repository.
- [x] As policies RLS reais foram verificadas no Supabase após a migration v8.
- [x] O ownership usado pelo cliente foi alinhado ao `user_id`; colunas legadas `user_email` permanecem para compatibilidade.
- [-] A sincronização offline/online foi validada em cenários de sucesso, falha, retry e ownership por testes; validação funcional em dois usuários ainda pendente.
- [x] O resultado final foi revisado quanto a regressões de dados financeiros; testes e build passam.

# Fase 1 — Emergencial

## P0-01 — Remover senha padrão e reforçar autenticação

**Status:** `[-]` implementação concluída; validação ampliada pendente  
**Prioridade:** P0 / Alta  
**Evidência:** `src/components/AuthModal.tsx`, nos fluxos `signUp` e `signInWithPassword`, usa `password || '12345678'`.

**Risco:** uma senha previsível pode permitir criação ou tentativa de acesso a contas com credencial fraca.

### Checklist

- [x] Tornar a senha obrigatória no formulário.
- [x] Remover o fallback `'12345678'` do cadastro.
- [x] Remover o fallback `'12345678'` do login.
- [x] Definir e validar política mínima de senha para novos cadastros.
- [x] Verificar mensagens de erro sem expor detalhes desnecessários.
- [x] Criar testes unitários da validação de autenticação.
- [ ] Executar validação automatizada do componente contra um cliente Supabase simulado.

**Validação prevista:** testes do componente/serviço de autenticação e build.

## P0-02 — Confirmar e reforçar isolamento multiusuário

**Status:** `[-]` migration aplicada; teste comportamental com segundo usuário pendente  
**Prioridade:** P0 / Crítica  
**Evidência:** `src/services/repository.ts` usa `user_email` fornecido pelo cliente em `upsert` e filtros. O teste `src/services/supabaseSecurity.test.ts` simula filtro em memória, mas não prova as policies reais do banco.

**Risco:** se as policies RLS não validarem o usuário autenticado com `auth.uid()`, um cliente pode tentar consultar ou gravar dados de outro usuário alterando o identificador enviado.

### Checklist

- [x] Inspecionar as policies RLS reais das tabelas usadas pela aplicação.
- [x] Confirmar como o usuário autenticado é relacionado às linhas cloud.
- [x] Confirmar que `INSERT`, `SELECT`, `UPDATE` e `DELETE` são protegidos.
- [x] Confirmar isolamento do Storage para recibos.
- [x] Impedir restauração da identidade local quando o Supabase está configurado sem sessão válida.
- [x] Encerrar a sessão Supabase no logout.
- [x] Substituir autorização baseada em `user_email` por identidade autenticada no banco e no repository.
- [ ] Adicionar testes de integração contra um ambiente Supabase seguro ou uma estratégia equivalente.
- [ ] Testar tentativa de leitura e alteração cruzada entre dois usuários.
- [ ] Registrar evidência da validação sem expor tokens ou dados pessoais.

**Bloqueio atual:** o projeto possui apenas um usuário Auth; não foi criado um segundo usuário automaticamente para não alterar o cadastro sem autorização específica.

## P0-03 — Proteger comprovantes fiscais

**Status:** `[-]` correção implementada; validação offline/online real pendente  
**Prioridade:** P0/P1  
**Evidência:** `src/services/supabaseClient.ts` usa `getPublicUrl` para arquivos no bucket `receipts`.

**Risco:** recibos podem ficar publicamente acessíveis caso o bucket esteja público ou a configuração seja alterada de forma insegura.

### Checklist

- [x] Confirmar se o bucket `receipts` é privado.
- [x] Confirmar as policies de `storage.objects`.
- [ ] Validar tipo, tamanho e extensão dos arquivos antes do upload.
- [ ] Usar URL assinada com expiração para leitura.
- [ ] Confirmar que o caminho do arquivo está vinculado ao usuário autenticado.
- [ ] Testar upload e leitura com usuário autorizado e não autorizado.

# Fase 2 — Estabilização

## P1-01 — Controlar a frequência da sincronização

**Status:** `[ ]` não iniciado  
**Prioridade:** P1  
**Evidência:** alterações de estado em `src/App.tsx` chamam `repository.saveData`; `saveData` enfileira e dispara `flushSyncQueue` em background.

**Impacto:** muitas alterações podem gerar excesso de writes e chamadas concorrentes ao Supabase. A auditoria também identificou que jobs `failed` não voltam para `pending`, erros de persistência local são absorvidos e flushes concorrentes podem sobrescrever a fila.

### Checklist

- [ ] Medir a frequência atual de gravações e sincronizações.
- [ ] Implementar debounce ou janela de sincronização.
- [x] Manter somente o snapshot mais recente por usuário quando possível.
- [x] Evitar flush concorrente para o mesmo usuário.
- [ ] Definir limite e política de retenção da fila.
- [ ] Validar comportamento offline, reconexão e falha parcial.
- [x] Adicionar testes unitários para deduplicação, backoff e elegibilidade de retry.

### Achados da auditoria

- [x] `flushSyncQueue()` agora reprocessa jobs `failed` quando o backoff expira.
- [x] `indexedDBService.setItem()`/`deleteItem()` propagam erros; `saveData()` não enfileira sync quando a persistência local falha.
- [x] `queueSyncState()` e `flushSyncQueue()` agora usam lock serializado para evitar perda por concorrência.
- Cada snapshot contém o estado completo e pode ser substituído por uma alteração posterior antes de o primeiro flush terminar; isso exige coalescing e controle de versão.
- A validação atual cobre funções de domínio, mas não cobre falha de IndexedDB, concorrência, retry ou reconexão real.

## P1-02 — Estabilizar contrato do banco

**Status:** `[ ]` não iniciado  
**Prioridade:** P1  
**Evidência:** `src/services/repository.ts` contém fallbacks para colunas alternativas como `notes`, `vehicle_id` e `veiculo_id`.

**Impacto:** o cliente aceita múltiplos schemas e pode mascarar divergências ou descartar dados.

### Checklist

- [ ] Comparar `DATABASE_SCHEMA.sql` com as tabelas efetivamente usadas (`ganhos`, `despesas`, `turnos`, `caixas_buckets`, `faturamentos`).
- [ ] Definir um contrato canônico por entidade.
- [ ] Criar migrations versionadas, caso sejam necessárias.
- [ ] Remover fallbacks somente após confirmar compatibilidade do ambiente.
- [ ] Adicionar testes de mapeamento de payloads.
- [ ] Documentar mudanças incompatíveis.

## P1-03 — Remover metadados de motorista/veículo da coluna `turnos.notes`

**Status:** `[ ]` não iniciado  
**Prioridade:** P1  
**Evidência:** `src/services/repository.ts` grava `drivers` e `vehicles` serializados em JSON no turno `shift-system-metadata`.

**Impacto:** dados de naturezas diferentes ficam acoplados a uma tabela de turnos e dependem de parsing manual.

### Checklist

- [ ] Identificar todos os consumidores desses metadados.
- [ ] Definir tabela ou estrutura JSONB própria.
- [ ] Definir chave de usuário e policies RLS.
- [ ] Planejar migração sem perda de mapeamentos existentes.
- [ ] Testar leitura, gravação e migração.
- [ ] Remover o workaround somente após validação.

## P1-04 — Melhorar observabilidade da sincronização

**Status:** `[ ]` não iniciado  
**Prioridade:** P1  
**Evidência:** erros são registrados principalmente via `console.warn`/`console.error` e estado local.

### Checklist

- [ ] Definir eventos mínimos de sincronização.
- [ ] Registrar duração, tentativa, resultado e tipo de erro sem dados sensíveis.
- [ ] Adicionar correlation/request ID quando suportado.
- [ ] Diferenciar falha transitória de falha permanente.
- [ ] Criar indicador operacional para fila bloqueada.
- [ ] Definir alertas ou procedimento de diagnóstico em produção.

# Fase 3 — Qualidade e regras de negócio

## P2-01 — Reduzir responsabilidades de `App.tsx`

**Status:** `[ ]` não iniciado  
**Prioridade:** P2  
**Evidência:** `src/App.tsx` concentra hidratação, autenticação, sincronização, persistência, frota, motoristas e navegação.

### Checklist

- [ ] Separar hidratação/persistência local.
- [ ] Separar estado e eventos de autenticação.
- [ ] Separar orquestração da fila de sincronização.
- [ ] Manter APIs públicas dos componentes durante a extração.
- [ ] Adicionar testes a cada módulo extraído.
- [ ] Validar build e fluxo principal após cada extração.

## P2-02 — Centralizar regras de caixas virtuais

**Status:** `[ ]` não iniciado  
**Prioridade:** P2  
**Evidência:** o mapeamento categoria → caixa está duplicado em `financeReducer.ts` para inclusão e exclusão; `App.tsx` também recalcula saldos.

### Checklist

- [ ] Definir uma única função de classificação de despesas.
- [ ] Definir uma fonte única para cálculo de saldos.
- [ ] Testar inclusão, edição, exclusão e undo.
- [ ] Testar valores zero, negativos inválidos e categorias desconhecidas.
- [ ] Validar que os relatórios permanecem consistentes.

## P2-03 — Versionar o armazenamento local

**Status:** `[ ]` não iniciado  
**Prioridade:** P2  
**Evidência:** `src/services/db.ts` faz migrações por chaves e heurísticas, enquanto `src/services/indexedDB.ts` mantém `DATABASE_VERSION = 1`.

### Checklist

- [ ] Inventariar as versões de dados existentes.
- [ ] Criar estratégia formal de migração por versão.
- [ ] Tornar migrações idempotentes.
- [ ] Preservar dados financeiros durante atualização.
- [ ] Testar banco vazio, banco legado e banco parcialmente corrompido.
- [ ] Documentar procedimento de recuperação.

## P2-04 — Cobrir fluxos críticos com testes reais

**Status:** `[-]` base existente, cobertura crítica pendente  
**Prioridade:** P2  

### Checklist

- [x] Executar suíte existente: 6 arquivos e 22 testes aprovados em 2026-08-27.
- [ ] Testar cadastro e login.
- [ ] Testar fila offline/online.
- [ ] Testar retry após erro do Supabase.
- [ ] Testar isolamento real por usuário.
- [ ] Testar upload privado de comprovantes.
- [ ] Testar cálculos financeiros e transições de estado.
- [ ] Testar exportação de relatórios.
- [ ] Definir cobertura mínima por área crítica.

# Fase 4 — Escalabilidade

## P3-01 — Evitar carregamento completo de dados

**Status:** `[ ]` não iniciado  
**Prioridade:** P2/P3  
**Evidência:** `fetchFromCloud` usa `select('*')` e carrega listas inteiras de ganhos e despesas.

### Checklist

- [ ] Definir paginação por cursor ou data.
- [ ] Definir filtros mínimos por veículo, período e status.
- [ ] Selecionar apenas colunas necessárias.
- [ ] Adicionar índices conforme consultas reais.
- [ ] Testar com volume representativo.

## P3-02 — Preparar fila para crescimento

**Status:** `[ ]` não iniciado  
**Prioridade:** P3  

### Checklist

- [ ] Definir limite de tamanho da fila.
- [ ] Compactar snapshots substituíveis.
- [ ] Definir backoff e máximo de tentativas.
- [ ] Evitar múltiplos flushes simultâneos.
- [ ] Criar métricas de backlog e idade do item mais antigo.

# Registro de execução

| Data | Item | Status | Validação | Observações |
|---|---|---|---|---|
| 2026-08-27 | Auditoria inicial | `[x]` | `npm test -- --run`: 22/22 testes | Nenhum arquivo alterado durante a auditoria. |
| 2026-08-27 | Plano de correções criado | `[x]` | Arquivo presente em `docs/` | Correções ainda não iniciadas. |
| 2026-08-27 | P0-01 autenticação local | `[-]` | `authValidation.test.ts`: 4/4; suíte: 26/26 | Fallback removido; falta teste de integração do componente. |
| 2026-08-27 | P0-02 sessão local | `[-]` | Validação pendente no Supabase real | Logout agora chama `signOut`; identidade local sem sessão não é restaurada; RLS ainda não está versionado. |
| 2026-08-27 | Verificação estática de auth | `[x]` | Nenhum fallback de senha encontrado; somente `auth.signOut` entre métodos de encerramento | Recuperação, alteração e refresh explícitos não existem atualmente. |
| 2026-08-27 | Build de produção | `[x]` | `npm run build` passou | Vite emitiu apenas aviso de chunk maior que 500 kB. |
| 2026-08-27 | Lint | `[!]` | `npm run lint` não executou | ESLint não está instalado/declarado no projeto; não foi instalado conforme solicitado. |
| 2026-08-27 | v6 ownership expand | `[x]` | SQL Editor: sucesso; 7 FKs criadas | Colunas `user_id` adicionadas sem alterar policies. |
| 2026-08-27 | v7 ownership backfill | `[x]` | SQL Editor: sucesso; 7 colunas `NOT NULL`, 7 FKs validadas | 1 usuário Auth e 2 veículos associados deterministicamente. |
| 2026-08-27 | v8 policies e grants | `[x]` | SQL Editor: sucesso; 28 policies `auth.uid()`, grants anon revogados | Policies separadas por operação. |
| 2026-08-27 | v9 receipts Storage | `[x]` | Bucket privado + 4 policies verificadas | Caminho protegido por `storage.foldername(name)[1] = auth.uid()`. |

# Comandos de validação

```bash
npm test -- --run
npm run build
npm run lint
```

Executar os comandos após cada alteração relevante e registrar o resultado no quadro acima.

# Decisões e bloqueios

- As policies RLS reais não estão versionadas no workspace; a validação definitiva de isolamento depende do projeto Supabase.
- O schema SQL local parece representar uma modelagem diferente das tabelas legadas usadas diretamente pelo repositório. Essa divergência deve ser resolvida antes de migrations.
- Migrations v6-v9 foram criadas no repositório e aplicadas manualmente pelo SQL Editor autenticado; o histórico formal do Supabase continua inexistente.
- O teste comportamental com dois usuários não foi executado porque existe somente um usuário Auth no projeto.
- Validação final em 2026-08-27: `npm test -- --run` passou com 7 arquivos e 26 testes; `npm run build` passou.
- O repository não mantém mais consultas cloud por `user_email`; esse campo permanece somente como compatibilidade de dados legados.
- Auditoria de sync realizada em 2026-08-27: identificados retry incompleto, erros locais absorvidos, risco de corrida na fila e snapshots completos concorrentes.
- Correção de sync aplicada em 2026-08-27: lock de fila, backoff exponencial, retry de jobs falhos, deduplicação do snapshot por usuário e propagação de erros IndexedDB.
- Validação da correção: `npm test -- --run` passou com 8 arquivos e 28 testes; `npm run build` passou.
- Auditoria de isolamento local concluída em 2026-08-27: dados financeiros e veículos passaram a usar namespace por `user_id`; logout reseta o estado React; jobs novos carregam ownership por usuário.
- Testes de isolamento local: `localOwnership.test.ts` e `syncQueue.test.ts` cobrem namespaces, migração legada condicionada ao email e exclusão de jobs A no contexto B.
- Validação final da etapa: `npm test -- --run` passou com 9 arquivos e 31 testes; `npm run build` passou.
- Pendente: teste comportamental real com dois usuários autenticados; o projeto ainda possui somente um usuário Auth.
- Preview atualizado com isolamento local publicado em 2026-08-27: https://erp-motorista-7b43lzjmf-hugos-projects-e1e9e083.vercel.app
- Validação do Preview atualizado: deployment `Ready`, HTTP `200`; a interface exige autenticação da Vercel por proteção de Preview.
- Auditoria adversarial final: chaves financeiras/veículos globais não são carregadas no contexto autenticado sem namespace; jobs sem `userId` não são processados com contexto autenticado; App passa `userId` no flush manual e automático.
- Correção residual aplicada: jobs com o mesmo email e UUIDs diferentes não são substituídos; jobs legacy sem ownership inequívoco ficam inelegíveis quando há `userId` autenticado.
- Validação final atualizada: `npm test -- --run` passou com 9 arquivos e 33 testes; `npm run build` passou.
- Riscos residuais: estruturas auxiliares de motoristas/mapas usam namespace por email; `syncErrorState` é global, mas armazena somente diagnóstico; API de fila sem `userId` continua compatível para chamadas legadas externas.
- Preview beta publicado em 2026-08-27: https://erp-motorista-9zcaxpy98-hugos-projects-e1e9e083.vercel.app
- Status da publicação beta: `Ready`, `target=preview`, resposta HTTP `200`; a proteção de Preview da Vercel solicita login no navegador.
- Sync cross-environment validado em 2026-08-27: dados registrados na versão original apareceram na beta após a sincronização manual; teste de isolamento A/B ainda pendente.
- Confirmação de cadastro: `emailRedirectTo` agora usa a origem atual da aplicação; a URL da beta precisa estar autorizada em Supabase Auth e as variáveis Supabase precisam estar configuradas no ambiente `Preview` da Vercel antes de um novo deploy beta.
- Redeploy beta validado em 2026-08-27: https://erp-motorista-573s0or2s-hugos-projects-e1e9e083.vercel.app está `Ready`, responde HTTP `200` e o endpoint Auth do Supabase respondeu `200` com as variáveis Preview atuais.
- Produção atualizada em 2026-08-27: deployment `Ready` em https://erp-motorista-opfxo2ixd-hugos-projects-e1e9e083.vercel.app, alias oficial https://app-girocerto.vercel.app, smoke tests HTTP `200`.
- O deployment anterior de produção permanece disponível no histórico da Vercel para rollback; nenhuma migration adicional foi executada neste deploy.
- Pendência externa de email: limite de envio do SMTP padrão do Supabase excedido; investigação/configuração de SMTP próprio será retomada posteriormente.
- Próxima etapa selecionada: auditoria da sincronização offline/online e da fila de sincronização.
