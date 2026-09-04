# Sabiá — Manual de Uso

> **Versão:** 1.0 · 04/09/2026
> Perfis atendidos: **Gestor**, **Operador** e **Visitante (widget público)**

Este manual explica, passo a passo, como usar cada tela do Sabiá. A documentação técnica (arquitetura, API, banco de dados) está em [docs/TECNICA.md](TECNICA.md).

---

## 1. Acesso ao sistema

1. Abra o endereço do Sabiá (em desenvolvimento: `http://localhost:5173`).
2. Informe **E-mail** e **Senha** e clique em **Entrar**.
   - Credenciais do ambiente de demonstração (criadas pelo seed):
     - Gestor: `gestor@sabia.com` / `password123`
   - Após 5 tentativas erradas em 15 minutos o acesso é bloqueado temporariamente (mensagem “muitas tentativas”).
3. Para sair, clique no seu nome (canto superior direito) → **Sair**.

**O que cada perfil vê:**

| Recurso | Operador | Gestor |
|---|:---:|:---:|
| Base de Conhecimento (`/kb`) | ✔ | ✔ |
| Chat com IA (`/chat`) | ✔ | ✔ |
| Sugestões de artigo (`/article-suggestions`) | ✔ | ✔ (com painel de revisão) |
| Administração (artigos, categorias, usuários) | ✖ | ✔ |
| Insights (avaliações, chats do widget, lacunas, auditoria, logs, saúde) | ✖ | ✔ |
| Configurações (IA, widget, white label) | ✖ | ✔ |

O menu lateral só exibe o que o seu perfil permite; tentativas de acessar URLs de administração diretamente redirecionam de volta para a Base de Conhecimento.

---

## 2. Base de Conhecimento (gestor e operador)

**Menu: Base de Conhecimento**

- **Navegar**: os artigos ativos aparecem agrupados por categoria, com resumo, contadores de visualizações/“útil” e data de atualização.
- **Buscar**: digite no campo “Busque por título, conteúdo ou palavra-chave…”. A busca filtra em tempo real (há um pequeno atraso intencional de 300 ms) e atualiza o endereço da página — dá para compartilhar o link de uma busca.
- **Filtrar por categoria**: use os chips “Todas (N)”, “Fiscal (N)”, etc.
- **Ler um artigo**: clique no card. A página do artigo mostra breadcrumb da categoria, badge de acesso (**Público** = aparece também no widget; **Interno** = só usuários autenticados), versão, conteúdo formatado em markdown, **artigos relacionados** (mesma categoria, até 3) e, ao final:
  - **“Este artigo foi útil?”** — clique em **Sim** ou **Não** (o voto é registrado imediatamente e os botões são desabilitados).

---

## 3. Chat com IA (gestor e operador)

**Menu: Chat com IA**

O chat interno tem **acesso ao nível interno** — a IA responde com base em todos os artigos ativos, incluindo os confidenciais.

- **Enviar uma pergunta**: escreva no campo “Digite sua dúvida…” e pressione **Enter** (ou **Shift+Enter** para quebrar linha). Máximo de 2.000 caracteres por mensagem.
- **Anexar imagens** (até 5, 4 MB cada): clique no clipe 📎, arraste imagens para o campo ou cole com **Ctrl+V**.
- **Durante a resposta**:
  - A resposta chega **em streaming** (texto aparecendo aos poucos).
  - Cada resposta traz um **selo de confiança** (Alta/Baixa/Sem correspondência) e até **3 fontes** — links dos artigos usados como contexto. Clique para abrir na KB.
  - Em cada mensagem: **copiar**, 👍/👎 e **regenerar** (repete a última pergunta).
  - Para interromper, clique no botão **vermelho** (Parar geração) — o texto parcial é preservado.
- **Encerrar e avaliar**: após a primeira resposta surge “Como avalia este atendimento?” — escolha de 1 a 5 estrelas ou **Pular avaliação**. A avaliação fecha a conversa e aparece nos relatórios do gestor.
- **Exportar**: baixa a conversa atual em `.txt` formatado.
- **Histórico**: lista suas conversas anteriores (título, data, status Aberta/Encerrada e avaliação). Clique em uma conversa para reabri-la — você pode reler as mensagens e continuar de onde parou. O gestor vê as conversas de todos; o operador, apenas as próprias.
- **Nova**: começa uma conversa do zero.
- **Tempo limite**: se a IA não responder em N segundos (padrão 180, configurável pelo gestor), aparece “A resposta não foi concluída em N segundos. Tente novamente.” com o texto parcial preservado.
- **Segurança**: mensagens com tentativas de manipulação da IA (por exemplo, “ignore todas as instruções anteriores”) são **bloqueadas** pelo sistema.

