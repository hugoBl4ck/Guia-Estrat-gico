# 🚀 Tutorial: Everything Claude Code (Antigravity Edition)

Este guia prático explica como integrar, compreender e utilizar o ecossistema do repositório **[everything-claude-code](https://github.com/affaan-m/everything-claude-code)** focado em aumentar a produtividade e a qualidade do assistente inteligente (Antigravity) no seu Windows local com _Power BI_, _Gestão Operacional_, _Teoria dos Jogos_ e demais projetos.

---

## 🏗️ 1. O que é o "Everything Claude Code"?

Ele é um sistema de **otimização de performance e harness para agentes de IA**. Em vez de você interagir com uma inteligência artificial generalista que solta respostas aleatórias, esse sistema injeta **personalidades** e **processos rígidos** em segundo plano.

O sistema divide a inteligência em três pilares principais instalados na pasta `.agents` no seu projeto:

1. **Regras (`rules`):** Diretrizes rígidas sobre estilo, fluxo de trabalho e arquitetura que eu (a IA) devo ler _antes_ de escrever qualquer código ou plano.
2. **Habilidades (`skills`):** Workflows testados em batalha pela comunidade. Existem habilidades para revisar código, desenhar APIs, planejar estudos e fazer resumos de documentos.
3. **Comandos / Fluxos de Trabalho (`workflows`):** Atalhos ("slash commands" como `/plan`, `/tdd`, `/learn-eval`) que acionam configurações rapidamente no terminal ou na janela de chat, padronizando a comunicação.

---

## 🛠️ 2. Como a Instalação foi Feita (Windows PowerShell)

O script original (`install.sh`) foi desenhado para Linux/Mac. Como estamos no Windows, eu realizei a instalação manualmente com recursos nativos (PowerShell), copiando apenas os arquivos compatíveis para o sistema **Antigravity**.

**Estrutura criada na raiz do projeto (`Guia Estratégico/.agents/`):**

- `/rules/` ➜ Diretórios de regras comuns e específicas de linguagens.
- `/skills/` ➜ Mais de 60 habilidades de escrita, segurança, deploy e codificação de IA.
- `/workflows/` ➜ Os "slash commands" que invocam as habilidades.

---

## 📝 3. Retificações e Modificações Especiais para seu Perfil

Como o repositório é massivo e genérico, eu ajustei certas partes vitais para que elas te sirvam com perfeição:

### A) A Habilidade `article-writing` (Redação de Artigos)

- O padrão original criava textos longos em formato "corporativo robótico e inglês".
- **A Retificação:** A matriz da _Skill_ foi reescrita para forçar sempre saídas em **Português do Brasil (PT-BR)**, em um tom _direto, analítico e de nível operacional_.
- Essa modificação incorpora seus focos orgânicos automaticamente (Power BI, Teoria dos Jogos e Investimentos), para que seus guias e resumos gerados passem uma sensação humana fiel a quem você é.

### B) A Habilidade `continuous-learning` (Estudo Contínuo / Instintos)

- O _Everything Claude Code_ tem a capacidade de ficar "escutando" e aprendendo seus padrões no fundo via ganchos de shell (`Hooks`), mas isso gera problemas em processos Windows.
- **A Retificação:** Ao invés de dependermos do script falho de espionagem ao fundo, optamos por um método de "Extração Consciente". Transformamos as automações nos _Comandos de Instinto_.
- **O ganho:** As pastas de seu projeto não ficarão sujas de lixo provisório. Você decide ativamente **quando** uma solução foi boa o suficiente para virar uma ferramenta permanente na nossa mente compartilhada.

---

## 🎮 4. Como Usar no Dia a Dia (Guia Prático)

Para testar ou criar novas etapas do seu projeto de Power BI, experimente usar as seguintes palavras-chave ou "Comandos Flash" no nosso chat a qualquer momento:

### Planejamento e Arquitetura:

- Digite **`/plan [minha ideia aqui]`**: Eu não começarei a trabalhar; eu avaliarei os riscos, refarei os requisitos e criarei um plano de execução de tarefas prontas para você avaliar.
- Digite **`/tdd`**: Se precisou programar ou fazer rotinas automatizadas, te forço a desenhar testes e cenários operacionais complexos _antes_ do sistema existir.

### Geração de Conteúdo e Acessoria:

Para acionar o painel especial modificado com o seu perfil, faça um pedido referenciando explicitamente as habilidades de leitura ou escrita:

- _"Use a skill de **article-writing** e crie um artigo para o LinkedIn sobre métricas de Revloc na gestão de alugueis de carros."_
- _"Use a skill de **market-research** e avalie as vantagens de veículos novos contra repasses de leilão neste ano."_

### Armazenando Sabedoria Global (Instintos)

Sempre que chegarmos a uma conclusão genial que precisará ser reutilizada outras milhares de vezes, crie um **Instinto** para não ter que usar os mesmos "prompts" de explicação futuramente:

1. Ao terminar uma tarefa de sucesso, mande o comando: **`/learn-eval`**.
2. Eu extrairei um padrão reutilizável da sessão.
3. Se você for utilizar aquilo só neste projeto, nós manteremos na "camada do projeto" (`project`).
4. Se isso valer para qualquer outro projeto seu futuro e global, você dita o comando: **`/promote`**, elevando esse "instinto" à sabedoria vitalícia do sistema.

### Gerenciando e Vendo o Progresso:

- **`/instinct-status`**: Lista todos os instintos que aprendemos.
- **`/instinct-export`**: Puxa seus aprendizados para salvar em um pendrive ou enviar para um amigo.

---

## 🌟 5. O Ganho Final

Ao seguir estes passos ou pedir pela integração destas _skills_, você fará as respostas do seu assistente deixarem de ser meramente sugestivas e passarem a ser resoluções _nível sênior de engenharia_, documentadas de forma rigorosa, e com o bônus incrível da ferramenta se moldar à medida que você for melhorando na Gestão Operacional e estruturação técnica da IA.

---

## 🧩 6. Lista Oficial de Skills e Agentes Instalados

Abaixo está o inventário de todas as personalidades (Agentes) e processos pré-configurados (Skills) contidos no nosso diretório `.agents/skills/`.

**🤖 Agentes (Personalidades e Papéis Específicos)**

- `architect.md` (Arquiteto de Sistemas)
- `build-error-resolver.md` (Resolutor de Erros de Build)
- `chief-of-staff.md` (Operador/Chefe de Gabinete de IA)
- `code-reviewer.md` (Revisor de Código)
- `database-reviewer.md` (Auditor de Banco de Dados)
- `doc-updater.md` (Atualizador Automático de Documentação)
- `e2e-runner.md` (Especialista em Testes Fim-a-Fim)
- `go-build-resolver.md` & `go-reviewer.md` (Especialistas em GO)
- `harness-optimizer.md` (Otimizador de Chamadas LLM)
- `loop-operator.md` (Operador de Automações)
- `planner.md` (Planejador de Tarefas e Requisitos)
- `python-reviewer.md` (Revisor de Python)
- `refactor-cleaner.md` (Limpador e Refatorador de Código)
- `security-reviewer.md` (Auditor de Segurança Digital)
- `tdd-guide.md` (Especialista em Desenvolvimento Direcionado a Testes)

**🛠️ Skills (Habilidades Práticas de Escrita e Desenvolvimento)**

- **Produtividade e Negócios:** `article-writing` (Redação de Artigos em PT-BR), `content-engine`, `market-research` (Pesquisa de Mercado), `investor-materials`, `investor-outreach`, `frontend-slides` (Montagem de Apresentações).
- **Inteligência e Sistema:** `continuous-learning`, `continuous-learning-v2`, `cost-aware-llm-pipeline`, `agentic-engineering`, `strategic-compact`, `autonomous-loops`, `ai-first-engineering`.
- **Arquitetura Geral:** `api-design`, `backend-patterns`, `frontend-patterns`, `deployment-patterns`, `docker-patterns`, `database-migrations`, `verification-loop`, `search-first`, `tdd-workflow`.
- **Ecossistema Python/Django:** `python-patterns`, `python-testing`, `django-patterns`, `django-security`, `django-tdd`, `django-verification`.
- _(O ecossistema também engloba dezenas de skills isoladas para Java/Spring, Swift, Golang, C++ e integrações analíticas pesadas com Clickhouse ou Postgres)._

---

> ⚠️ **Lembrete:** Todo esse ecossistema agora reside silenciosamente na sua pasta oculta `[Raiz]/.agents/` do seu projeto "Guia Estratégico". Enquanto a pasta ali estiver, nossas inteligências permanecerão hiper-ativadas sob estes protocolos.
