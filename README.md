# Whatchu — O que assistir hoje?

Plataforma multi-usuário para gerenciar listas de filmes, séries e animes. Cada usuário monta sua lista a partir de buscas no TMDB e Jikan (MyAnimeList), e o sistema ajuda o grupo a decidir o que assistir com um sorteio inteligente.

## Funcionalidades

- **Autenticação** — cadastro e login por username, JWT com refresh token
- **Perfis** — cada usuário tem seu perfil e sua lista própria
- **Busca integrada** — filmes e séries via TMDB, animes via Jikan, com filtros de gênero, ordenação e paginação real
- **Watchlist** — adicione, organize por prioridade (baixa / média / alta) e marque como assistido
- **Sorteio** — sorteia um título da lista com peso por prioridade
- **Onboarding** — fluxo guiado no primeiro acesso para montar a lista inicial
- **Modal de detalhes** — sinopse, gêneros, duração, trailer e mais, sem sair da plataforma

## Tecnologias

| Camada | Stack |
|---|---|
| Frontend | React 18, Vite, React Router v6, Axios |
| Backend | Node.js, Express, Prisma, PostgreSQL, JWT |
| Busca externa | TMDB API v3, Jikan API v4 |
| Email | Resend |
| Storage | MinIO (S3-compatible, self-hosted) |
| Infra | Docker, Docker Compose |
| Testes | Vitest (unit + integração) |

## Estrutura

```
whatchu/
├── frontend/           # React + Vite
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── services/
│       └── contexts/
├── backend/            # Node.js + Express
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   ├── lib/
│   ├── config/
│   ├── tests/
│   └── prisma/
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
```

## Como rodar

### Pré-requisitos
- Docker e Docker Compose

### Subir tudo (primeira vez)

```bash
git clone https://github.com/DellPianissola/whatchu.git
cd whatchu
cp backend/.env.example backend/.env   # preencher as variáveis
docker compose up --build
```

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000/api |
| PostgreSQL | localhost:5432 |
| MinIO Console | http://localhost:9001 |
| MinIO API | http://localhost:9000 |

---

## Docker — comandos úteis

### Ciclo de vida

```bash
# Subir tudo em background
docker compose up -d

# Subir com rebuild das imagens (após mudar código ou dependências)
docker compose up --build

# Subir um serviço específico com rebuild
docker compose up --build backend
docker compose up --build frontend

# Parar tudo (mantém volumes)
docker compose down

# Parar e apagar volumes (reseta banco e MinIO)
docker compose down -v
```

### Logs

```bash
# Todos os serviços
docker compose logs -f

# Serviço específico
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
docker compose logs -f minio
```

### Banco de dados (Prisma)

```bash
# Rodar migrations na dev (de fora do Docker)
cd backend
DATABASE_URL="postgresql://whatchu:whatchu@localhost:5432/whatchu" \
  npx prisma migrate dev --name nome_da_migration

# Abrir Prisma Studio (de fora do Docker)
cd backend
DATABASE_URL="postgresql://whatchu:whatchu@localhost:5432/whatchu" \
  npx prisma studio

# Rodar migrations dentro do container
docker compose exec backend npx prisma migrate deploy
```

### Execução de comandos dentro de containers

```bash
# Abrir shell no backend
docker compose exec backend sh

# Abrir shell no frontend
docker compose exec frontend sh

# Checar status dos containers
docker compose ps
```

### Desenvolvimento local (sem Docker)

```bash
# Precisa do Postgres rodando (pode ser só o container do banco)
docker compose up -d postgres

# Backend
cd backend && npm install && npm run dev   # porta 5000

# Frontend
cd frontend && npm install && npm run dev  # porta 5173
```

## Testes (backend)

### Tudo via Docker — comando único

Sobe o banco de testes, roda unit + integração e sai. Exit code do container
reflete o resultado dos testes (útil pra CI). Não precisa ter Node instalado no host.

```bash
docker compose --profile test run --rm backend-test
```

Limpar só os containers de teste (sem mexer no dev):

```bash
docker compose --profile test rm -sfv postgres-test backend-test
```

> ⚠️ **Não** use `docker compose --profile test down -v` — o `--profile` adiciona
> serviços, não restringe, então `down` derruba TUDO (dev incluso) e `-v` apaga
> os volumes do dev (`postgres_data`, `minio_data`).

### Localmente (sem Docker pros testes)

#### Unitários — sem banco, com mocks

```bash
cd backend
npm test
npm run test:coverage
```

#### Integração — banco PostgreSQL real isolado

```bash
# 1. Sobe só o banco de testes via Docker (porta 5433, não interfere no de dev)
docker compose --profile test up postgres-test -d

# 2. Roda os testes
cd backend
npm run test:integration
npm run test:integration:coverage
```

#### Tudo de uma vez

```bash
npm run test:all
```

## Variáveis de ambiente

Crie `backend/.env` a partir do exemplo:

```bash
cp backend/.env.example backend/.env
```

Chaves obrigatórias para a aplicação funcionar:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão do PostgreSQL |
| `JWT_SECRET` | Secret do access token (mín. 32 chars) |
| `REFRESH_TOKEN_SECRET` | Secret do refresh token (mín. 32 chars, diferente do anterior) |
| `TMDB_API_KEY` | Chave da API do TMDB |
| `RESEND_API_KEY` | Chave da API do Resend (emails) |
| `APP_URL` | URL base do frontend (ex: `http://localhost:3000`) |
| `MINIO_ENDPOINT` | Endpoint do MinIO (ex: `http://minio:9000` dentro do Docker) |
| `MINIO_ACCESS_KEY` | Usuário do MinIO |
| `MINIO_SECRET_KEY` | Senha do MinIO |
| `MINIO_BUCKET` | Nome do bucket (ex: `whatchu`) |
| `MINIO_PUBLIC_URL` | URL acessível pelo browser para servir as imagens |

Gerar secrets seguros:

```bash
openssl rand -hex 32   # rodar duas vezes, uma pra cada secret
```

---

Feito com React, Node.js e muita discussão sobre o que assistir hoje.
