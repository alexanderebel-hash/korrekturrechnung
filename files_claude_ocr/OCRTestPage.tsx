"use client";

import { useState } from "react";
import MedifoxOCRUploadExtended from "@/components/MedifoxOCRUploadExtended";

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

export default function OCRTestPage() {
  const [positionen, setPositionen] = useState<MedifoxPosition[]>([]);
  const [metadata, setMetadata] = useState<MedifoxMetadata | null>(null);

  const handlePositionsExtracted = (
    extractedPositionen: MedifoxPosition[],
    extractedMetadata?: MedifoxMetadata
  ) => {
    setPositionen(extractedPositionen);
    setMetadata(extractedMetadata || null);
  };

  // Separate LKs und AUBs
  const lkPositionen = positionen.filter((p) => !p.isAUB);
  const aubPositionen = positionen.filter((p) => p.isAUB);

  // Summen berechnen
  const summeLK = lkPositionen.reduce((sum, p) => sum + p.gesamtpreis, 0);
  const summeAUB = aubPositionen.reduce((sum, p) => sum + p.gesamtpreis, 0);
  const gesamtsumme = summeLK + summeAUB;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
            OCR Test-Seite
          </h1>
          <p className="text-gray-600">
            Teste die Medifox-Rechnungs-Extraktion mit Anthropic Vision API
          </p>
        </div>

        {/* Upload-Komponente */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            📄 Rechnung hochladen
          </h2>
          <MedifoxOCRUploadExtended
            onPositionsExtracted={handlePositionsExtracted}
            showMetadata={true}
          />
        </div>

        {/* Ergebnisse */}
        {positionen.length > 0 && (
          <div className="space-y-6">
            {/* LK-Positionen */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-green-600 mb-6">
                ✅ LK-Positionen ({lkPositionen.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-green-100">
                      <th className="border p-3 text-left">LK-Code</th>
                      <th className="border p-3 text-left">Bezeichnung</th>
                      <th className="border p-3 text-right">Menge</th>
                      <th className="border p-3 text-right">Einzelpreis</th>
                      <th className="border p-3 text-right">Gesamtpreis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lkPositionen.map((pos, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="border p-3 font-mono text-indigo-600 font-semibold">
                          {pos.lkCode}
                        </td>
                        <td className="border p-3">{pos.bezeichnung}</td>
                        <td className="border p-3 text-right">{pos.menge}x</td>
                        <td className="border p-3 text-right">
                          {pos.einzelpreis.toFixed(2)} €
                        </td>
                        <td className="border p-3 text-right font-semibold">
                          {pos.gesamtpreis.toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-green-50 font-bold">
                      <td colSpan={4} className="border p-3 text-right">
                        Summe LK:
                      </td>
                      <td className="border p-3 text-right text-green-600">
                        {summeLK.toFixed(2)} €
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* AUB-Positionen */}
            {aubPositionen.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-bold text-blue-600 mb-6">
                  📋 AUB-Positionen ({aubPositionen.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-blue-100">
                        <th className="border p-3 text-left">Code</th>
                        <th className="border p-3 text-left">Bezeichnung</th>
                        <th className="border p-3 text-right">Menge</th>
                        <th className="border p-3 text-right">Einzelpreis</th>
                        <th className="border p-3 text-right">Gesamtpreis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aubPositionen.map((pos, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="border p-3 font-mono text-blue-600">
                            {pos.lkCode}
                          </td>
                          <td className="border p-3 text-sm">{pos.bezeichnung}</td>
                          <td className="border p-3 text-right">{pos.menge}x</td>
                          <td className="border p-3 text-right">
                            {pos.einzelpreis.toFixed(2)} €
                          </td>
                          <td className="border p-3 text-right">
                            {pos.gesamtpreis.toFixed(2)} €
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-blue-50 font-bold">
                        <td colSpan={4} className="border p-3 text-right">
                          Summe AUB:
                        </td>
                        <td className="border p-3 text-right text-blue-600">
                          {summeAUB.toFixed(2)} €
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Gesamtsumme */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl shadow-xl p-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg opacity-90">Gesamtsumme (Übertrag)</p>
                  <p className="text-4xl font-bold mt-2">
                    {gesamtsumme.toFixed(2)} €
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm opacity-90">
                    {lkPositionen.length} LK-Positionen
                  </p>
                  <p className="text-sm opacity-90">
                    {aubPositionen.length} AUB-Positionen
                  </p>
                  <p className="text-sm opacity-90 font-semibold mt-2">
                    {positionen.length} Positionen gesamt
                  </p>
                </div>
              </div>
            </div>

            {/* JSON-Output (zum Debugging) */}
            <div className="bg-gray-800 rounded-2xl shadow-xl p-8 text-white">
              <h3 className="text-xl font-bold mb-4">🔧 JSON-Output (Debug)</h3>
              <pre className="overflow-x-auto text-sm bg-gray-900 p-4 rounded-lg">
                {JSON.stringify({ positionen, metadata }, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
