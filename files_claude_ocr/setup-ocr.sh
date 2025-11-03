#!/bin/bash

echo "🚀 DomusVita OCR Setup - Installation startet..."
echo ""

# 1. Anthropic SDK installieren
echo "📦 Installiere @anthropic-ai/sdk..."
npm install @anthropic-ai/sdk

# 2. API-Route erstellen
echo "📁 Erstelle API-Route..."
mkdir -p app/api/ocr-medifox
cat > app/api/ocr-medifox/route.ts << 'EOF'
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 60;

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
  };
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY nicht gefunden in Vercel Environment Variables" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const anthropic = new Anthropic({ apiKey });

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
              text: `Analysiere diese Medifox-Rechnung und extrahiere alle Leistungskomplex-Positionen (LK-Codes).

WICHTIG: 
- Extrahiere NUR die LK-Positionen (z.B. LK04, LK11B, LK12, LK15, etc.)
- Ignoriere AUB-Zeilen (Ausbildungsumlage) - diese werden automatisch berechnet
- Achte auf die Mengen (Anzahl der erbrachten Leistungen)

Gib mir ein JSON-Objekt zurück mit folgender Struktur:

{
  "positionen": [
    {
      "lkCode": "LK04",
      "bezeichnung": "Grosse Koerperpflege",
      "menge": 2,
      "einzelpreis": 34.01,
      "gesamtpreis": 68.02
    }
  ],
  "metadata": {
    "rechnungsnummer": "9876",
    "datum": "03.11.2025",
    "klient": "Mustermann, Max",
    "zeitraum": "01.09.2025 - 30.09.2025"
  }
}

Antworte NUR mit dem JSON-Objekt, ohne zusätzlichen Text.`,
            },
          ],
        },
      ],
    });

    const responseText = message.content[0].type === "text" 
      ? message.content[0].text 
      : "";

    let ocrResult: OCRResult;
    try {
      const cleanedJson = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      
      ocrResult = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      return NextResponse.json(
        { 
          error: "Fehler beim Parsen der OCR-Antwort",
          details: responseText 
        },
        { status: 500 }
      );
    }

    if (!ocrResult.positionen || !Array.isArray(ocrResult.positionen)) {
      return NextResponse.json(
        { error: "Keine Positionen gefunden in der Rechnung" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: ocrResult,
      message: \`\${ocrResult.positionen.length} LK-Positionen erfolgreich extrahiert\`,
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
EOF

# 3. Komponente erstellen
echo "🎨 Erstelle Upload-Komponente..."
mkdir -p components
cat > components/MedifoxOCRUpload.tsx << 'EOF'
"use client";

import { useState } from "react";
import { Upload, FileText, Loader2, CheckCircle, XCircle } from "lucide-react";

interface MedifoxPosition {
  lkCode: string;
  bezeichnung: string;
  menge: number;
  einzelpreis: number;
  gesamtpreis: number;
}

interface MedifoxOCRUploadProps {
  onPositionsExtracted: (positionen: MedifoxPosition[]) => void;
}

export default function MedifoxOCRUpload({ onPositionsExtracted }: MedifoxOCRUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setUploadStatus("idle");
      setStatusMessage("");
    } else {
      setStatusMessage("Bitte wähle eine PDF-Datei aus");
      setUploadStatus("error");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatusMessage("Bitte wähle zuerst eine Datei aus");
      setUploadStatus("error");
      return;
    }

    setIsUploading(true);
    setUploadStatus("idle");
    setStatusMessage("Rechnung wird analysiert...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/ocr-medifox", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Fehler beim Verarbeiten der PDF");
      }

      const positionen = result.data.positionen;
      setUploadStatus("success");
      setStatusMessage(\`\${positionen.length} LK-Positionen erfolgreich ausgelesen\`);
      onPositionsExtracted(positionen);

    } catch (error: any) {
      console.error("Upload Error:", error);
      setUploadStatus("error");
      setStatusMessage(error.message || "Fehler beim Verarbeiten der PDF");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
      setUploadStatus("idle");
      setStatusMessage("");
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-indigo-300 rounded-xl p-8 text-center bg-gradient-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-all cursor-pointer"
      >
        <input
          type="file"
          id="pdf-upload"
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <label htmlFor="pdf-upload" className="cursor-pointer">
          <div className="flex flex-col items-center space-y-4">
            <Upload className="w-12 h-12 text-indigo-500" />
            <div>
              <p className="text-lg font-semibold text-gray-700">
                Medifox-Rechnung hochladen (PDF)
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Oder Datei hierher ziehen
              </p>
            </div>
          </div>
        </label>
      </div>

      {file && (
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-indigo-500" />
            <div>
              <p className="font-medium text-gray-700">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          
          {!isUploading && uploadStatus !== "success" && (
            <button
              onClick={handleUpload}
              className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all font-medium shadow-md hover:shadow-lg"
            >
              Jetzt auslesen
            </button>
          )}
        </div>
      )}

      {isUploading && (
        <div className="flex items-center justify-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <p className="text-blue-700 font-medium">{statusMessage}</p>
        </div>
      )}

      {uploadStatus === "success" && (
        <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <div>
            <p className="text-green-700 font-medium">{statusMessage}</p>
            <p className="text-sm text-green-600 mt-1">
              Die Positionen wurden automatisch unten eingefügt
            </p>
          </div>
        </div>
      )}

      {uploadStatus === "error" && (
        <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg border border-red-200">
          <XCircle className="w-6 h-6 text-red-500" />
          <p className="text-red-700 font-medium">{statusMessage}</p>
        </div>
      )}
    </div>
  );
}
EOF

echo ""
echo "✅ Installation abgeschlossen!"
echo ""
echo "📋 Nächste Schritte:"
echo "   1. Prüfe Vercel Environment Variable: ANTHROPIC_API_KEY"
echo "   2. Integriere die Komponente in Schritt 3 (siehe OCR_INTEGRATION_ANLEITUNG.md)"
echo "   3. Teste mit: npm run dev"
echo ""
echo "🚀 Fertig!"
