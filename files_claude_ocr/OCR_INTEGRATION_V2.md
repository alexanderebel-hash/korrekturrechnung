# 🎯 OCR-Integration - VERBESSERTE VERSION

## 🚀 Was wurde angepasst basierend auf der echten Rechnung:

### ✅ **Neue Features:**

1. **AUB-Extraktion** 
   - Extrahiert jetzt SOWOHL LK-Positionen ALS AUCH AUB-Positionen
   - Markierung mit `isAUB: true/false` Flag

2. **Erweiterte Metadaten**
   - Rechnungsnummer
   - Datum
   - Klient
   - Zeitraum
   - **NEU:** Pflegegrad
   - **NEU:** Debitor

3. **Dezimalzahlen-Support**
   - Unterstützt Mengen wie 4,5 oder 4.5
   - Korrekte Umwandlung in Float

4. **LK-Code-Formate**
   - Unterstützt: LK02, LK03b, LK11b, LK20.2 (mit Punkt!)
   - Unterstützt: AUB_LK02 (mit Unterstrich für AUBs)

5. **Umlaute**
   - Korrekte Extraktion von "Körperpflege", "Große", etc.

---

## 📦 Dateien im Paket:

### **Core-Dateien:**
- `api-ocr-medifox.ts` - API-Route (VERBESSERT)
- `MedifoxOCRUpload.tsx` - Basis-Komponente (VERBESSERT)
- `MedifoxOCRUploadExtended.tsx` - **NEU** mit Metadaten-Anzeige

### **Test-Dateien:**
- `OCRTestPage.tsx` - **NEU** Test-Seite zum Ausprobieren
- Vollständige Tabellen-Ansicht für LKs und AUBs

### **Dokumentation:**
- `OCR_INTEGRATION_V2.md` - Diese Datei
- `setup-ocr.sh` - Setup-Script
- `OCR_OVERVIEW.html` - Visuelle Übersicht

---

## 🧪 Quick-Test (OHNE Integration):

### Schritt 1: Test-Seite erstellen

```bash
# API-Route erstellen
mkdir -p app/api/ocr-medifox
cp api-ocr-medifox.ts app/api/ocr-medifox/route.ts

# Komponenten kopieren
mkdir -p components
cp MedifoxOCRUploadExtended.tsx components/

# Test-Seite erstellen
mkdir -p app/ocr-test
cp OCRTestPage.tsx app/ocr-test/page.tsx
```

### Schritt 2: Anthropic SDK installieren

```bash
npm install @anthropic-ai/sdk
```

### Schritt 3: Starten & Testen

```bash
npm run dev
```

Dann öffne: `http://localhost:3000/ocr-test`

---

## 📊 Was wird extrahiert aus deiner Rechnung:

### **LK-Positionen (10):**
- LK02 - Kleine Körperpflege - 9x - 17,01€ = 153,09€
- LK03b - Erweiterte große Körperpflege m. Baden - 4x - 51,02€ = 204,08€
- LK11b - Große Reinigung der Wohnung - 4,5x - 22,29€ = 100,35€
- LK12 - Wechseln u. Waschen der Kleidung - 5x - 39,62€ = 198,10€
- LK13 - Einkaufen - 3x - 19,81€ = 59,43€
- LK14 - Zubereitung warme Mahlzeit - 12x - 22,29€ = 267,48€
- LK15 - Zubereitung kleine Mahlzeit - 17x - 7,43€ = 126,31€
- LK17a - Einsatzpauschale - 21x - 5,37€ = 112,77€
- LK17b - Einsatzpauschale WE - 8x - 10,73€ = 85,84€
- LK20.2 - Häusliche Betreuung §124 SGB XI - 4x - 8,26€ = 33,04€

**Summe LK: 1.340,49€**

### **AUB-Positionen (10):**
- AUB_LK02 - 9x - 0,39€ = 3,51€
- AUB_LK03b - 4x - 1,17€ = 4,68€
- AUB_LK11b - 4,5x - 0,51€ = 2,34€
- AUB_LK12 - 5x - 0,91€ = 4,55€
- AUB_LK13 - 3x - 0,46€ = 1,38€
- AUB_LK14 - 12x - 0,51€ = 6,12€
- AUB_LK15 - 17x - 0,17€ = 2,89€
- AUB_LK17a - 21x - 0,12€ = 2,52€
- AUB_LK17b - 8x - 0,25€ = 2,00€
- AUB_LK20.2 - 4x - 0,19€ = 0,76€

