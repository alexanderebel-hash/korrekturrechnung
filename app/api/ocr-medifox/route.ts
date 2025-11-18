import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 60;

// Type definitions für die LK-Positionen
interface MedifoxPosition {
  lkCode: string;
  bezeichnung: string;
  menge: number;
  einzelpreis: number;
  gesamtpreis: number;
  isAUB?: boolean;
}

interface OCRResult {
  positionen: MedifoxPosition[];
  rechnungsempfaenger?: {
    behoerde?: string;
    standort?: string;
    plzOrt?: string;
  };
  leistungsempfaenger?: {
    nachname?: string;
    vorname?: string;
    adresse?: string;
    pflegegrad?: string;
  };
  rechnungsdaten?: {
    rechnungsNr?: string;
    ikNummer?: string;
    abrechnungszeitraum?: string;
  };
  // Legacy metadata (backwards compatibility)
  metadata?: {
    rechnungsnummer?: string;
    datum?: string;
    klient?: string;
    zeitraum?: string;
    pflegegrad?: number;
    debitor?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 OCR API: Request received');

    // API Key aus Environment Variables holen
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error('❌ OCR API: No API key found');
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY nicht gefunden in Vercel Environment Variables" },
        { status: 500 }
      );
    }
    console.log('🔍 OCR API: API key found');

    // PDF File aus Request holen
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      console.error('❌ OCR API: No file provided');
      return NextResponse.json(
        { error: "Keine Datei hochgeladen" },
        { status: 400 }
      );
    }

    console.log('🔍 OCR API: File received:', file.name, 'Size:', file.size);

    // PDF zu Base64 konvertieren
    const arrayBuffer = await file.arrayBuffer();
    console.log('🔍 OCR API: PDF bytes read:', arrayBuffer.byteLength);

    // Edge-Runtime hat kein Buffer: ArrayBuffer nach Base64 konvertieren
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.byteLength; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    console.log('🔍 OCR API: Base64 length:', base64.length);

    // Anthropic Client initialisieren
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    console.log('🔍 OCR API: Calling Claude API...');

    // Claude Vision API aufrufen mit strukturiertem Prompt
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: `Du bist ein Experte für deutsche Pflegerechnungen nach SGB XI/XII.

AUFGABE: Extrahiere ALLE Daten aus dieser Medifox-Rechnung.

🚨 KRITISCHE REGELN FÜR JSON:
1. Deine Antwort MUSS ausschließlich valides JSON sein
2. KEIN Text vor oder nach dem JSON-Objekt
3. KEINE Markdown-Formatierung (keine \`\`\`json)
4. KEINE Erklärungen oder Kommentare
5. Nur das pure JSON-Objekt!

📊 WICHTIG - ZWEI ANZAHL-SPALTEN:
Die Rechnung hat oft zwei Anzahl-Spalten:
- "Anzahl" = ursprünglich erbracht (IGNORIEREN!)
- "Abr. Anz." = tatsächlich abgerechnet (VERWENDEN!)

Verwende IMMER "Abr. Anz." als menge-Wert.
Falls nur eine Anzahl-Spalte existiert, verwende diese.

BEISPIEL für problematische Zeile:
LK07b | Darm- u. Blasenentleerung | 20,00 | 19,00 | 17,01 | 323,19
                                     ↑ Anzahl  ↑ Abr.Anz
→ Verwende menge: 19.0 (aus "Abr. Anz.")

📋 ZU EXTRAHIERENDE DATEN:

1. RECHNUNGSEMPFÄNGER (ganz oben):
   - Behörde (z.B. "Bezirksamt Mitte von Berlin")
   - Standort (z.B. "Standort Wedding, Muellerstrasse 146-147")
   - PLZ/Ort (z.B. "13344 Berlin")

2. LEISTUNGSEMPFÄNGER:
   - Nachname (z.B. "Bollweber")
   - Vorname (z.B. "Roland Andreas")
   - Adresse (Straße + Hausnr. + PLZ Ort)
   - Pflegegrad (als String, z.B. "2")

3. RECHNUNGSDATEN:
   - Rechnungsnummer
   - IK-Nummer (z.B. "461104151")
   - Abrechnungszeitraum (Format: "YYYY-MM-DD bis YYYY-MM-DD")

4. POSITIONEN:
   Extrahiere ALLE Zeilen inklusive:
   - Alle AUB-Positionen (formatiere als "AUB_LK02", "AUB_LK07a")
   - Alle LK-Positionen (z.B. "LK02", "LK07a", "LK20.2")
   - ZINV (Investitionskosten) als eigene Position

Für jede Position extrahiere:
- lkCode: String (z.B. "LK02", "AUB_LK04", "LK20.2", "ZINV")
- bezeichnung: String (vollständiger Text)
- menge: Number (IMMER aus "Abr. Anz." Spalte!)
- einzelpreis: Number (als Dezimalzahl, z.B. 17.01)
- gesamtpreis: Number (als Dezimalzahl)
- isAUB: Boolean (true wenn lkCode mit "AUB" beginnt)

🎯 EXAKTE JSON-STRUKTUR (so ausgeben):
{
  "rechnungsempfaenger": {
    "behoerde": "Bezirksamt Lichtenberg von Berlin",
    "standort": "Amt für Soziales",
    "plzOrt": "10360 Berlin"
  },
  "leistungsempfaenger": {
    "nachname": "Nakoinz",
    "vorname": "Horst Peter",
    "adresse": "Waldemarstr. 12, 10999 Berlin",
    "pflegegrad": "2"
  },
  "rechnungsdaten": {
    "rechnungsNr": "98765",
    "ikNummer": "461104096",
    "abrechnungszeitraum": "2025-04-01 bis 2025-04-30"
  },
  "positionen": [
    {
      "lkCode": "AUB_LK02",
      "bezeichnung": "Ausbildungsumlage zu LK02",
      "menge": 1.0,
      "einzelpreis": 0.39,
      "gesamtpreis": 0.39,
      "isAUB": true
    },
    {
      "lkCode": "LK02",
      "bezeichnung": "LK02 Kleine Körperpflege",
      "menge": 1.0,
      "einzelpreis": 17.01,
      "gesamtpreis": 17.01,
      "isAUB": false
    },
    {
      "lkCode": "LK07b",
      "bezeichnung": "LK07b Darm- und Blasenentleerung erweitert",
      "menge": 19.0,
      "einzelpreis": 17.01,
      "gesamtpreis": 323.19,
      "isAUB": false
    },
    {
      "lkCode": "ZINV",
      "bezeichnung": "Investitionskosten 3,38 %",
      "menge": 1.0,
      "einzelpreis": 65.43,
      "gesamtpreis": 65.43,
      "isAUB": false
    }
  ]
}

⚠️ WICHTIGE HINWEISE:
- Kommazahlen als Dezimalzahlen: 19.5 (nicht "19,5")
- LK20.2 bleibt "LK20.2" (MIT Punkt!)
- Bei fehlenden Daten: null verwenden
- ZINV muss mit extrahiert werden
- AUBs immer mit "AUB_" Prefix

NOCHMAL: Antworte AUSSCHLIESSLICH mit dem JSON-Objekt oben. Nichts davor, nichts danach!`,
            },
          ],
        },
      ],
    });

    console.log('🔍 OCR API: Claude responded');

    // Response extrahieren mit besserem Error-Handling
    const content = message.content[0];
    console.log('🔍 OCR API: Response type:', content.type);

    if (content.type !== "text") {
      console.error("❌ OCR API: Non-text response:", content);
      return NextResponse.json(
        { error: "OCR returned invalid response type" },
        { status: 500 }
      );
    }

    const responseText = content.text;
    console.log('🔍 OCR API: Raw response (first 300 chars):', responseText.substring(0, 300));

    // ROBUSTER JSON-Parser mit mehreren Strategien
    let cleanedText = responseText.trim();

    // Strategie 1: Finde JSON-Block mit Regex (findet JSON auch wenn Text drumherum ist)
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
      console.log('🔍 OCR API: JSON via Regex gefunden');
    } else {
      // Strategie 2: Entferne Markdown-Blöcke
      cleanedText = cleanedText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      console.log('🔍 OCR API: Markdown entfernt');
    }

    console.log("🔍 OCR API: Cleaned response (first 300 chars):", cleanedText.substring(0, 300));

    // JSON parsen
    let ocrResult: OCRResult;
    try {
      ocrResult = JSON.parse(cleanedText);
      console.log('🔍 OCR API: JSON parsed successfully');
      console.log('🔍 OCR API: Positionen count:', ocrResult.positionen?.length || 0);
    } catch (parseError) {
      console.error("❌ OCR API: JSON Parse Error:", parseError);
      console.error("❌ OCR API: Cleaned text (first 300 chars):", cleanedText.substring(0, 300));
      console.error("❌ OCR API: Original text (first 500 chars):", responseText.substring(0, 500));
      console.error("❌ OCR API: Full response:", responseText);
      return NextResponse.json(
        {
          error: "Failed to parse OCR response as JSON",
          hint: "Claude returned text instead of JSON",
          preview: responseText.substring(0, 200)
        },
        { status: 500 }
      );
    }

    // Validierung
    if (!ocrResult.positionen || !Array.isArray(ocrResult.positionen)) {
      console.error('❌ OCR API: No positionen array found');
      return NextResponse.json(
        { error: "Keine Positionen gefunden in der Rechnung" },
        { status: 400 }
      );
    }

    console.log('🔍 OCR API: Validation passed, returning data');

    // Erfolgreiche Antwort
    return NextResponse.json({
      success: true,
      data: ocrResult,
      message: `${ocrResult.positionen.length} LK-Positionen erfolgreich extrahiert`,
    });

  } catch (error: any) {
    console.error("❌ OCR API: Fatal error:", error);
    console.error("❌ OCR API: Error stack:", error.stack);
    return NextResponse.json(
      {
        error: "Fehler beim Verarbeiten der PDF",
        details: error.message
      },
      { status: 500 }
    );
  }
}
