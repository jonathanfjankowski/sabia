# Sabiá — Frontend

SPA React do Sabiá: Base de Conhecimento (`/kb`), chat interno com IA (`/chat`), painel admin (`/admin/*`) e widget público (`/widget`, consumido pelo script embedável de `sabia-widget/`).

Stack: **React 19 + Vite 8 + TypeScript + Tailwind + Radix/shadcn + Zustand + TipTap 3**.

## Como rodar

```bash
npm install
cp .env.example .env   # VITE_API_URL apontando para a API
npm run dev            # http://localhost:5173
npm run build          # produção
npm run test           # Vitest
npm run lint           # oxlint
```

Credenciais do seed da API: `gestor@sabia.com` / `password123`.

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | Base da API (ex.: `http://localhost:8000/api`) |
| `VITE_MSW_ENABLED` | `true` usa mocks MSW em dev (padrão); `false` conversa com a API real |

Documentação completa em [docs/arquitetura.md](../docs/arquitetura.md).
