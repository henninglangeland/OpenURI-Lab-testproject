# URI‑Verksted

Bygg, test og **åpne apper via URI‑protokoller** – og **eksporter en ferdig, statisk HTML** til sluttbrukere.

## Mappestruktur
```
/ (repo‑rot)
├─ index.html
├─ /css/styles.css
├─ /js/helpers.js
├─ /js/app.js
├─ /data/templates.json
└─ /assets/   (valgfritt for ikoner)
```

## Bruk
1. Åpne `index.html` (f.eks. via GitHub Pages).
2. Velg *Handling* og *Protokoll/App*.
3. Fyll inn felter (payload, subject, body, osv.).
4. Klikk **Kjør** for å åpne appen.
5. Klikk **Legg til i mine snarveier** for å bygge en liste.
6. **Eksporter** → genererer en **nedlastbar HTML** som inneholder dine snarveier.
   - *Editable*: sluttbruker kan skrive inn verdier (payload, tekst).
   - *Fixed*: snapshot av dine felter – knappene åpner **fastlåste** URIer.

## Permalenker
Appen støtter URL‑parametre for forhåndsutfylling: `action, template, payload, subject, body, cc, bcc, query, lat, lng, label, customName, customScheme, autorun, encode`.

Eksempel:
```
index.html?action=Telefoni&template=tel&payload=47910303&autorun=1
```

## GitHub Pages
- Commit/push alt til hovedbranch.
- I repoets **Settings → Pages**: Publiser fra `main` / root eller `/docs`.
- Åpne den publiserte URLen for å bruke appen.

## Tilpasning
- Legg til nye maler i `data/templates.json`. Støttede plassholdere er:
  `{payload} {subject} {body} {cc} {bcc} {query} {lat} {lng} {label}`.
- «Egendefinert schema» feltet i UI lar deg teste helt egne URIer (f.eks. `myapp://open?x={payload}`).

## Sikkerhet & begrensninger
- Nettlesere krever ofte **brukerklikk** for å åpne eksterne apper.
- Noen protokoller fungerer kun på spesifikke OS. Appen filtrerer etter OS der mulig.
- Det er vanskelig å 100 % detektere om en app faktisk åpnet – vis fallback/hint ved behov.
- Autorun via querystring bør brukes varsomt.

## Lisens
MIT
