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
    // API Key aus Environment Variables holen
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY nicht gefunden in Vercel Environment Variables" },
        { status: 500 }
      );
    }

    // PDF File aus Request holen
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen" },
        { status: 400 }
      );
    }

    // PDF zu Base64 konvertieren
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Anthropic Client initialisieren
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

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

WICHTIG: Antworte STRIKT als JSON ohne Markdown-Blöcke (```), ohne Erklärungen, nur pures JSON!

Extrahiere:
- Rechnungsempfänger (Behörde ganz oben)
- Leistungsempfänger (Klient/Patient)
- Rechnungsdaten (Rechnungs-Nr, IK, Zeitraum)
- ALLE Leistungspositionen (LK-Codes + AUB)

JSON-Format:
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

    // Response extrahieren mit besserem Error-Handling
    const content = message.content[0];
    if (content.type !== "text") {
      console.error("❌ Claude returned non-text response:", content);
      return NextResponse.json(
        { error: "OCR returned invalid response type" },
        { status: 500 }
      );
    }

    const responseText = content.text;

    // JSON parsen
    let ocrResult: OCRResult;
    try {
      // Entferne mögliche Markdown-Codeblöcke
      const cleanedJson = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      console.log("🔍 Claude Response Preview:", cleanedJson.substring(0, 200));

      ocrResult = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error("❌ JSON Parse Error:", parseError);
      console.error("❌ Raw Response (first 500 chars):", responseText.substring(0, 500));
      return NextResponse.json(
        {
          error: "Failed to parse OCR response as JSON",
          details: responseText.substring(0, 200)
        },
        { status: 500 }
      );
    }

    // Validierung
    if (!ocrResult.positionen || !Array.isArray(ocrResult.positionen)) {
      return NextResponse.json(
        { error: "Keine Positionen gefunden in der Rechnung" },
        { status: 400 }
      );
    }

    // Erfolgreiche Antwort
    return NextResponse.json({
      success: true,
      data: ocrResult,
      message: `${ocrResult.positionen.length} LK-Positionen erfolgreich extrahiert`,
    });

  } catch (error: any) {
    console.error("OCR Error:", error);
    return NextResponse.json(
      { 
        error: "Fehler beim Verarbeiten der PDF",
        details: error.message 
      },
      { status: 500 }
    );
  }
}
