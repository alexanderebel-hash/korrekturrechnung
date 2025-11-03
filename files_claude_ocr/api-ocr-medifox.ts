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
              text: `Analysiere diese Medifox-Rechnung und extrahiere ALLE Leistungskomplex-Positionen und Ausbildungsumlagen.

WICHTIG: 
- Extrahiere SOWOHL LK-Positionen (z.B. LK02, LK03b, LK11b, LK12, LK15, LK17a, LK20.2, etc.) 
- ALS AUCH AUB-Positionen (Ausbildungsumlage zu LK02, etc.)
- Achte auf Dezimalzahlen bei Mengen (z.B. 4,5 oder 4.5)
- Bei LK-Codes mit Punkt (z.B. LK20.2) den Punkt beibehalten
- Umlaute korrekt übernehmen (ä, ö, ü)

Gib mir ein JSON-Objekt zurück mit folgender Struktur:

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
    // ... weitere Positionen
  ],
  "metadata": {
    "rechnungsnummer": "9876",
    "datum": "03.11.2025",
    "klient": "Bollweber, Roland Andreas",
    "zeitraum": "01.09.2025 - 30.09.2025",
    "pflegegrad": 2,
    "debitor": "62298"
  }
}

WICHTIG: 
- Für AUB-Positionen: lkCode = "AUB_LK02" (mit Unterstrich), isAUB = true
- Für LK-Positionen: lkCode = "LK02" (Original-Code), isAUB = false
- Menge als Zahl (9 oder 4.5, nicht als String)
- Preise mit Punkt als Dezimaltrenner (17.01, nicht 17,01)

Antworte NUR mit dem JSON-Objekt, ohne zusätzlichen Text oder Markdown.`,
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