---

## 4. Sugestões de artigo (operador → revisão do gestor)

**Operador**
1. Acesse `/article-suggestions` → **Nova sugestão**.
2. Preencha **Título**, **Resumo** e **Conteúdo** (mesmo editor dos artigos), escolha **Categoria** e **Acesso**.
3. Clique em **Salvar rascunho** — a sugestão vai para a fila **Pendente** de revisão.
4. Acompanhe o status em “Minhas Sugestões” (Pendente/Publicado/Rejeitado). Enquanto pendente, você pode **editar** ou **cancelar**.

**Gestor**
1. Abra a sugestão pendente (`/admin/article-suggestions/{id}`).
2. Escolha: **Aprovar e publicar**, **Aprovar com edição** ou **Rejeitar** (com observação obrigatória ao autor).
3. Publicada, a sugestão vira um artigo ativo (e recebe embeds para a IA).

---

## 5. Administração (gestor)

### 5.1 Artigos — `Administração → Artigos`

- **Listagem**: busca por texto, filtro por status (Todos/Ativos/Rascunhos/Arquivados). Cada linha mostra versão (`v1`), categoria, status, acesso, views, votos “útil” e atualização.
- **Criar**: **+ Novo artigo** → preencha Título (obrigatório), Resumo (opcional) e Conteúdo no editor rico; na lateral, escolha **Categoria**, **Acesso** (Interno/Público) e Status. **Atalho Ctrl/Cmd+S salva**.
  - **Editor**: toolbar com H1–H3, listas, checklist, código, citação, **imagem** (upload direto ou colar/arrastar), link e divisor; menu **“/”** com comandos rápidos (inclusive inserir link de outro artigo).
  - **Publicar** cria/atualiza o artigo e gera automaticamente os **embeddings** (chunks vetoriais) usados pela IA.
- **Editar/versões**: cada alteração de conteúdo cria uma **versão** no histórico (lateral direita). É possível **Restaurar** qualquer versão (a atual é salva antes).
- **Importar markdown**: **Importar MD** → cole o markdown, escolha categoria/nível → **Preview chunks** mostra como a IA fatiará o texto (total de chunks e tokens estimados) → **Importar**.
- **Ações por linha (⋮)**: Visualizar na KB, Editar, Ativar (rascunho→ativo), Arquivar, Desarquivar, Restaurar (artigos excluídos) e Excluir (com confirmação — pode ser restaurado).

### 5.2 Categorias — `Administração → Categorias`

- Cards com ícone, cor e ordem. **Nova/Editar**: nome, descrição, cor (paleta + hex), ordem e ícone.
- **Excluir**: os artigos da categoria ficam “sem categoria” (não são apagados).

### 5.3 Usuários — `Administração → Usuários`

- **Novo usuário**: nome completo, e-mail e perfil (**Operador** = KB + Chat; **Gestor** = tudo). O switch **Usuário ativo** controla o login (inativos não entram).
- **Senha inicial (opcional)**: defina uma senha com no mínimo 8 caracteres para repassar ao usuário. Se deixar vazio, será gerada uma senha aleatória (e será preciso redefini-la manualmente enquanto não houver fluxo de e-mail).
- **Editar/Ativar-Desativar** pelo menu da linha.

### 5.4 Configurações de IA — `Configurações → IA`

Três abas:

1. **Conexão**
   - **Endpoint**: base URL de qualquer API compatível com OpenAI (OpenAI, Groq, Together, Ollama, llama.cpp, vLLM…).
   - **Modelo** e **API Key** (criptografada AES-256; exibida mascarada — para trocar, digite uma nova).
   - **Provedor de embeddings**: indicador verde = sidecar local conectado. Provedores: **Sidecar BAAI/bge-m3 (local)**, OpenAI, Gemini ou Custom (com modelo/endpoint/key próprios). Use **Testar embedding** para validar (“OK · 1024 dims · Xms”).
   - **Parâmetros**: temperatura (0–1), máx. tokens (vazio = padrão do modelo), **timeout de resposta** em segundos (10–600) e idioma.
2. **System Prompt**: instrução de sistema da IA. Use **Testar prompt ao vivo** para conversar com a IA usando o prompt atual antes de salvar.
3. **RAG & Confiança**: **Top N** chunks retornados, tamanho/overlap do chunk e o **threshold de confiança** (0–1) — abaixo do limite baixo o widget oferece humano; acima do threshold a resposta é marcada como alta confiança.

