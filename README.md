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
- **Ekran treningu:** u góry ⌄ (zwiń), **Zakończ**, data i czas trwania, ⏰ timer i ⋯ (notatka, odrzuć). Karty ćwiczeń z seriami **Kg / Powt. / Notatka**; szare liczby to wynik z ostatniego razu — dotknięcie numeru serii wpisuje go od razu. ⋯ przy serii: rozgrzewkowa (R), drop set (↓), do upadku (U), wyczyść, usuń. Pod kartą: **Dodaj serię**, notatka, wykres, rekordy. Superserie w jednej karcie (A, B… i serie A1, B1, A2…). Rekord oznaczony gwiazdką. Po wpisaniu serii startuje przerwa (duże koło, −15 s / stop / +15 s, dźwięk, wibracja, powiadomienie).
- **Plany:** lista planów i gotowe podziały (Push/Pull/Legs, Góra/Dół, FBW, 5×5). Ekran planu: duży przycisk **Start!**, nazwa, „Ciężary i powtórzenia: Ostatnie / Z tego planu”, notatka, ćwiczenia z liczbą serii rozgrzewkowych i roboczych.
- **Ćwiczenia:** biblioteka ~80 ćwiczeń po partiach + własne. Ekran ćwiczenia: **Historia** (każdy trening: tabela serii i pasek Powt. / Serie / 1RM / Objętość), **Wykres** (szacowany 1RM, najcięższy, objętość, powtórzenia, serie; linia trendu, dotknij wykresu, by wybrać trening; historia rekordów), **Rekordy** (rekordy powtórzeń, inne rekordy, podział na lata).
- **Postępy:** cel tygodnia (koło z wodą), treningi i objętość tygodniowo, kalendarz, masa ciała, partie mięśni, pobite rekordy.
- **Więcej:** konto, kg/lb, przerwa, timer po każdej serii, dźwięk, powiadomienia, cel tygodnia, masa ciała, eksport CSV.

Po zmianach w plikach podbij wersję: `VERSION` w `sw.js` oraz `?v=` w `index.html` i w `SHELL` w `sw.js`.

## Struktura

- `index.html` – szkielet i ekran logowania
- `css/styles.css` – wygląd (styl trackera + część siłowni)
- `js/app.js` – logika, widoki, zapis serii, przerwa, rekordy, wykresy, animacje
- `js/cloud.js` – konto i synchronizacja (tabela `gym_data`)
- `supabase/setup.sql` – baza
- `manifest.webmanifest`, `sw.js`, `icons/` – PWA
