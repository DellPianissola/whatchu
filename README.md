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
│   └── prisma/
├── docker-compose.yml
└── README.md
```

## Como rodar

### Pré-requisitos
- Docker e Docker Compose

### Subir tudo

```bash
git clone https://github.com/DellPianissola/whatchu.git
cd whatchu
docker compose up
```

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000/api |
| Swagger | http://localhost:5000/docs |
| PostgreSQL | localhost:5432 |

### Comandos úteis

```bash
npm run up          # docker compose up
npm run up:build    # docker compose up --build
npm run up:d        # docker compose up -d (background)
npm run down        # parar serviços
npm run down:v      # parar e limpar banco
npm run logs        # ver logs
```

### Desenvolvimento local

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

## Testes (backend)

### Unitários — sem banco, com mocks

```bash
cd backend
npm test
npm run test:coverage
```

### Integração — banco PostgreSQL real isolado

```bash
# 1. Sobe o banco de testes via Docker (porta 5433, não interfere no de dev)
docker compose --profile test up postgres-test -d

# 2. Roda os testes
cd backend
npm run test:integration
npm run test:integration:coverage
```

### Tudo de uma vez

```bash
npm run test:all
```

## Variáveis de ambiente

Crie `backend/.env` com base nas chaves abaixo:

```env
DATABASE_URL=postgresql://whatchu:whatchu@postgres:5432/whatchu
PORT=5000
NODE_ENV=development
TMDB_API_KEY=sua_chave_aqui
JWT_SECRET=seu_secret_aqui
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_EMAIL=admin@localhost
```

---

Feito com React, Node.js e muita discussão sobre o que assistir hoje.
