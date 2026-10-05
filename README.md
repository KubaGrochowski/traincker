# Traincker

Dziennik treningów na siłowni w stylu RepCount: serie, ciężary i powtórzenia wpisane w kilka sekund, przerwa między seriami, plany, rekordy i wykresy. Wygląd 1:1 jak Grochu's tracker i Grochu's makro (czerń, Outfit + JetBrains Mono, morskie animacje), tylko akcent fioletowy.
Adres: https://kubagrochowski.github.io/traincker/

Czysty HTML/CSS/JS, bez budowania. Konto i synchronizacja przez ten sam projekt Supabase co tracker i makro (to samo konto e-mail + hasło). Działa offline (PWA).

## Uruchomienie lokalnie

```bash
node .claude/serve.js 5175
```

i otwórz http://localhost:5175.

## Konfiguracja Supabase (jednorazowo)

Supabase → SQL Editor → New query → wklej `supabase/setup.sql` → Run. Tworzy tabelę `gym_data` (RLS, Realtime). Bez tego aplikacja działa na urządzeniu, ale nie synchronizuje się z chmurą.

## Funkcje (jak w RepCount)

- **Trening:** pusty albo z planu. Każde ćwiczenie dostaje serie i ciężary z ostatniego razu (kolumna „Poprzednio”, klik = przepisz). Rodzaje serii: normalna, R – rozgrzewkowa (bez objętości i rekordów), D – drop set, U – do upadku. Odhaczenie ✓ startuje przerwę (domyślna w ustawieniach albo osobna dla ćwiczenia; −15/+15/Pomiń, dźwięk, wibracja, powiadomienie). Superserie (przerwa dopiero po ostatnim ćwiczeniu z grupy), notatki do ćwiczenia i treningu, zamiana i przesuwanie ćwiczeń. Nowy rekord od razu oznaczony „PR”.
- **Koniec treningu:** podsumowanie (czas, objętość, serie, rekordy), fala przez ekran przy rekordzie albo celu tygodnia, „Zaktualizuj plan”, gdy zmieniły się ćwiczenia lub liczba serii.
- **Historia:** treningi po miesiącach, wyszukiwarka, szczegóły z 1RM każdej serii, „Powtórz trening”, „Zapisz jako plan”, edycja (dzień, godzina, czas, serie) i usuwanie.
- **Plany:** własne (serie × powtórzenia, kolejność, superserie, notatka) i gotowe: Push/Pull/Legs, Góra/Dół, FBW, 5×5.
- **Ćwiczenia:** ~80 ćwiczeń po partiach + własne (ciężar × powt., masa ciała, na czas, cardio). Karta ćwiczenia: wykresy (szacowany 1RM, najcięższy, objętość, powtórzenia, serie; 3 mies./rok/wszystko), rekordy (1RM, najcięższy, objętość, tabela 1–12 powtórzeń, wszystkie lata lub rok), historia.
- **Postępy:** treningi i objętość tygodniowo (8 tyg./6 mies./rok), seria tygodni w celu, kalendarz, masa ciała z wykresem, serie na partie mięśni, lista rekordów.
- **Ustawienia (menu ⋯ / ☰):** kg/lb, domyślna przerwa, cel treningów w tygodniu, dźwięk, powiadomienia; masa ciała; eksport do Excela (CSV).

Po zmianach w plikach podbij wersję: `VERSION` w `sw.js` oraz `?v=` w `index.html` i w `SHELL` w `sw.js`.

## Struktura

- `index.html` – szkielet i ekran logowania
- `css/styles.css` – wygląd (styl trackera + część siłowni)
- `js/app.js` – logika, widoki, zapis serii, przerwa, rekordy, wykresy, animacje
- `js/cloud.js` – konto i synchronizacja (tabela `gym_data`)
- `supabase/setup.sql` – baza
- `manifest.webmanifest`, `sw.js`, `icons/` – PWA
