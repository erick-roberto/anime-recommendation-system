// src/data/mockData.js

export const MOCK_USER = {
  user_id: 999,
  usuario: 'otaku_dev',
  name: 'Thais',
  email: 'thais@animerecs.com',
  avatarUrl: ''
};

// Simulando o Anime.csv
export const MOCK_ANIMES = [
  { anime_id: 1, name: 'Steins;Gate', genre: 'Sci-Fi, Thriller', type: 'TV', episodes: 24, rating: 9.1, members: 2300000, img: 'https://cdn.myanimelist.net/images/anime/1935/127974.jpg' },
  { anime_id: 2, name: 'Monster', genre: 'Mystery, Drama', type: 'TV', episodes: 74, rating: 8.8, members: 1100000, img: 'https://cdn.myanimelist.net/images/anime/10/18793.jpg' },
  { anime_id: 3, name: 'Code Geass', genre: 'Action, Mecha', type: 'TV', episodes: 25, rating: 8.7, members: 2000000, img: 'https://cdn.myanimelist.net/images/anime/1032/135088.jpg' },
  { anime_id: 4, name: 'Hunter x Hunter', genre: 'Adventure, Action', type: 'TV', episodes: 148, rating: 9.0, members: 2500000, img: 'https://cdn.myanimelist.net/images/anime/1337/99013.jpg' },
  { anime_id: 101, name: 'Fullmetal Alchemist: Brotherhood', genre: 'Action, Fantasy', type: 'TV', episodes: 64, rating: 9.1, members: 3100000, img: 'https://cdn.myanimelist.net/images/anime/1208/94745.jpg', rank: 1 },
  { anime_id: 102, name: 'Bleach: TYBW', genre: 'Action, Supernatural', type: 'TV', episodes: 13, rating: 9.0, members: 500000, img: 'https://cdn.myanimelist.net/images/anime/1908/135007.jpg', rank: 2 },
  { anime_id: 201, name: 'Death Note', genre: 'Supernatural, Mystery', type: 'TV', episodes: 37, rating: 8.6, members: 3600000, img: 'https://cdn.myanimelist.net/images/anime/9/9444.jpg' },
  { anime_id: 202, name: 'Demon Slayer', genre: 'Action, Supernatural', type: 'TV', episodes: 26, rating: 8.5, members: 2800000, img: 'https://cdn.myanimelist.net/images/anime/1286/99889.jpg' },
  { anime_id: 301, name: 'Frieren: Beyond Journey', genre: 'Fantasy, Adventure', type: 'TV', episodes: 28, rating: 9.3, members: 800000, img: 'https://cdn.myanimelist.net/images/anime/1015/138025.jpg' }
];

// Simulando as divisões da sua Home.jsx
export const MOCK_HOME_SECTIONS = {
  forYou: MOCK_ANIMES.slice(0, 4),
  top10: MOCK_ANIMES.filter(a => a.rank).sort((a, b) => a.rank - b.rank),
  popular: MOCK_ANIMES.slice(6, 8),
  recent: [MOCK_ANIMES[8]]
};

// Simulando o Rating.csv (Relação Usuário -> Anime com a nota dada)
// O atributo 'userRating' simula o cruzamento do Rating.csv com o Anime.csv
export const MOCK_USER_HISTORY = [
  { ...MOCK_ANIMES.find(a => a.anime_id === 101), userRating: 5 }, // Avaliou com 5
  { ...MOCK_ANIMES.find(a => a.anime_id === 201), userRating: 4 }, // Avaliou com 4
  { ...MOCK_ANIMES.find(a => a.anime_id === 1), userRating: -1 },  // Assistiu mas não deu nota
];