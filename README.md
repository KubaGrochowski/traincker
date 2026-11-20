# Traincker

Dziennik treningów na siłowni w stylu RepCount: serie, ciężary i powtórzenia wpisane w kilka sekund, przerwa między seriami, plany, rekordy i wykresy. Motyw „Bordeaux”: tło #1B1416, karty #261C1F, tekst #F2E6D8 / #A8958A, akcent #8E2A3B, nagłówki Fraunces, tekst i liczby Inter; płasko (bez gradientów i cieni, zaokrąglenia 8px), krótkie animacje 150–250 ms.
Adres: https://kubagrochowski.github.io/traincker/

Na komputerze aplikacja wyświetla się w ramce iPhone’a 13 (390 × 844 pkt, zmniejsza się w niskim oknie).

Czysty HTML/CSS/JS, bez budowania. Konto i synchronizacja przez ten sam projekt Supabase co tracker i makro (to samo konto e-mail + hasło). Działa offline (PWA).

## Uruchomienie lokalnie

```bash
node .claude/serve.js 5175
```

i otwórz http://localhost:5175.

## Konfiguracja Supabase (jednorazowo)

Supabase → SQL Editor → New query → wklej `supabase/setup.sql` → Run. Tworzy tabelę `gym_data` (RLS, Realtime). Bez tego aplikacja działa na urządzeniu, ale nie synchronizuje się z chmurą.

## Układ (jak RepCount, uproszczony)

Dolny pasek: **Treningi · Plany · Postępy**, ustawienia pod zębatką w rogu. Wiersze oddzielone cienką linią zamiast kart.

- **Treningi:** dziennik treningów po miesiącach (data, nazwa, ćwiczenia z „3 × 100 kg”), wyszukiwarka, przycisk **+** = nowy trening (pusty albo z planu). Trwający trening można zwinąć — pasek „Wróć” nad zakładkami.
- **Ekran treningu:** ⌄ (zwiń), **Zakończ**, ⏰ timer i ⋯, pod nimi czas trwania. Serie **Kg / Powt. / Notatka**; szare liczby to wynik z ostatniego razu (dotknięcie numeru serii wpisuje go), wpisanie samych powtórzeń uzupełnia ciężar, „Dodaj serię” przenosi ciężar z poprzedniej. ⋯ przy serii: rozgrzewkowa, drop set, do upadku, usuń. Superserie (A1, B1…). Po wpisaniu serii od dołu wysuwa się „Przerwa?” — „Tak” włącza czas z ustawień (1:00 / 2:00 / 3:00). Po zakończeniu: czas i rekordy („stary wynik › dziś nowy”).
- **Plany:** lista planów (≡ = przesuń, przytrzymanie = usuń), ekran planu z przyciskiem **Start!**.
- **Ćwiczenia:** 876 ćwiczeń z [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domena publiczna), nazwy po polsku albo angielsku (flaga w ustawieniach), filtr mięśni, własne ćwiczenia. Ekran ćwiczenia: mapa mięśni, Historia, Wykres, Rekordy, Opis.
- **Postępy:** cel tygodnia (dotknięcie = zmiana celu), kalendarz, mapa mięśni z 8 tygodni.
- **Ustawienia:** język nazw ćwiczeń (🇵🇱 / 🇬🇧), kg/lb, przerwa, pytanie o przerwę, konto.

Po zmianach w plikach podbij wersję: `VERSION` w `sw.js` oraz `?v=` w `index.html` i w `SHELL` w `sw.js`.

## Struktura

- `index.html` – szkielet i ekran logowania
- `css/styles.css` – wygląd (styl trackera + część siłowni)
- `js/exercises.js` – baza ćwiczeń (wygenerowana z free-exercise-db), `js/exercises-pl.js` – polskie nazwy, `data/instructions.json` – instrukcje (wczytywane przy otwarciu opisu)
- `js/app.js` – logika, widoki, zapis serii, przerwa, rekordy, wykresy, animacje
- `js/cloud.js` – konto i synchronizacja (tabela `gym_data`)
- `supabase/setup.sql` – baza
- `manifest.webmanifest`, `sw.js`, `icons/` – PWA