**Summe AUB: 30,75€**

### **Metadaten:**
```json
{
  "rechnungsnummer": "???",
  "datum": "Berlin, [Datum]",
  "klient": "Bollweber, Roland Andreas",
  "zeitraum": "01.09.2025 - 30.09.2025",
  "pflegegrad": 2,
  "debitor": "62298"
}
```

**Gesamtsumme (Übertrag): 1.371,24€** ✅

---

## 🎯 JSON-Output Beispiel:

```json
{
  "positionen": [
    {
      "lkCode": "LK02",
      "bezeichnung": "Kleine Körperpflege",
      "menge": 9,
      "einzelpreis": 17.01,
      "gesamtpreis": 153.09,
      "isAUB": false
    },
    {
      "lkCode": "AUB_LK02",
      "bezeichnung": "Ausbildungsumlage zu LK02",
      "menge": 9,
      "einzelpreis": 0.39,
      "gesamtpreis": 3.51,
      "isAUB": true
    },
    {
      "lkCode": "LK11b",
      "bezeichnung": "Große Reinigung der Wohnung",
      "menge": 4.5,
      "einzelpreis": 22.29,
      "gesamtpreis": 100.35,
      "isAUB": false
    }
    // ... weitere 17 Positionen
  ],
  "metadata": {
    "klient": "Bollweber, Roland Andreas",
    "zeitraum": "01.09.2025 - 30.09.2025",
    "pflegegrad": 2,
    "debitor": "62298"
  }
}
```

---

## 🔧 Integration in Schritt 3:

### **Variante A: Basis (ohne Metadaten-Anzeige)**

```tsx
import MedifoxOCRUpload from "@/components/MedifoxOCRUpload";

const [positionen, setPositionen] = useState([]);

<MedifoxOCRUpload 
  onPositionsExtracted={(extracted, metadata) => {
    setPositionen(extracted);
    // Optional: metadata verwenden
  }} 
/>
```

### **Variante B: Extended (mit Metadaten-Anzeige)**

```tsx
import MedifoxOCRUploadExtended from "@/components/MedifoxOCRUploadExtended";

const [positionen, setPositionen] = useState([]);
const [metadata, setMetadata] = useState(null);

<MedifoxOCRUploadExtended
  onPositionsExtracted={(extracted, extractedMetadata) => {
    setPositionen(extracted);
    setMetadata(extractedMetadata);
  }}
  showMetadata={true}
/>
```

---

## 💡 Unterschied zwischen LKs und AUBs:

### **Filter LKs:**
```tsx
const lkPositionen = positionen.filter(p => !p.isAUB);
```

### **Filter AUBs:**
```tsx
const aubPositionen = positionen.filter(p => p.isAUB);
```

### **Summen berechnen:**
```tsx
const summeLK = lkPositionen.reduce((sum, p) => sum + p.gesamtpreis, 0);
const summeAUB = aubPositionen.reduce((sum, p) => sum + p.gesamtpreis, 0);
const gesamtsumme = summeLK + summeAUB;
```

---

## 🎨 UI-Features der Extended-Komponente:

✅ Drag & Drop Upload  
✅ Loading-Spinner  
✅ Erfolgs-/Fehlermeldungen  
✅ **NEU:** Metadaten-Box mit Klient, Zeitraum, Pflegegrad, etc.  
✅ **NEU:** Separate Zählung von LKs und AUBs  

---

## 🚀 Deployment:

```bash
git add .
git commit -m "feat: OCR mit AUB-Extraktion und Metadaten"
git push
```

Vercel deployt automatisch! 🎉

---

## 🧪 Testing-Checkliste:

- [ ] API-Route funktioniert (`/api/ocr-medifox`)
- [ ] Anthropic API Key ist in Vercel gesetzt
- [ ] PDF-Upload funktioniert
- [ ] LK-Positionen werden extrahiert (10 Stück)
- [ ] AUB-Positionen werden extrahiert (10 Stück)
- [ ] Metadaten werden extrahiert (Klient, Zeitraum, etc.)
- [ ] Summen sind korrekt (1.371,24€)
- [ ] Dezimalzahlen funktionieren (4,5x)
- [ ] LK20.2 wird korrekt erkannt (mit Punkt)

---

## 🎯 Nächste Schritte:

1. ✅ Test-Seite ausprobieren (`/ocr-test`)
2. ✅ Mit echter Rechnung testen
3. ✅ In Schritt 3 integrieren
4. 🚀 Deployment

**Viel Erfolg! 🚀**
