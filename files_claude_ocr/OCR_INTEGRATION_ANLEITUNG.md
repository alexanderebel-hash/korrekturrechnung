# 🚀 OCR-Integration für Medifox-Rechnungen

## 📦 Was wurde erstellt:

### 1. API-Route: `/api/ocr-medifox/route.ts`
- Verarbeitet PDF-Uploads
- Nutzt Anthropic Vision API (Claude Sonnet 4)
- Extrahiert automatisch LK-Positionen

### 2. Komponente: `MedifoxOCRUpload.tsx`
- Drag & Drop Upload-Bereich
- Upload-Status-Anzeige
- Automatische Positions-Extraktion

---

## 🔧 Installation in dein Projekt:

### Schritt 1: API-Route hinzufügen

Erstelle die Datei `app/api/ocr-medifox/route.ts`:
```bash
mkdir -p app/api/ocr-medifox
cp /home/claude/api-ocr-medifox.ts app/api/ocr-medifox/route.ts
```

### Schritt 2: Anthropic SDK installieren

```bash
npm install @anthropic-ai/sdk
```

### Schritt 3: Komponente hinzufügen

Kopiere `MedifoxOCRUpload.tsx` in dein `components`-Verzeichnis:
```bash
cp /home/claude/MedifoxOCRUpload.tsx components/MedifoxOCRUpload.tsx
```

### Schritt 4: Vercel Environment Variable prüfen

Stelle sicher, dass in Vercel folgende Variable gesetzt ist:
```
ANTHROPIC_API_KEY=dein_api_key_hier
```

✅ Laut deiner Aussage ist das bereits erledigt!

---

## 📝 Integration in Schritt 3

### Beispiel: Hauptkomponente anpassen

