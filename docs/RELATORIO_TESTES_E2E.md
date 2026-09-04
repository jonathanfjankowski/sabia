# Sabiá — Relatório de Testes E2E

> **Data da execução:** 04/09/2026 · **Ambiente:** desenvolvimento Docker local
> **Escopo:** suíte automatizada de backend, testes/build do frontend e teste E2E exploratório black-box via navegador (GUI real, sem mocks)

---

## 1. Resumo executivo

| Bateria | Resultado |
|---|---|
| Backend (PHPUnit, dentro do container) | ✅ **40 testes / 98 asserções — 100% pass** |
| Frontend unitário (Vitest) | ✅ **4/4 pass** |
| Frontend typecheck (`tsc --noEmit`) | ✅ limpo |
| Frontend build de produção | ✅ OK (avisos de chunk >500 kB) |
| Lint (oxlint) | ⚠️ 0 erros, ~69 warnings (deps de `useEffect`) |
| E2E black-box via GUI | ⚠️ **12 testes passaram, 2 bloqueados, 5 bugs confirmados** |

**Veredicto:** o núcleo do sistema está sólido (autenticação, RBAC, KB, RAG/embeddings, streaming SSE, timeout, bloqueio de prompt injection, RLS validada pelos testes automatizados), porém o E2E encontrou **5 bugs** — sendo 3 que quebram funcionalidades inteiras (criação de usuário, sugestões de artigo, transferência para humano) e 1 que impede o embed público do widget.

---

## 2. Ambiente e preparação

