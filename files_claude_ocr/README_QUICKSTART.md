# 🚀 DomusVita OCR - Quick Start

## Was ist das?

Automatische Extraktion von LK-Positionen aus Medifox-Rechnungen per OCR mit Claude Sonnet 4.

---

## ⚡ Installation (2 Minuten)

### Option 1: Automatisches Setup (empfohlen)

```bash
# 1. Setup-Script ausführen
bash setup-ocr.sh

# 2. Dev-Server starten
npm run dev
```

### Option 2: Manuell

```bash
# 1. SDK installieren
npm install @anthropic-ai/sdk

# 2. Dateien kopieren
# - api-ocr-medifox.ts → app/api/ocr-medifox/route.ts
# - MedifoxOCRUpload.tsx → components/MedifoxOCRUpload.tsx

# 3. In Schritt 3 integrieren (siehe OCR_INTEGRATION_ANLEITUNG.md)
```

---

## 🔑 Vercel Environment Variable

Stelle sicher, dass du in Vercel folgende Variable gesetzt hast:

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx
```

✅ **Du hast bereits gesagt, dass das erledigt ist!**

---

## 📝 Integration in Schritt 3

### Beispiel-Code:

```tsx
import MedifoxOCRUpload from "@/components/MedifoxOCRUpload";

export default function Step3() {
  const [positionen, setPositionen] = useState([]);

  return (
    <div>
      <h3>Option A: PDF hochladen</h3>
      <MedifoxOCRUpload 
        onPositionsExtracted={(extracted) => setPositionen(extracted)} 
      />
      
      <h3>ODER</h3>
      
      <h3>Option B: Manuell eingeben</h3>
      <button onClick={addManualPosition}>+ LK hinzufügen</button>
    </div>
  );
}
```

Vollständiges Beispiel: siehe `OCR_INTEGRATION_ANLEITUNG.md`

---

## 🧪 Testing

1. **Lokal testen:**
   ```bash
   npm run dev
   ```

2. **Beispiel-PDF hochladen** (die aus den Screenshots)

3. **Erwartetes Ergebnis:**
   ```
   ✅ 10 LK-Positionen erfolgreich ausgelesen
   ```

4. **Positionen erscheinen automatisch in der Tabelle**

---

## 📦 Was wurde erstellt?

| Datei | Beschreibung |
|-------|--------------|
| `api-ocr-medifox.ts` | API-Route für OCR (Anthropic Vision) |
| `MedifoxOCRUpload.tsx` | Upload-Komponente mit UI |
| `OCR_INTEGRATION_ANLEITUNG.md` | Detaillierte Anleitung |
| `setup-ocr.sh` | Automatisches Setup-Script |
| `README_QUICKSTART.md` | Diese Datei |

---

## 🎯 Workflow

```
1. User lädt PDF hoch
   ↓
2. PDF → Base64 → Anthropic API
   ↓
3. Claude extrahiert LK-Positionen
   ↓
4. Positionen werden automatisch eingefügt
   ↓
5. User kann manuell nachbearbeiten
```

---

## ✅ Checkliste vor Deployment

- [ ] `npm install @anthropic-ai/sdk` ausgeführt
- [ ] API-Route erstellt: `app/api/ocr-medifox/route.ts`
- [ ] Komponente erstellt: `components/MedifoxOCRUpload.tsx`
- [ ] In Schritt 3 integriert
- [ ] Vercel Environment Variable `ANTHROPIC_API_KEY` gesetzt
- [ ] Lokal getestet mit `npm run dev`
- [ ] Deployment: `git push` → Vercel deployt automatisch

---

## 🚀 Deployment

```bash
git add .
git commit -m "feat: OCR für Medifox-Rechnungen"
git push
```

Vercel deployt automatisch! 🎉

---

## 💡 Features

✅ Drag & Drop Upload  
✅ PDF-Parsing mit Claude Sonnet 4  
✅ Automatische LK-Extraktion  
✅ Loading-States & Error-Handling  
✅ Glassmorphism-Design  
✅ Manuelle Nachbearbeitung möglich  

---

## 🔧 Troubleshooting

### "API Key nicht gefunden"
→ Prüfe Vercel Environment Variables

### "Keine Positionen gefunden"
→ PDF könnte nicht lesbar sein

### "Module not found: @anthropic-ai/sdk"
→ Führe `npm install @anthropic-ai/sdk` aus

---

## 📞 Support

Bei Fragen → Frag Claude! 😊

**Viel Erfolg! 🚀**