```tsx
"use client";

import { useState } from "react";
import MedifoxOCRUpload from "@/components/MedifoxOCRUpload";

interface MedifoxPosition {
  lkCode: string;
  bezeichnung: string;
  menge: number;
  einzelpreis: number;
  gesamtpreis: number;
}

export default function Step3MedifoxRechnung() {
  const [positionen, setPositionen] = useState<MedifoxPosition[]>([]);

  // Callback wenn OCR fertig ist
  const handlePositionsExtracted = (extractedPositionen: MedifoxPosition[]) => {
    setPositionen(extractedPositionen);
  };

  // Manuelle Position hinzufügen
  const addManualPosition = () => {
    setPositionen([
      ...positionen,
      {
        lkCode: "",
        bezeichnung: "",
        menge: 0,
        einzelpreis: 0,
        gesamtpreis: 0,
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-purple-700">
        Schritt 3: Medifox-Rechnung (Originalrechnung)
      </h2>

      {/* OPTION A: OCR-Upload */}
      <div>
        <h3 className="text-lg font-semibold mb-3">
          Option A: PDF hochladen (automatisch)
        </h3>
        <MedifoxOCRUpload onPositionsExtracted={handlePositionsExtracted} />
      </div>

      {/* ODER-Trennlinie */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500 font-medium">ODER</span>
        </div>
      </div>

      {/* OPTION B: Manuelle Eingabe */}
      <div>
        <h3 className="text-lg font-semibold mb-3">
          Option B: Manuell eingeben
        </h3>
        <button
          onClick={addManualPosition}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
        >
          + LK hinzufügen
        </button>
      </div>

      {/* Positionen-Tabelle */}
      {positionen.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">
            Rechnungspositionen aus Medifox (wie erbracht):
          </h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-purple-100">
                <th className="border p-2">LK-Code</th>
                <th className="border p-2">Bezeichnung</th>
                <th className="border p-2">Menge</th>
                <th className="border p-2">Preis</th>
                <th className="border p-2">Gesamt</th>
                <th className="border p-2">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {positionen.map((pos, idx) => (
                <tr key={idx}>
                  <td className="border p-2">
                    <input
                      type="text"
                      value={pos.lkCode}
                      onChange={(e) => {
                        const newPositionen = [...positionen];
                        newPositionen[idx].lkCode = e.target.value;
                        setPositionen(newPositionen);
                      }}
                      className="w-full p-2 border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="text"
                      value={pos.bezeichnung}
                      onChange={(e) => {
                        const newPositionen = [...positionen];
                        newPositionen[idx].bezeichnung = e.target.value;
                        setPositionen(newPositionen);
                      }}
                      className="w-full p-2 border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="number"
                      value={pos.menge}
                      onChange={(e) => {
                        const newPositionen = [...positionen];
                        newPositionen[idx].menge = parseFloat(e.target.value);
                        setPositionen(newPositionen);
                      }}
                      className="w-full p-2 border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="number"
                      step="0.01"
                      value={pos.einzelpreis}
                      onChange={(e) => {
                        const newPositionen = [...positionen];
                        newPositionen[idx].einzelpreis = parseFloat(e.target.value);
                        setPositionen(newPositionen);
                      }}
                      className="w-full p-2 border rounded"
                    />
                  </td>
                  <td className="border p-2 font-semibold">
                    {(pos.menge * pos.einzelpreis).toFixed(2)} EUR
                  </td>
                  <td className="border p-2 text-center">
                    <button
                      onClick={() => {
                        setPositionen(positionen.filter((_, i) => i !== idx));
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

---

## 🎯 Wie es funktioniert:

### 1. User lädt PDF hoch
```
Medifox-Rechnung.pdf → Upload-Komponente
```

### 2. OCR-Verarbeitung
```
PDF → Base64 → Anthropic Vision API → Strukturierte Daten
```

### 3. Automatische Extraktion
```json
{
  "positionen": [
    {
      "lkCode": "LK04",
      "bezeichnung": "Grosse Koerperpflege",
      "menge": 2,
      "einzelpreis": 34.01,
      "gesamtpreis": 68.02
    },
    {
      "lkCode": "LK11B",
      "bezeichnung": "Grosse Reinigung der Wohnung",
      "menge": 5,
      "einzelpreis": 22.29,
      "gesamtpreis": 111.45
    }
  ]
}
```

### 4. Positionen werden eingefügt
Die extrahierten LK-Positionen werden automatisch in die Tabelle eingefügt.

---

## 📊 Was wird extrahiert:

✅ **LK-Codes** (LK04, LK11B, LK12, etc.)  
✅ **Bezeichnungen** (z.B. "Grosse Koerperpflege")  
✅ **Mengen** (Anzahl der erbrachten Leistungen)  
✅ **Einzelpreise** (AUB-Preise)  
✅ **Gesamtpreise** (berechnet)  

❌ **NICHT extrahiert:** AUB-Zeilen (werden automatisch berechnet)

---

## 🔐 Sicherheit:

- PDF-Upload wird im Browser zu Base64 konvertiert
- Keine Speicherung der PDF auf dem Server
- Anthropic API Key ist nur auf Vercel verfügbar
- Edge Runtime für schnelle Verarbeitung

---

## 🎨 UI-Features:

- Drag & Drop Upload
- Loading-Spinner während OCR
- Erfolgs-/Fehlermeldungen
- Glassmorphism-Design passend zur App
- Automatisches Einfügen der Positionen

---

## 🚀 Deployment:

```bash
# Dateien in dein Repo kopieren
git add .
git commit -m "feat: OCR für Medifox-Rechnungen"
git push

# Vercel deployt automatisch!
```

---

## 📱 Testing:

1. Lokales Testing:
```bash
npm run dev
```

2. PDF hochladen (z.B. deine Beispiel-Rechnung)
3. OCR sollte LK-Positionen extrahieren
4. Positionen erscheinen automatisch in der Tabelle

---

## 🔧 Troubleshooting:

### "ANTHROPIC_API_KEY nicht gefunden"
→ Prüfe Vercel Environment Variables

### "Keine Positionen gefunden"
→ PDF könnte nicht lesbar sein oder falsches Format

### "Fehler beim Parsen"
→ Claude hat unstrukturierte Antwort gegeben (sehr selten)

---

## 💡 Nächste Schritte:

1. ✅ API-Route erstellen
2. ✅ Komponente einbauen
3. ✅ In Schritt 3 integrieren
4. 🚀 Deployment auf Vercel

**Fertig! 🎉**