- Containers ativos (docker-compose.dev.yml): `sabia_postgres_dev` (pgvector:pg16), `sabia_api_dev` (:8000), `sabia_web_dev` (:5173), `sabia_embedding_dev` (:8001) — todos saudáveis.
- Frontend apontando para a **API real** (`.env`: `VITE_API_URL=http://localhost:8000`, `VITE_MSW_ENABLED=false`).
- **Preparações de ambiente realizadas** (registradas para distinguir setup de teste):
  1. O navegador usado já tinha sessão de gestor persistida — deslogado via GUI antes do início formal.
  2. Criação do usuário `operador.e2e@sabia.com` via `tinker` (porque a criação pela UI está quebrada — Bug #2) para viabilizar os testes de RBAC.
  3. Inserção SQL de uma conversa de widget (`session_id=e2e-test-session-123`) para testar o endpoint de transferência (Bug #5 impediu o fluxo completo).
- Dados de teste criados durante a execução: artigo **“Teste E2E Automatizado”** (publicado, Fiscal/Público), sugestão **não criada** (bloqueada pelo Bug #3), avaliação de conversa (4 estrelas via API / 2 estrelas via GUI), conversa de widget de teste.
- O **provedor de IA do ambiente** (`host.docker.internal:20128`, modelo `sabia`) aceita conexão mas **não retorna conteúdo** (demora minutos e responde vazio). Isso é uma falha do serviço de IA local, não do Sabiá — e limitou a validação de respostas de texto completo da IA.

Evidências visuais salvas em `gui-test-screenshots/` na raiz do repositório.

---

## 3. Testes automatizados

### 3.1 Backend — `php artisan test` (container `sabia_api_dev`)

```
Tests:  40 passed (98 assertions)
Duration: 34.93s
```

Suítes: Auth, Audit, EmbeddingService (6), Example, PromptInjection (9), RLS (6), Rag (3), SSE (3) — todas passando.

> **Nota de execução:** rodar os testes **dentro do container**. Na máquina host a suíte falha por conexão (`SQLSTATE[08006]` — autenticação do `postgres` em `127.0.0.1:5432` usa credenciais diferentes das do compose), resultado: 32 failed / 8 passed.

### 3.2 Frontend

- Vitest: `src/stores/auth.test.ts` — 4/4 pass.
- `tsc --noEmit`: sem erros. `npm run build`: sucesso (chunks grandes: MarkdownRenderer 895 kB, TipTap 740 kB — considerar code splitting).
- oxlint: 0 erros / 69 warnings.
- **Playwright (`tests/e2e/`) está desatualizado**: usa o usuário `gestor@sabia.local` (não existe: o seed real cria `gestor@sabia.com` e o seed do MSW usa `gestor@bsoft.com.br`) e espera `data-testid="confidence-badge"`, atributo inexistente no componente. Os 8 testes não executam verde no estado atual.

---

## 4. Teste E2E black-box (GUI real)

Metodologia: interação somente por elementos visíveis (cliques, digitação, Enter), verificação por DOM + captura de tela em cada ponto; erros de console não coletáveis pelo harness — usadas manifestações visíveis de erro como evidência.

### 4.1 Resultados por ponto de teste

| # | Teste | Resultado | Evidência |
|---|---|---|---|
| T0 | KB renderiza com dados reais (categorias, artigos, tema) | ✅ PASS | `t0_kb_inicial.png` |
| T1a | Logout pelo menu do usuário → `/login` | ✅ PASS | — |
| T1b | Login com credenciais inválidas → toast “Credenciais inválidas.” | ✅ PASS | `t1b_login_invalido.png` |
| T1c | Login gestor (`gestor@sabia.com`) → `/kb` | ✅ PASS | — |
| T1d | Login operador criado → sidebar sem menu admin | ✅ PASS | — |
| T2a | Busca na KB (debounce, contadores, URL `?q=`) | ✅ PASS | `t2a_busca_frete.png` |
| T2b | Abrir artigo (breadcrumb, markdown, relacionados) | ✅ PASS | — |
| T2c | Feedback “útil” (Sim 0→1 + toast) | ✅ PASS | `t2c_feedback_util.png` |
| T3a | Chat: envio, indicador “Pensando…”, botão Parar | ✅ PASS (stream inicia; provedor de IA do ambiente não respondeu — §5.6) | `t3a_chat_mensagens_stop.png` |
| T3b | Timeout de 180 s com mensagem amigável + prompt de avaliação | ✅ PASS | `t3b_chat_timeout_180s.png` |
| T3c | Avaliação por estrelas fecha conversa | ⚠️ PASS na UI; **persistência falhou** (ver §5.1, sequência de fila) | `t3b` |
| T3d | Prompt injection no chat → bloqueio | ✅ PASS no backend (400 imediato, conversa não criada, warning em `system_logs`); ⚠️ UI exibe “HTTP 400” bruto (Bug #6, menor) | `t3d_injection_http400.png` |
| T4a | Criar + publicar artigo (editor, categoria, acesso) | ✅ PASS (toast “Artigo criado”, redireciona à KB, chunk com embedding 1024 confirmado no banco) | `t4a_artigo_publicado.png` |
| T4b | Arquivar/restaurar/excluir artigo via menu ⋮ | ⛔ Não executado (cliques em dropdown não acionáveis pelo harness nesta sessão) | — |
| T5a | Configurações IA: carregar, máscara de chave, sidecar verde, **Testar embedding** | ✅ PASS (“OK · 1024 dims · 2000ms”) | — |
| T5b | Aba RAG & Confiança (Top N, chunk, threshold) | ✅ PASS | — |
| T6 | Criar usuário operador pela UI | ❌ **FALHOU — Bug #2 (500)** | — |
| T7a | RBAC na UI (menu admin oculto para operador) | ✅ PASS | — |
| T7b | Operador acessa `/admin/articles` por URL → redirecionado | ✅ PASS | — |
| T8 | Fluxo completo de sugestão (operador → gestor publica) | ⛔ **BLOQUEADO — Bug #3** (INSERT negado no banco) | — |
| T9a | Widget: settings/brand públicos carregam (boas-vindas) | ✅ PASS | — |
| T9b | Rota `/widget` anônima | ❌ **FALHOU — Bug #4** (redireciona ao login) | — |
| T9c | Widget chat (envio + SSE) e “Falar com humano” na GUI | ⛔ Bloqueado no harness (sem captura de tela para mirar cliques; interação por teclado não submeteu) | — |
| T9d | `POST /widget/conversations/{id}/transfer` (API, posse por session) | ❌ **FALHOU — Bug #5** (500 Carbon); sessão alheia → 404 ✅ | — |
| T10 | Endpoints de insights (auditoria, saúde, logs, ratings) | ✅ PASS via API (dados da sessão presentes: logins, settings.ai.change, rating) | — |
| T11 | Página 404 com link de retorno | ✅ PASS | — |
| T12 | Alternância de tema claro/escuro | ⚠️ Inconclusivo (clique sintético não alternou; sem captura para confirmar) — **não tratado como bug** | — |

### 4.2 Observações de comportamento (não-bugs)

- **Fila do servidor em dev:** `artisan serve` tem **um único worker**. O primeiro stream de chat segurou o worker por **8min50s** (provedor de IA pendente) e toda requisição seguinte (close, injections) ficou na fila até ser liberada — comprovado pelos timestamps do access log (`/api/chat ~ 8min 50s`) e pelos warnings de injection processados em ~1 s assim que o worker liberou. Em produção (PHP-FPM multi-worker) o efeito é mitigado, mas streams continuam ocupando 1 worker cada.
- **StrictMode em dev** duplica requisições de efeitos (listagens batem 2×; visualização de artigo conta +2 views). Não afeta build de produção.
- **Fallback do AIProvider funcionou**: com o provedor respondendo vazio, o sistema salvou mensagem amigável “o provedor não retornou conteúdo…” com `confidence_level=low` — comportamento degradação graciosa correto.

---

## 5. Bugs encontrados

### Bug #1 (P1) — Criação de usuário retorna 500 (falta `name`)

- **Onde:** `Administração → Usuários → Novo usuário → Salvar`
- **Sintoma:** toast “Erro interno”; usuário não criado.
- **Log:** `SQLSTATE[23502]: Not null violation: 7 ERROR: null value in column "name" of relation "users"`.
- **Causa:** `sabia-api/app/Http/Controllers/Admin/UserController.php` — `User::create()` recebe só `email`/`password`; a coluna `users.name` é NOT NULL.
- **Correção sugerida:** incluir `'name' => $data['full_name']` no `User::create()`.
- **Agravante:** novos usuários recebem senha aleatória (`Str::random(20)`) e **não há fluxo de definição/redefinição de senha** — mesmo corrigido, o gestor não consegue entregar o acesso ao novo usuário sem intervenção manual no banco.

### Bug #2 (P1) — Feature “Sugestões de artigo” inoperante (GRANT/R ausentes)

- **Onde:** `POST /api/article-suggestions` (operador) e telas de revisão (gestor).
- **Sintoma:** toast de erro interno; nada gravado.
- **Log:** `SQLSTATE[42501]: permission denied for table article_suggestions`.
- **Causa:** a tabela foi criada **sem policies RLS e sem GRANTs** para `sabia_internal`/`sabia_bypass` — confirmado via `information_schema.role_table_grants` (só `postgres` tem privilégios) e `pg_policies` (0 linhas). Gestor também não lê (bypass sem grant).
- **Correção sugerida:** migration nova com GRANTs DML para `sabia_internal`/`sabia_bypass` + policies (operador insere/lê as próprias; gestor todas), espelhando o padrão das demais tabelas.

### Bug #3 (P1) — Transferência para humano retorna 500 (parse de horário)

- **Onde:** `POST /api/widget/conversations/{id}/transfer` (e transferência interna, que usa o mesmo service).
- **Sintoma:** HTTP 500 com `Carbon\Exceptions\InvalidFormatException` — “The separation symbol could not be found / Trailing data” em `SupportTransferService.php:36` (`createFromFormat` dos horários de atendimento de `widget_settings`).
- **Posse por sessão funciona:** `session_id` errado → **404** (comportamento correto).
- **Correção sugerida:** normalizar/parsear os horários tolerando formatos (`H:i`, `H:i:s`, null) ou trocar o cast/leitura em `isWithinHours()`; cobrir com teste de unidade usando os defaults do seed (`08:00`–`18:00`).

### Bug #4 (P1) — Rota `/widget` exige login (quebra o embed público)

- **Onde:** `sabia-frontend/src/routes/index.tsx` — `/widget` é filho do layout cujo elemento é `<Protected><AppShell/></Protected>`.
- **Sintoma:** visitante anônimo em `/widget` é redirecionado para `/login`; autenticado, o widget renderiza **dentro do AppShell** (sidebar/topbar), o que nunca ocorreria num iframe de embed.
- **Impacto:** o contrato do `sabia-widget.js` (iframe `${apiUrl}/widget?t=…`) exibiria a tela de login no site do cliente.
- **Correção sugerida:** mover a rota `/widget` para fora do grupo autenticado (rota raiz standalone, como `/login`).

### Bug #5 (P3, UX) — Bloqueio de prompt injection mostra “HTTP 400” bruto

- **Onde:** UI do chat interno (e provavelmente widget).
- **Sintoma:** o backend responde 400 com `{"message":"Mensagem bloqueada por segurança."}`, mas a bolha de erro exibe apenas “HTTP 400”.
- **Causa:** `useChat.ts` lança `Error(\`HTTP ${res.status}\`)` sem extrair `body.message` de respostas não-ok (o `ApiError` da `lib/api.ts` já faz isso — o hook não o usa).
- **Correção sugerida:** no hook, ler `await res.json()` e lançar erro com a mensagem do backend.

### Não-bug relevante (infra do ambiente) — Provedor de IA sem resposta

- `http://host.docker.internal:20128/v1` (modelo `sabia`): `GET /v1/models` responde, mas `chat/completions` fica pendente por minutos e encerra **sem conteúdo**. Consequência no E2E: streams de 8min50s, timeouts de 180 s e fila do worker único (ver §4.2). Os mecanismos de proteção do Sabiá (timeout configurável, botão Parar, fallback com mensagem amigável, circuit breaker do sidecar) funcionaram conforme desenhado.

---

## 6. Cobertura cruzada automatizada × GUI

| Área | Automatizado (PHPUnit) | GUI E2E |
|---|:---:|:---:|
| Login/logout, anti-enumeration | ✅ | ✅ |
| RBAC (rotas, sidebar) | ✅ (roles/policies) | ✅ |
| RLS (artigos/conversas/sessão widget) | ✅ (6 testes) | indireto |
| KB (busca, artigo, feedback) | — | ✅ |
| CRUD de artigos + versões + chunks | ✅ (RagTest) | ✅ (criar/publicar) |
| SSE chat/widget + test-prompt | ✅ (SseTest, com Http::fake) | ✅ estrutura; ⚠️ texto completo (provedor) |
| Prompt injection | ✅ (9 testes) | ✅ |
| Embeddings/sidecar | ✅ (6 testes, fake) | ✅ (test-embed real, 1024 dims) |
| Transferência humana | — | ❌ Bug #3 |
| Sugestões de artigo | — | ❌ Bug #2 |
| Criação de usuários | — | ❌ Bug #1 |
| Widget embed anônimo | — | ❌ Bug #4 |
| Auditoria/logs/ratings/health | — | ✅ via API |

---

## 7. Recomendações priorizadas

1. **Corrigir os 4 bugs P1** (§5) — cada um com correção pontual descrita; após corrigir, reexecutar os pontos bloqueados (T6, T8, T9b, T9d).
2. **Adicionar fluxo de senha** para novos usuários (definir senha na criação ou link de primeiro acesso).
3. **Rodar `php artisan chunks:reembed`** para os artigos antigos sem embedding (hoje só artigos novos têm cobertura RAG).
4. **Atualizar os testes Playwright** (usuário do seed `gestor@sabia.com`, adicionar `data-testid` ao `ConfidenceBadge`, ou mock de IA estável) e adicioná-los ao CI.
5. **Trocar o health do provedor de IA** no ambiente dev ou configurar um provedor de teste local (ex.: Ollama com modelo pequeno) para que o E2E valide respostas completas.
6. **Produção**: usar PHP-FPM com `pm.max_children` dimensionado para streams concorrentes e TLS no nginx (proxy reverso).
7. **Menores**: extrair mensagem amigável nos erros do chat (Bug #5); revisar warnings de lint; remover `Login.tsx` órfão na raiz do repositório (arquivo de outro projeto, ZyonERP); consolidar `docs/embedding-sidecar.md` (desatualizado) em `docs/EMBEDDING_SIDECAR.md`; criar Dockerfile do widget ou remover o job `docker-build` do CI que o referencia.

---

## 8. Conclusão

Com 40 testes de backend verdes e uma bateria GUI abrangente, o Sabiá comprova seus pilares: **segurança (RLS, injection, headers), RAG com sidecar (embeddings 1024 dims validados ponta a ponta), streaming SSE com timeout e degradação graciosa**. Os 5 bugs identificados concentram-se em funcionalidades administrativas/periféricas (usuários, sugestões, transferência, rota do widget) e têm correções pontuais descritas — nenhuma afeta a arquitetura. Após as correções P1 e um provedor de IA funcional no ambiente, o sistema atende os fluxos documentados no [Manual do Usuário](MANUAL_DO_USUARIO.md).

---

## 9. Correções pós-relatório (04/09/2026)

Todos os 5 bugs foram corrigidos e revalidados. Testes após as correções: **backend 40/40 pass (98 asserções)**, frontend typecheck limpo, Vitest 4/4, build OK.

| Bug | Correção aplicada | Validação |
|---|---|---|
| #1 Usuário (500 / falta `name`) | `'name' => $data['full_name']` em `UserController@store` + campo **senha inicial opcional** (≥8) no dialog de criação (front `Users.tsx`) | `POST /admin/users` → 201; login com a senha definida → sucesso |
| #2 Sugestões (permission denied) | Migration `2026_09_04_150000_grant_rls_article_suggestions_table`: ENABLE RLS + grants (internal/bypass) + 4 policies; `ArticleSuggestion` ganhou `HasUuids` (a PK uuid **não tinha default no banco** — achado adicional que persistia INSERT com id nulo) | Operador cria sugestão → gestor aprova → artigo publicado (`status=published`, slug gerado, 1 chunk com embedding) |
| #3 Transferência (500 Carbon) | `SupportTransferService::parseSupportTime()` tolerante (`H:i:s`/`H:i`/`G:i` + fallback) e mapeamento **explícito** dos métodos de Teams — o nome dinâmico `'send'.ucfirst($type)` gerava `sendOut_of_hours` (fatal). Criado `TeamsNotificationService::sendMaintenance()` | `POST /widget/conversations/{id}/transfer` → JSON correto `{"transferred":false,"reason":"out_of_hours"}` (sem 500); posse inválida segue 404 |
| #4 `/widget` exige login | Rota movida para o nível raiz do router (fora do layout `Protected`) | Visitante anônimo em `/widget` renderiza o assistente standalone (sem AppShell, sem redirect) |
| #5 “HTTP 400” bruto | `useChat` extrai `body.message` de respostas não-ok | Mensagem de injection no chat exibe **“Mensagem bloqueada por segurança.”** |

### Novos achados durante a correção

- **`ArticleSuggestion` sem `HasUuids`**: a tabela usa `uuid('id')->primary()` sem default; o model não gerava o id — INSERT violava NOT NULL mesmo com o GRANT corrigido.
- **`notifyTeamsIfEnabled` com nome de método dinâmico**: `ucfirst('out_of_hours')` → `sendOut_of_hours` (inexistente). Também afetaria `maintenance` → `sendMaintenance` (método criado no service de Teams).
- **Fuso horário**: `Carbon::now()` no container roda em UTC — com 19h UTC o sistema classifica corretamente como fora do horário (18h), mas o gestor que configura “08:00–18:00” espera o fuso local. Recomendado definir `APP_TIMEZONE` em produção.
- **Rate limiter de login (5/15 min)**: atingido durante os testes repetidos de API; `php artisan cache:clear` reseta os contadores.

### Nova funcionalidade: Histórico do chat

- Painel lateral no chat interno (botão **Histórico** no cabeçalho): lista conversas do usuário via `GET /conversations` (filtro `source=direct`) com título, data relativa, status (Aberta/Encerrada) e avaliação em estrelas.
- Clicar em uma conversa carrega as mensagens do servidor (`GET /conversations/{id}/messages`), restaura o `conversation_id` (permite continuar a conversa) e o estado de avaliação (conversa já avaliada não reapresenta o prompt).
- O gestor vê todas as conversas internas; o operador somente as próprias (comportamento do endpoint, protegido por RLS + IDOR).
- Validação: painel lista as conversas reais da sessão; conversa aberta carrega mensagens e habilita “Exportar”. (Capturas de tela indisponíveis nesta fase — o serviço de captura do navegador estava falhando; validação por asserções de DOM e API.)

> Nota: os pontos de teste do §4.1 que usam cliques em dropdown/menus dependem de eventos de pointer — no harness usado, alguns cliques sintéticos não foram entregues ao React; nesses casos a validação foi feita com sequências completas de `pointerdown/mousedown/pointerup/mouseup/click` ou por API, sem alterar o comportamento real para usuários humanos.
