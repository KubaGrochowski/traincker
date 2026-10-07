# Traincker

Dziennik treningów na siłowni w stylu RepCount: serie, ciężary i powtórzenia wpisane w kilka sekund, przerwa między seriami, plany, rekordy i wykresy. Wygląd 1:1 jak Grochu's tracker i Grochu's makro (czerń, Outfit + JetBrains Mono, morskie animacje), akcent żółty jak w logo.
Adres: https://kubagrochowski.github.io/traincker/

Czysty HTML/CSS/JS, bez budowania. Konto i synchronizacja przez ten sam projekt Supabase co tracker i makro (to samo konto e-mail + hasło). Działa offline (PWA).

## Uruchomienie lokalnie

```bash
node .claude/serve.js 5175
```

i otwórz http://localhost:5175.

## Konfiguracja Supabase (jednorazowo)

Supabase → SQL Editor → New query → wklej `supabase/setup.sql` → Run. Tworzy tabelę `gym_data` (RLS, Realtime). Bez tego aplikacja działa na urządzeniu, ale nie synchronizuje się z chmurą.

## Układ (jak RepCount)

Dolny pasek: **Treningi · Plany · Ćwiczenia · Postępy · Więcej**. Akcent żółty jak w logo, wygląd jak Grochu's tracker (czerń, Outfit + JetBrains Mono, fale).

- **Treningi:** dziennik treningów po miesiącach (data, nazwa, ćwiczenia z „3 × 100 kg”, serie, objętość, rekordy), wyszukiwarka, przycisk **+** = nowy trening (pusty albo z planu). Trwający trening można zwinąć — pasek „Wróć” nad zakładkami.
- **Ekran treningu:** u góry ⌄ (zwiń), **Zakończ** na środku, ⏰ timer i ⋯ (notatka, odrzuć), pod nimi czas trwania. Karty ćwiczeń z seriami **Kg / Powt. / Notatka**; szare liczby to wynik z ostatniego razu — dotknięcie numeru serii wpisuje go od razu. ⋯ przy serii: rozgrzewkowa (R), drop set (↓), do upadku (U), wyczyść, usuń. Pod kartą: **Dodaj serię**, notatka, wykres, rekordy. Superserie w jednej karcie (A, B… i serie A1, B1, A2…). Rekord oznaczony gwiazdką. Po wpisaniu serii startuje przerwa: duże koło, do wyboru tylko 1:00 / 2:00 / 3:00, stop; na koniec wibracja (Android), dźwięk i powiadomienie.
- **Plany:** lista planów i gotowe podziały (Push/Pull/Legs, Góra/Dół, FBW, 5×5). Ekran planu: duży przycisk **Start!**, nazwa, „Ciężary i powtórzenia: Ostatnie / Z tego planu”, notatka, ćwiczenia z liczbą serii rozgrzewkowych i roboczych.
- **Ćwiczenia:** 876 ćwiczeń z [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domena publiczna; nazwy i opisy po angielsku) + własne. Filtry: mięsień i sprzęt/typ. Ekran ćwiczenia: **mapa mięśni** (przód i tył; główne na żółto, pomocnicze jaśniej), **Historia**, **Wykres** (szacowany 1RM, najcięższy, objętość, powtórzenia, serie; linia trendu; historia rekordów), **Rekordy** (rekordy powtórzeń, inne, podział na lata), **Opis** (zdjęcia startu i końca ruchu, sprzęt, poziom, instrukcja). Własne ćwiczenie: mięśnie zaznacza się na mapie (dotknięcie: główny → pomocniczy → brak).
- **Postępy:** cel tygodnia (koło z wodą), treningi i objętość tygodniowo, kalendarz, masa ciała, mapa cieplna mięśni (główny 1 seria, pomocniczy ½), pobite rekordy.
- **Więcej:** konto, kg/lb, przerwa, timer po każdej serii, dźwięk, powiadomienia, cel tygodnia, masa ciała, eksport CSV.

Po zmianach w plikach podbij wersję: `VERSION` w `sw.js` oraz `?v=` w `index.html` i w `SHELL` w `sw.js`.

## Struktura

- `index.html` – szkielet i ekran logowania
- `css/styles.css` – wygląd (styl trackera + część siłowni)
- `js/exercises.js` – baza ćwiczeń (wygenerowana z free-exercise-db), `data/instructions.json` – instrukcje (wczytywane przy otwarciu opisu)
- `js/app.js` – logika, widoki, zapis serii, przerwa, rekordy, wykresy, animacje
- `js/cloud.js` – konto i synchronizacja (tabela `gym_data`)
- `supabase/setup.sql` – baza
- `manifest.webmanifest`, `sw.js`, `icons/` – PWA
