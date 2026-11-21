# Kompas Kompetencji — front

Angular 22. Prowadzi kierownika przez pierwszą ocenę i ocenę okresową w służbie cywilnej krok po kroku,
z asystentem AI odpowiadającym na podstawie źródeł. Backend: [kk_rag](https://github.com/magdalenasztuk/kk_rag)
(FastAPI + RAG + Claude).

## Uruchomienie

```bash
npm install
npm start            # http://127.0.0.1:4300, /api → backend na http://127.0.0.1:8000 (proxy.conf.json)
npm start -- -c mock # bez backendu: dane demo i asystent offline w przeglądarce (localStorage)
```

Każda przeglądarka dostaje własną przestrzeń roboczą danych demo (nagłówek `X-Kompas-Workspace`,
id w localStorage `kompas.workspace`) — usunięcie klucza zaczyna demo od nowa.

## Build i wdrożenie

```bash
npm run build                 # produkcja: prawdziwy backend pod /api
npx ng build -c mock          # statyczne demo bez backendu
```

Na Vercelu `vercel.json` przekierowuje `/api/:path*` na projekt backendu
(`https://kompas-kompetencji-api.vercel.app`) — przy innej domenie backendu zmień ten adres.

## Zgodność z backendem

`npm run parity:trace -- <flow.json> <expected.json>` odtwarza scenariusz żądań na backendzie
demonstracyjnym frontu; backend porównuje z nim swoje odpowiedzi (`kk_rag/tests/test_parity.py`).

## Testy i lint

```bash
npx ng test
npx ng lint
```
