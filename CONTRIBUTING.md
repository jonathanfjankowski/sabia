# Contributing to Sabiá

Obrigado por contribuir! Este guia ajuda a manter o projeto consistente e de qualidade.

## Como Contribuir

1. **Fork** o repositório
2. Crie uma **branch** para sua feature/fix: `git checkout -b feature/nome-da-feature`
3. Faça suas alterações com **commits atômicos**
4. Rode os **testes** e **lint**
5. Abra um **Pull Request** com descrição clara

## Padrões de Código

### Backend (PHP/Laravel)
- **Pint** para formatação: `./vendor/bin/pint`
- **PHPStan** nível 5 (configurado no `phpstan.neon`)
- **Pest** para testes: `php artisan test`
- Siga **PSR-12** e convenções Laravel

### Frontend (TypeScript/React)
- **oxlint** para lint: `npm run lint`
- **TypeScript** strict mode: `npx tsc --noEmit`
- **Vitest** para testes unitários: `npm run test`
- **Playwright** para E2E: `npx playwright test`
- Componentes funcionais + hooks, sem classes

### Commits
Use **Conventional Commits**:
```
feat: adiciona suporte a webhook no widget
fix: corrige rate limiting no login
docs: atualiza README com variáveis de ambiente
refactor: extrai VectorSearchService
test: adiciona testes de RLS
chore: atualiza dependências
```

## Estrutura de Branches

| Prefixo | Uso |
|---------|-----|
| `feat/` | Nova funcionalidade |
| `fix/` | Correção de bug |
| `docs/` | Documentação |
| `refactor/` | Refatoração sem mudança de comportamento |
| `test/` | Testes |
| `chore/` | Manutenção, deps, config |

## Testes

### Backend
```bash
cd sabia-api
php artisan test
```

### Frontend
```bash
cd sabia-frontend
npm run test          # Vitest unit tests
npx playwright test   # E2E tests
```

### Widget
```bash
cd sabia-widget
npm run build
```

## Pull Request Checklist

- [ ] Código formata corretamente (Pint/oxlint)
- [ ] TypeScript passa sem erros
- [ ] Testes passam (backend + frontend)
- [ ] Documentação atualizada se necessário
- [ ] Commits seguem Conventional Commits
- [ ] Branch atualizada com `main` (rebase)
- [ ] Descrição clara do que mudou e por quê

## Configuração Local

```bash
# Backend
cd sabia-api
composer install
cp .env.example .env
# Configure DB, AI settings, etc.
php artisan migrate --seed
php artisan serve

# Frontend
cd sabia-frontend
npm install
cp .env.example .env
npm run dev

# Widget
cd sabia-widget
npm install
npm run build
```

## Reportando Bugs

Use o template de issue com:
- Versão do PHP/Node
- Passos para reproduzir
- Comportamento esperado vs atual
- Logs/prints relevantes

## Código de Conduta

Seja respeitoso, inclusivo e construtivo. Discriminação, assédio ou comportamento tóxico não serão tolerados.

---

Dúvidas? Abra uma issue ou inicie uma discussão!