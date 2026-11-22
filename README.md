# Kompas Kompetencji

Aplikacja do prowadzenia pierwszej oceny i oceny okresowej w służbie cywilnej.
Kierownik przechodzi proces krok po kroku (stanowisko i OSP, kryteria, rozmowa wstępna,
obserwacje, rozmowa oceniająca, oceny cząstkowe, arkusz). Kadry widzą przebieg procesów,
terminy i przypomnienia. Asystent odpowiada na pytania o procedurę wyłącznie na podstawie
źródeł prawnych i poradników, z cytatami.

Backend API: [kk_rag](https://github.com/magdalenasztuk/kk_rag).

## Produkcja (Vercel)

| | Adres |
|---|---|
| Aplikacja | https://kompas-kompetencji.vercel.app |
| API | https://kompas-kompetencji-api.vercel.app |

Front na Vercelu przekierowuje `/api/*` na backend (`vercel.json`). Dane demo są we
wspólnej przestrzeni `default` (Postgres) — zmiany widać na wszystkich stanowiskach.

## Konta demonstracyjne

Logowanie: https://kompas-kompetencji.vercel.app/logowanie

| Rola | Login | Hasło |
|------|-------|-------|
| Oceniający (Piotr Zieliński) | `piotr` | `piotr` |
| Kadry / HR (Marta Wiśniewska) | `marta` | `marta` |

W menu konta jest **Przywróć dane startowe** — wraca do zestawu demonstracyjnego
(pracownicy i oceny seedowe).

## Uruchomienie lokalne

```bash
npm install
npm start            # http://127.0.0.1:4300 — proxy /api → lokalny backend :8000
npm start -- -c mock # bez backendu: dane i asystent w przeglądarce (localStorage)
```

Backend lokalnie: zobacz README w `kk_rag` (`uvicorn` na porcie 8000).

## Build

```bash
npm run build                 # produkcja (API przez /api)
npx ng build -c mock          # statyczne demo bez backendu
```