Sempre **Salvar** após alterar. Alterações são auditadas (segredos mascarados no log).

### 5.5 Widget — `Configurações → Widget`

- **Boas-vindas**: mensagem inicial do assistente (editor rico com preview).
- **Suporte humano**: link de atendimento (aceita `{NOME}` e `{EMAIL}`), horário de atendimento (início/fim), telefone e mensagem de fora do horário.
- **Teams**: URL do webhook do Microsoft Teams e o que notificar (transferências, lacunas de conhecimento, fora de horário).
- **Embed & Manutenção**: **domínios autorizados** a embutir o widget (um por vez, Enter para adicionar) e o **modo manutenção** (o widget exibe a mensagem de manutenção e não chama a IA).

### 5.6 White label — `Configurações → White Label`

Nome do sistema, fonte (Inter/Roboto/Open Sans), **logo** e **favicon** (upload), **cor primária/secundária** (paleta + hex) e 8 predefinições. O **preview é ao vivo**; **Salvar** aplica para todos os usuários.

---

## 6. Insights (gestor)

| Tela | O que mostra |
|---|---|
| **Avaliações** (`/admin/ratings`) | Média geral, distribuição por estrela, filtro por canal (Interno/Widget) e **Exportar CSV** |
| **Chats do Widget** (`/admin/widget-conversations`) | Conversas públicas com status (encerrada/transferida/fora do horário/sem resposta), avaliação, transcrição completa em dialog e **exportar TXT** |
| **Lacunas de Conhecimento** (`/admin/knowledge-gaps`) | Perguntas que a IA não respondeu com confiança suficiente. Ações: **Criar artigo** (título pré-preenchido) e **Resolver** |
| **Auditoria** (`/admin/audit-logs`) | Quem fez o quê (artigos, usuários, configurações) com “antes/depois”, IP e navegador; busca, detalhe e **Exportar CSV** |
| **Logs do Sistema** (`/admin/system-logs`) | Eventos técnicos por nível (info/aviso/erro/crítico) para diagnóstico |
| **Saúde do Sistema** (`/admin/health`) | Status do provedor de IA, webhook Teams, modo manutenção e erros críticos das últimas 24 h |

---

## 7. Widget público (visitante anônimo)

O visitante acessa o assistente pelo site da empresa (widget embedado) e conversa **sem login**. A IA responde usando **somente os artigos marcados como Público**.

- A conversa abre com a **mensagem de boas-vindas** configurada pelo gestor.
- Cada resposta mostra o **selo de confiança** e as fontes públicas usadas.
- **“Falar com humano”**: transfere o atendimento para o suporte (abre o link configurado — WhatsApp/e-mail/ticket — com um resumo da conversa). Fora do horário de atendimento, o widget informa e oferece o telefone.
- No modo **manutenção**, o widget exibe apenas a mensagem de manutenção.
- Ao encerrar, o visitante pode **avaliar com estrelas** (1–5).

### 7.1 Embutindo o widget em um site (para o webmaster)

Cole antes do `</body>` do site:

```html
<script src="https://SEU-HOST/sabia-widget.umd.js"
        data-token="SEU-TOKEN"
        data-api-url="https://API-DO-SABIA"
        data-position="bottom-right"
        data-primary-color="#6366f1"></script>
```

- `data-position`: `bottom-right` (padrão), `bottom-left`, `top-right` ou `top-left`.
- O domínio do site precisa estar em **Configurações → Widget → Embed & Manutenção → Domínios autorizados**.
- API programática: `window.SabiáWidget.open()`, `.close()`, `.toggle()`, `.isOpen()`.

---

## 8. Perguntas frequentes

**A resposta da IA não cita minha base.** Verifique se o artigo está **Ativo** e com o **acesso correto** (widget só usa Públicos). Artigos antigos podem precisar de reprocessamento (`php artisan chunks:reembed` — operação do administrador técnico).

**O selo “Sem correspondência” aparece muito.** Reduza o **threshold de confiança** em Configurações → IA → RAG & Confiança, ou melhore/reescreva os artigos daquele assunto.

**A resposta demora e corta.** Aumente o **timeout de resposta** (Configurações → IA → Conexão) ou verifique a saúde do provedor de IA em **Saúde do Sistema**.

**Mudei a cor/logo e não vi efeito.** O white label salva com **Salvar** na tela de White Label; recarregue a página (Ctrl+F5) para forçar o favicon novo.

**Esqueci a senha.** A redefinição é feita pelo gestor na tela de Usuários (desative/ative ou recrie o usuário enquanto não houver fluxo de e-mail).
