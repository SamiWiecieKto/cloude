# 🪐 GENEZA — symulator życia planetarnego

Strategiczno-ekonomiczna gra przeglądarkowa w stylu tycoon: projektujesz planetę,
ustawiasz jej parametry (gwiazda, orbita, atmosfera, pierwiastki, geologia),
a potem obserwujesz — i podkręcasz — rozwój życia przez miliardy lat.

## Jak uruchomić

Gra to czysty HTML/JS (ES modules), więc potrzebuje dowolnego serwera statycznego:

```bash
cd geneza
python3 -m http.server 8000
# → otwórz http://localhost:8000
```

albo `npx serve .`. Nie ma żadnego builda ani zależności do instalowania —
three.js jest dołączony w `lib/`.

## Rozgrywka

1. **Faza projektowania** — wybierz preset (Ziemia 2.0, świat metanowy, piekło
   wulkaniczne, lodowy świat amoniaku, karzeł gazowy, losowa planeta) albo ustaw
   wszystko ręcznie: typ gwiazdy, odległość, masę, dobę, nachylenie osi, księżyc,
   pole magnetyczne, wulkanizm, pokrycie cieczą, ciśnienie i skład atmosfery
   (N₂/O₂/CO₂/CH₄/NH₃/H₂) oraz pierwiastki skorupy (C/N/P/S/Fe/Si).
   Panel podglądu na żywo pokazuje temperaturę, promieniowanie i **przydatność
   planety dla 8 biochemii życia**.
2. **Symulacja** — czas płynie (1×/10×/100×; 1× = 1 mln lat/s). Życie może
   powstać samo (abiogeneza), rosnąć, ewoluować przez 8 etapów (od chemii
   prebiotycznej po cywilizację), wymierać w kataklizmach.
3. **Interwencje** — za Punkty Genezy (PG) zdobywane z rozwoju życia możesz:
   zrzucać komety, siać organikę i mikroby, budzić wulkany, wzmacniać pole
   magnetyczne, sterować gazami cieplarnianymi, przyspieszać ewolucję.

## Biochemie życia

| Typ | Warunki |
|---|---|
| Węglowo-wodne | ciekła woda, umiarkowana temperatura, C+N+P |
| Amoniakalne | -80…-30°C, amoniak w atmosferze |
| Metanogeniczne | -190…-150°C, ciekły metan (à la Tytan) |
| Krzemowo-termalne | 150…600°C, krzem, wulkanizm |
| Siarkowe (chemosynteza) | kominy wulkaniczne, siarka, bez światła |
| Wodorowi pływacy | gęsta atmosfera H₂ (à la „pływacy" Sagana) |
| Radiotroficzne | silne promieniowanie + woda i węgiel |
| Plazmowo-elektryczne | ekstremalne burze i żar — bardziej zjawisko niż biologia |

## Mechaniki symulacji

- uproszczony model klimatu: nasłonecznienie, albedo, efekt cieplarniany per gaz
- promieniowanie zależne od typu gwiazdy, pola magnetycznego i atmosfery
- ucieczka atmosfery przy małej masie / słabym polu magnetycznym
- **Wielkie Utlenienie**: fotosynteza pochłania CO₂ i produkuje O₂ (zmienia klimat!)
- zdarzenia losowe: impakty, superwulkany, rozbłyski gwiazdy, epoki lodowcowe, błyski gamma
- proceduralnie generowane gatunki: nazwy, cechy i portrety SVG w galerii
- planeta 3D: proceduralne tekstury (kontynenty, lód, wegetacja — fioletowa przy
  czerwonym karle!), chmury, poświata atmosfery, światła miast przy cywilizacji;
  obrót myszą (osie X/Y), zoom kółkiem/szczypaniem

Model naukowy jest celowo uproszczony i podkręcony pod grywalność —
to popularnonaukowa piaskownica, nie symulator badawczy.
