import { TMDB_POSTER_BASE_URL } from '../../constants/tmdb.js'

export const POSTERS = {
  interstellar: `${TMDB_POSTER_BASE_URL}/tR1XVa5bxgdh2bRw2u0DzrgkO2l.jpg`,
  parasite: `${TMDB_POSTER_BASE_URL}/bNGW8zYA91VqTZfV3jnKHPEKKvB.jpg`,
  cityOfGod: `${TMDB_POSTER_BASE_URL}/gfnXixcGC060QcG6JPxN6AMdVsq.jpg`,
  imStillHere: `${TMDB_POSTER_BASE_URL}/zNAw7jK8bwCK56rIW676pdgkwhd.jpg`,
  succession: `${TMDB_POSTER_BASE_URL}/z0XiwdrCQ9yVIr4O0pxzaAYRxdW.jpg`,
  yourName: `${TMDB_POSTER_BASE_URL}/bMOKAjTU1TNUjRSF7icldbii06u.jpg`,
  theOffice: `${TMDB_POSTER_BASE_URL}/50DVZEgPwGokQf4o0KHZGQMJqDD.jpg`,
  dark: `${TMDB_POSTER_BASE_URL}/gw8ZlIXEg6SIx3FgMEQqmBkPYKV.jpg`,
  spiritedAway: `${TMDB_POSTER_BASE_URL}/hhoKhsyJ3hFaxEm5pMdZRiTu2lJ.jpg`,
}

export const POSTER_DECK = [
  { title: 'Dark', src: POSTERS.dark },
  { title: 'Parasita', src: POSTERS.parasite },
  { title: 'Cidade de Deus', src: POSTERS.cityOfGod },
  { title: 'A Viagem de Chihiro', src: POSTERS.spiritedAway },
  { title: 'Succession', src: POSTERS.succession },
]

export const SECTIONS = {
  DRAW: 'sortear',
  GROUP: 'em-grupo',
  HOW: 'como-funciona',
  LIST: 'sua-lista',
  FAQ: 'duvidas',
}

export const SECTION_LABELS = {
  [SECTIONS.DRAW]: 'Sortear agora',
  [SECTIONS.GROUP]: 'Em grupo',
  [SECTIONS.HOW]: 'Como funciona',
  [SECTIONS.LIST]: 'Sua lista',
  [SECTIONS.FAQ]: 'Dúvidas',
}

const toLinks = (ids) => ids.map((id) => ({ id, label: SECTION_LABELS[id] }))

export const FOLDERS = toLinks([SECTIONS.FAQ, SECTIONS.LIST, SECTIONS.HOW, SECTIONS.GROUP])

export const SHORTCUTS = toLinks([SECTIONS.DRAW, SECTIONS.GROUP, SECTIONS.HOW, SECTIONS.FAQ])

export const GROUP_MODES = [
  {
    key: 'solo',
    label: 'Só a sua lista',
    note: '38 títulos no pote',
    drawn: { title: 'Interestelar', year: 2014, type: 'Filme', poster: POSTERS.interstellar },
    sources: ['Você'],
    verdict: 'Saiu da sua lista',
  },
  {
    key: 'group',
    label: 'Com a galera',
    note: 'Você, Ana e Bruno · 112 títulos',
    drawn: { title: 'Parasita', year: 2019, type: 'Filme', poster: POSTERS.parasite },
    sources: ['Você', 'Ana', 'Bruno'],
    verdict: 'Estava nas três listas, então tinha mais chance',
  },
  {
    key: 'common',
    label: 'Só o que é comum',
    note: '9 títulos em duas listas ou mais',
    drawn: { title: 'Cidade de Deus', year: 2002, type: 'Filme', poster: POSTERS.cityOfGod },
    sources: ['Você', 'Ana'],
    verdict: 'Os dois queriam ver',
  },
]

export const ITINERARY = [
  {
    when: 'Hoje',
    rows: [
      ['Cria a conta', '1 minuto'],
      ['Busca e adiciona o que quer ver', 'catálogo TMDB'],
    ],
  },
  {
    when: 'Quando der',
    rows: [
      ['Convida os amigos pelo username', '1 convite'],
      ['Eles aceitam', 'uma vez só'],
    ],
  },
  {
    when: 'Na hora do filme',
    rows: [
      ['Escolhe quem entra no sorteio', 'você decide'],
      ['Liga “só itens em comum”', 'opcional'],
      ['Sorteia', '1 clique'],
    ],
  },
]

export const PRIORITY_SAMPLE = [
  { title: 'Ainda Estou Aqui', meta: 'Filme · 2024', priority: 'Urgente', poster: POSTERS.imStillHere },
  { title: 'Succession', meta: 'Série · 2018', priority: 'Alta', poster: POSTERS.succession },
  { title: 'Your Name.', meta: 'Filme · 2016', priority: 'Média', poster: POSTERS.yourName },
  { title: 'The Office', meta: 'Série · 2005', priority: 'Baixa', poster: POSTERS.theOffice },
]

export const PROGRESS_SAMPLE = {
  title: 'Dark',
  poster: POSTERS.dark,
  season: 2,
  episode: 5,
  seasons: [
    { label: 'T1', watched: 10, total: 10 },
    { label: 'T2', watched: 5, total: 8 },
    { label: 'T3', watched: 0, total: 8 },
  ],
}

export const FILTER_SAMPLE = {
  chips: ['Filme', 'Anime', 'Netflix'],
  drawn: { title: 'A Viagem de Chihiro', meta: 'Filme · 2001 · Anime', poster: POSTERS.spiritedAway },
}

export const FAQ_GROUPS = [
  {
    topic: 'Sorteio',
    items: [
      {
        q: 'Preciso de conta para sortear?',
        a: 'Não. O sorteio do topo da página é aberto: escolha filme ou série, gênero e streaming, e sorteie. A conta serve para guardar suas listas e sortear com amigos.',
      },
      {
        q: 'E o que eu já assisti?',
        a: 'O sorteio ignora o que você já viu, a menos que você desligue essa opção para rever algo.',
      },
      {
        q: 'Anime tem filtro?',
        a: 'Tem. “Anime” aparece entre os gêneros e traz as animações japonesas.',
      },
      {
        q: 'De onde vêm os filmes e séries?',
        a: 'Do TMDB (The Movie Database): catálogo, sinopses e pôsteres.',
      },
    ],
  },
  {
    topic: 'Com amigos',
    items: [
      {
        q: 'Como funciona o sorteio em grupo?',
        a: 'Você escolhe quais amigos entram e o Whatchu junta as listas. Título repetido vira um só, com mais chance de sair, e o resultado mostra de quais listas ele veio.',
      },
      {
        q: 'Meus amigos precisam estar online?',
        a: 'Não. Aceito o convite uma vez, você inclui a lista deles quando quiser, sem pedir de novo.',
      },
      {
        q: 'Dá pra sortear só o que todo mundo quer ver?',
        a: 'Dá. Ligue “só itens em comum” e entram apenas os títulos que estão em duas listas ou mais.',
      },
      {
        q: 'Posso deixar minha lista reservada?',
        a: 'Pode. Com o compartilhamento do perfil desligado, só os títulos em comum com o amigo entram no sorteio dele.',
      },
    ],
  },
  {
    topic: 'Conta e lista',
    items: [
      {
        q: 'É gratuito?',
        a: 'Sim. Conta, listas e sorteios não custam nada.',
      },
      {
        q: 'Como marco onde parei numa série?',
        a: 'Você aponta temporada e episódio. Dá para voltar atrás e reassistir sem perder a data em que terminou.',
      },
    ],
  },
]