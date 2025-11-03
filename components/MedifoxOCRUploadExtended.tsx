"use client";

import { useState } from "react";
import { Upload, FileText, Loader2, CheckCircle, XCircle, Info } from "lucide-react";

interface MedifoxPosition {
  lkCode: string;
  bezeichnung: string;
  menge: number;
  einzelpreis: number;
  gesamtpreis: number;
  isAUB?: boolean;
}

interface MedifoxMetadata {
  rechnungsnummer?: string;
  datum?: string;
  klient?: string;
  zeitraum?: string;
  pflegegrad?: number;
  debitor?: string;
}

interface MedifoxOCRUploadExtendedProps {
  onPositionsExtracted: (positionen: MedifoxPosition[], metadata?: MedifoxMetadata) => void;
  showMetadata?: boolean; // Optional: Metadaten-Anzeige aktivieren
}

export default function MedifoxOCRUploadExtended({ 
  onPositionsExtracted, 
  showMetadata = true 
}: MedifoxOCRUploadExtendedProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [extractedMetadata, setExtractedMetadata] = useState<MedifoxMetadata | null>(null);
  const [lkCount, setLkCount] = useState(0);
  const [aubCount, setAubCount] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setUploadStatus("idle");
      setStatusMessage("");
      setExtractedMetadata(null);
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
      const metadata = result.data.metadata;

      // Zähle LKs und AUBs
      const lks = positionen.filter((p: MedifoxPosition) => !p.isAUB);
      const aubs = positionen.filter((p: MedifoxPosition) => p.isAUB);

      setLkCount(lks.length);
      setAubCount(aubs.length);
      setExtractedMetadata(metadata);
      setUploadStatus("success");
      setStatusMessage(`${lks.length} LK-Positionen und ${aubs.length} AUB-Positionen erfolgreich ausgelesen`);

      onPositionsExtracted(positionen, metadata);

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
      setExtractedMetadata(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
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

      {/* File Info */}
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

      {/* Loading State */}
      {isUploading && (
        <div className="flex items-center justify-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <p className="text-blue-700 font-medium">{statusMessage}</p>
        </div>
      )}

      {/* Success State */}
      {uploadStatus === "success" && (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <p className="text-green-700 font-medium">{statusMessage}</p>
              <p className="text-sm text-green-600 mt-1">
                Die Positionen wurden automatisch unten eingefügt
              </p>
            </div>
          </div>

          {/* Metadaten-Anzeige */}
          {showMetadata && extractedMetadata && (
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex items-center space-x-2 mb-3">
                <Info className="w-5 h-5 text-indigo-600" />
                <h4 className="font-semibold text-indigo-700">Extrahierte Daten</h4>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {extractedMetadata.klient && (
                  <div>
                    <span className="text-gray-600">Klient:</span>
                    <p className="font-medium text-gray-800">{extractedMetadata.klient}</p>
                  </div>
                )}
                {extractedMetadata.rechnungsnummer && (
                  <div>
                    <span className="text-gray-600">Rechnung Nr.:</span>
                    <p className="font-medium text-gray-800">{extractedMetadata.rechnungsnummer}</p>
                  </div>
                )}
                {extractedMetadata.zeitraum && (
                  <div>
                    <span className="text-gray-600">Zeitraum:</span>
                    <p className="font-medium text-gray-800">{extractedMetadata.zeitraum}</p>
                  </div>
                )}
                {extractedMetadata.pflegegrad && (
                  <div>
                    <span className="text-gray-600">Pflegegrad:</span>
                    <p className="font-medium text-gray-800">{extractedMetadata.pflegegrad}</p>
                  </div>
                )}
                {extractedMetadata.debitor && (
                  <div>
                    <span className="text-gray-600">Debitor:</span>
                    <p className="font-medium text-gray-800">{extractedMetadata.debitor}</p>
                  </div>
                )}
                {extractedMetadata.datum && (
                  <div>
                    <span className="text-gray-600">Datum:</span>
                    <p className="font-medium text-gray-800">{extractedMetadata.datum}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {uploadStatus === "error" && (
        <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg border border-red-200">
          <XCircle className="w-6 h-6 text-red-500" />
          <p className="text-red-700 font-medium">{statusMessage}</p>
        </div>
      )}
    </div>
  );
}
