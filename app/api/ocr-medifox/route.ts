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
              text: `Extrahiere aus dieser Pflegeabrechnung ALLE folgenden Informationen:

1. RECHNUNGSEMPFÄNGER (steht ganz oben, Adressat der Rechnung):
   - Behördenname (z.B. "Bezirksamt Mitte von Berlin")
   - Standort/Abteilung (z.B. "Standort Wedding, Muellerstrasse 146-147")
   - PLZ und Ort (z.B. "13344 Berlin")

2. LEISTUNGSEMPFÄNGER (Klient/Patient):
   - Nachname
   - Vorname
   - Vollständige Adresse als EIN String (z.B. "Hartriegelstr. 132, 12439 Berlin")
   - Pflegegrad (nur die Zahl)

3. RECHNUNGSDATEN:
   - Rechnungsnummer (steht nach "Rechnung Nr.:")
   - IK-Nummer (steht nach "IK:")
   - Abrechnungszeitraum (Format: "2025-09-01 bis 2025-09-30")

4. ALLE LEISTUNGSPOSITIONEN:
   - LK-Code (z.B. LK04, LK11a, LK20.2)
   - Bezeichnung
   - Anzahl/Menge
   - Einzelpreis
   - Gesamtpreis

   WICHTIG:
   - Erfasse ALLE Positionen, auch ZINV
   - Erfasse SOWOHL LK-Positionen ALS AUCH AUB-Positionen
   - Bei LK-Codes mit Punkt (z.B. LK20.2) den Punkt beibehalten
   - Achte auf Dezimalzahlen bei Mengen (z.B. 4,5 oder 4.5)

Antworte NUR mit diesem JSON (keine Markdown-Blöcke, keine Erklärungen, nur pures JSON):
{
  "rechnungsempfaenger": {
    "behoerde": "Bezirksamt Mitte von Berlin",
    "standort": "Standort Wedding, Muellerstrasse 146-147",
    "plzOrt": "13344 Berlin"
  },
  "leistungsempfaenger": {
    "nachname": "Mustermann",
    "vorname": "Max",
    "adresse": "Hartriegelstr. 132, 12439 Berlin",
    "pflegegrad": "3"
  },
  "rechnungsdaten": {
    "rechnungsNr": "XXXXXX",
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

    // Response extrahieren
    const responseText = message.content[0].type === "text" 
      ? message.content[0].text 
      : "";

    // JSON parsen
    let ocrResult: OCRResult;
    try {
      // Entferne mögliche Markdown-Codeblöcke
      const cleanedJson = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      
      ocrResult = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Raw Response:", responseText);
      return NextResponse.json(
        { 
          error: "Fehler beim Parsen der OCR-Antwort",
          details: responseText 
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
