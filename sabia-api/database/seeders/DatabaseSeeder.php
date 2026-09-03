<?php

namespace Database\Seeders;

use App\Models\Article;
use App\Models\Category;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create gestor user
        $user = User::create([
            'name' => 'Gestor Sabiá',
            'email' => 'gestor@sabia.com',
            'password' => Hash::make('password123'),
            'email_verified_at' => now(),
        ]);

        $profile = Profile::create([
            'user_id' => $user->id,
            'full_name' => 'Gestor Sabiá',
            'role' => 'gestor',
            'is_active' => true,
        ]);

        // 2. Create 4 categories
        $categories = [
            [
                'name' => 'Fiscal',
                'slug' => 'fiscal',
                'description' => 'Notas fiscais, impostos e certificados',
                'color' => '#FF6B35',
                'icon' => 'receipt',
                'sort_order' => 1,
            ],
            [
                'name' => 'Fretes',
                'slug' => 'fretes',
                'description' => 'Cadastro de viagens, CT-e e MDF-e',
                'color' => '#0EA5E9',
                'icon' => 'truck',
                'sort_order' => 2,
            ],
            [
                'name' => 'Motoristas',
                'slug' => 'motoristas',
                'description' => 'Cadastro, documentos e jornadas',
                'color' => '#16A34A',
                'icon' => 'users',
                'sort_order' => 3,
            ],
            [
                'name' => 'Integrações',
                'slug' => 'integracoes',
                'description' => 'APIs, webhooks e ERP',
                'color' => '#9333EA',
                'icon' => 'plug',
                'sort_order' => 4,
            ],
        ];

        $createdCategories = [];
        foreach ($categories as $cat) {
            $createdCategories[] = Category::create($cat);
        }

        // 3. Create 3 articles (mix public/internal)
        $articles = [
            [
                'title' => 'Como emitir uma Nota Fiscal',
                'slug' => 'como-emitir-nota-fiscal',
                'summary' => 'Passo a passo para emissão de NF no módulo Fiscal.',
                'content' => $this->getArticleContent1(),
                'category_id' => $createdCategories[0]->id, // Fiscal
                'access_level' => 'internal',
                'status' => 'active',
                'created_by' => $profile->id,
            ],
            [
                'title' => 'Cadastrando uma viagem de frete',
                'slug' => 'cadastrando-viagem-frete',
                'summary' => 'Crie viagens, vincule motoristas e emita CT-e.',
                'content' => $this->getArticleContent2(),
                'category_id' => $createdCategories[1]->id, // Fretes
                'access_level' => 'public',
                'status' => 'active',
                'created_by' => $profile->id,
            ],
            [
                'title' => 'Integração com ERP via webhook',
                'slug' => 'integracao-erp-webhook',
                'summary' => 'Configuração de webhook para sincronização de dados com ERP.',
                'content' => $this->getArticleContent3(),
                'category_id' => $createdCategories[3]->id, // Integrações
                'access_level' => 'internal',
                'status' => 'active',
                'created_by' => $profile->id,
            ],
        ];

        foreach ($articles as $articleData) {
            Article::create($articleData);
        }

        // 4. Settings (evita INSERT negado por RLS quando o widget acessa um
        // banco recém-migrado — os current() tentariam create())
        \App\Models\AiSettings::firstOrCreate([], [
            'provider' => 'openai',
            'endpoint' => 'https://api.openai.com/v1',
            'model' => 'gpt-4o',
            'embedding_model' => 'text-embedding-3-small',
        ]);
        \App\Models\WidgetSettings::firstOrCreate([], [
            'welcome_message' => 'Olá! Sou o assistente virtual. Como posso ajudar?',
        ]);
        \App\Models\BrandSettings::firstOrCreate([], [
            'app_name' => 'Sabiá',
            'primary_color' => '#6366f1',
            'secondary_color' => '#4f46e5',
            'font' => 'Inter',
        ]);

        $this->command?->info('Database seeded: 1 gestor, 4 categories, 3 articles (2 internal, 1 public)');
    }

    private function getArticleContent1(): string
    {
        return <<<'MD'
# Como emitir uma Nota Fiscal

Este artigo descreve o passo a passo para emitir uma **nota fiscal** no módulo Fiscal do sistema.

## Pré-requisitos

- Certificado digital A1 ou A3 instalado
- Cadastro de destinatário concluído
- Configuração de série e número na seção **Fiscal > Configurações**

## Passo a passo

1. Acesse **Fiscal > Emissão de NF**
2. Clique em **Nova NF**
3. Selecione o destinatário
4. Adicione os itens e seus valores
5. Confira impostos calculados automaticamente
6. Clique em **Emitir**

> Após a emissão, o XML e o DANFE ficam disponíveis para download na mesma tela.

```bash
curl -X POST https://api.exemplo.com/nf \
  -H "Authorization: Bearer $TOKEN"
```

| Campo | Obrigatório |
|-------|-------------|
| Destinatário | Sim |
| Itens | Sim |
| Natureza operação | Sim |
MD;
    }

    private function getArticleContent2(): string
    {
        return <<<'MD'
# Cadastrando uma viagem de frete

Para registrar uma viagem:

1. **Fretes > Nova viagem**
2. Informe origem e destino
3. Vincule o motorista
4. Adicione os documentos fiscais
5. Clique em **Salvar e gerar CT-e**

- [Checklist do motorista](#)
- [Tipos de veículo suportados](#)
MD;
    }

    private function getArticleContent3(): string
    {
        return <<<'MD'
# Integração com ERP via webhook

O sistema envia eventos para seu ERP via webhook HTTPS.

```http
POST https://seu-erp.com/webhook
Content-Type: application/json
X-Sistema-Signature: sha256=...
```

## Eventos disponíveis

- `nf.emitted`
- `trip.created`
- `trip.finished`
- `driver.activated`
MD;
    }
}
