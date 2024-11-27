import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Métricas personalizadas
export const getPokemonDuration = new Trend('get_pokemon', true);
export const RateContentOK = new Rate('content_OK');

// Configuração com rampa
export const options = {
  thresholds: {
    http_req_failed: ['rate<0.30'], // Menos de 30% de falhas
    get_pokemon: ['p(99)<10000'], // 99% das requisições em menos de 500ms
    content_OK: ['rate>0.95'] // Mais de 95% das respostas devem ser OK
  },
  stages: [
    { duration: '30s', target: 10 }, // 10 usuário inicial em 30 segundos
    { duration: '1m', target: 100 }, // Escala para 100 usuários em 1 minuto
    { duration: '1m', target: 200 }, // Escala para 200 usuários em 1 minuto
    { duration: '2m', target: 300 } // Escala para 200 usuários em 1 minuto
  ]
};

// Geração de relatórios
export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data), // Relatório em HTML
    stdout: textSummary(data, { indent: ' ', enableColors: true }) // Resumo no terminal
  };
}

// Função principal
export default function () {
  const baseUrl = 'https://pokeapi.co/api/v2/';
  const endpoint = 'pokemon/ditto';
  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const OK = 200;

  // Realiza a requisição GET
  const res = http.get(`${baseUrl}${endpoint}`, params);

  // Registra a duração na métrica personalizada
  getPokemonDuration.add(res.timings.duration);

  // Adiciona à métrica de taxa de sucesso
  RateContentOK.add(res.status === OK);

  // Validações
  check(res, {
    'GET Pokémon - Status 200': () => res.status === OK,
    'GET Pokémon - Tempo < 10000ms': () => res.timings.duration < 10000,
    'GET Pokémon - Contém nome "ditto"': () => res.json('name') === 'ditto'
  });
}
