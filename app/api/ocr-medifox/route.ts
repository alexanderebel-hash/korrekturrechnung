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
              text: `Analysiere diese Pflegeabrechnung und extrahiere die Daten.

WICHTIG: Antworte STRIKT als JSON ohne Markdown-Blöcke, ohne Erklärungen, nur pures JSON!

Extrahiere:
- Rechnungsempfänger (Behörde ganz oben)
- Leistungsempfänger (Name, Vorname, Adresse, Pflegegrad)
- Rechnungsdaten (Rechnungsnr, IK-Nummer, Zeitraum)
- Alle Leistungspositionen (LK-Code, Bezeichnung, Menge, Preis)

Antworte nur mit diesem JSON (keine zusätzlichen Zeichen):
{
  "rechnungsempfaenger": {
    "behoerde": "Bezirksamt Mitte von Berlin",
    "standort": "Standort Wedding, Muellerstrasse 146-147",
    "plzOrt": "13344 Berlin"
  },
  "leistungsempfaenger": {
    "nachname": "Mustermann",
    "vorname": "Max",
    "adresse": "Musterstr. 1, 12345 Berlin",
    "pflegegrad": "3"
  },
  "rechnungsdaten": {
    "rechnungsNr": "123456",
    "ikNummer": "461104151",
    "abrechnungszeitraum": "2025-09-01 bis 2025-09-30"
  },
  "positionen": [
    {
      "lkCode": "LK04",
      "bezeichnung": "Große Körperpflege",
      "menge": 8,
      "einzelpreis": 34.01,
      "gesamtpreis": 272.08,
      "isAUB": false
    },
    {
      "lkCode": "AUB_LK04",
      "bezeichnung": "Ausbildungsumlage zu LK04",
      "menge": 8,
      "einzelpreis": 0.78,
      "gesamtpreis": 6.24,
      "isAUB": true
    }
  ]
}`,
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
