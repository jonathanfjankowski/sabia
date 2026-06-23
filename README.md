# Sabiá v3.0 - Chatbot Inteligente

Documentação completa do projeto de chatbot com base de conhecimento, IA configurável e múltiplas interfaces.

## 📋 Visão Geral

O **Sabiá** é um chatbot de suporte que utiliza IA generativa para responder perguntas com base em uma base de conhecimento estruturada. O sistema oferece três interfaces principais:

- **Base de Conhecimento (`/kb`)**: Interface pública para navegação de artigos
- **Chat Direto (`/chat`)**: Interface interna para conversas com a IA
- **Widget Flutuante**: Componente embedável para sites externos

## 🏗️ Arquitetura

### Stack Tecnológico

- **Backend**: Laravel 11 (PHP 8.3)
- **Frontend**: React 18 + TypeScript + Vite
- **Banco de Dados**: PostgreSQL 16 com extensão pgvector
- **IA**: Suporte multi-provedor (Gemini, OpenAI, Anthropic)

### Estrutura de Diretórios

```
/workspace
├── docker-compose.yml          # Orquestração Docker
├── docker/
│   └── postgres/
│       └── init.sql           # Script de inicialização do banco
├── sabia-api/                  # Backend Laravel
│   ├── Dockerfile
│   ├── app/
│   │   ├── Models/            # Modelos Eloquent
│   │   ├── Http/
│   │   │   ├── Controllers/   # Controladores API
│   │   │   └── Middleware/    # Middleware de autenticação
│   │   └── Services/          # Serviços de IA e negócio
│   └── database/
│       └── migrations/        # Migrations do banco
└── sabia-frontend/            # Frontend React
    ├── Dockerfile
    ├── src/
    │   ├── components/        # Componentes React
    │   ├── pages/             # Páginas da aplicação
    │   ├── hooks/             # Hooks customizados
    │   ├── store/             # Estado global (Zustand)
    │   └── services/          # Serviços de API
    └── index.html
```

## 🚀 Configuração do Ambiente

### Pré-requisitos

- Docker e Docker Compose instalados
- Chaves de API para os provedores de IA (opcional para desenvolvimento)

### Inicialização

1. **Clonar o repositório** (se aplicável)

2. **Configurar variáveis de ambiente**
   
   Criar arquivo `.env` no diretório `sabia-api/`:
   ```env
   APP_NAME=Sabia
   APP_ENV=local
   APP_KEY=
   APP_DEBUG=true
   APP_URL=http://localhost:8000
   
   DB_CONNECTION=pgsql
   DB_HOST=postgres
   DB_PORT=5432
   DB_DATABASE=sabia_db
   DB_USERNAME=sabia_user
   DB_PASSWORD=sabia_password
   
   # Provedores de IA (configurar conforme necessário)
   GEMINI_API_KEY=
   OPENAI_API_KEY=
   ANTHROPIC_API_KEY=
   
   # Configurações do Widget
   WIDGET_ENABLED=true
   WIDGET_TITLE=Sabiá - Assistente Virtual
   ```

3. **Subir os containers**
   ```bash
   cd /workspace
   docker-compose up -d
   ```

4. **Instalar dependências do Laravel** (após subir o container)
   ```bash
   docker-compose exec laravel composer install
   docker-compose exec laravel php artisan key:generate
   docker-compose exec laravel php artisan migrate --seed
   ```

5. **Acessar a aplicação**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000/api
   - Banco de dados: localhost:5432

## 🗄️ Banco de Dados

### Tabelas Principais

- `users`: Usuários do sistema (admins e operadores)
- `knowledge_base_articles`: Artigos da base de conhecimento
- `categories`: Categorias para organização de artigos
- `chat_sessions`: Sessões de chat com usuários
- `chat_messages`: Mensagens das conversas
- `embeddings`: Vetores para busca semântica (pgvector)
- `widget_configs`: Configurações do widget
- `audit_logs`: Logs de auditoria
- `feedback_ratings`: Avaliações dos usuários

### Row Level Security (RLS)

O sistema implementa RLS no PostgreSQL para isolamento de dados:

- **sabia_internal**: Role para usuários autenticados (acesso completo)
- **sabia_public**: Role para acesso público via widget (acesso limitado)

## 🤖 Integração com IA

### Provedores Suportados

1. **Google Gemini** (padrão)
2. **OpenAI GPT**
3. **Anthropic Claude**

### Funcionalidades de IA

- **RAG (Retrieval-Augmented Generation)**: Busca semântica na base de conhecimento
- **Stream SSE**: Respostas em tempo real via Server-Sent Events
- **Detector de Prompt Injection**: Segurança contra ataques
- **Avaliação de Confiança**: Score de confiança nas respostas

## 🎨 Interfaces

### 1. Base de Conhecimento (`/kb`)

- Navegação por categorias
- Busca full-text e semântica
- Visualização de artigos em markdown
- Sistema de avaliação de artigos

### 2. Chat Direto (`/chat`)

- Interface de chat em tempo real
- Histórico de conversas
- Contexto persistente por sessão
- Feedback de qualidade

### 3. Widget Flutuante

- Componente JavaScript embedável
- White label (personalizável)
- Comunicação via postMessage
- Baixo impacto de performance

## 🔐 Segurança

- Autenticação via Laravel Sanctum
- RLS no banco de dados
- Rate limiting na API
- Sanitização de inputs
- CORS configurado

## 📝 Próximos Passos

### Fase 1: Backend (Laravel)
- [x] Estrutura Docker
- [ ] Migrations do banco de dados
- [ ] Models e relacionamentos
- [ ] Controllers da API
- [ ] Serviços de IA
- [ ] Middleware de autenticação

### Fase 2: Frontend (React)
- [x] Estrutura básica
- [ ] Componentes de UI
- [ ] Editor TipTap
- [ ] Hook useChat com SSE
- [ ] Páginas completas

### Fase 3: Integração
- [ ] Testes end-to-end
- [ ] Documentação da API
- [ ] Deploy em produção

## 📄 Licença

Este projeto é proprietário da Bsoft TMS.

---

**Versão**: 3.0  
**Última atualização**: 2025  
**Status**: Em desenvolvimento
