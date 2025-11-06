// app/components/InvoiceLayoutNew.tsx
import React from 'react';

interface InvoiceLayoutNewProps {
  rechnung: any;
  klient: {
    name: string;
    vorname?: string;  // NEU
    adresse: string;
    pflegegrad: string | number | '';
  };
  dienst: any;
  rechnungsNummer: string;
  ikNummer: string;  // NEU: IK-Nummer aus OCR
  zeitraumVon: string;
  zeitraumBis: string;
  rechnungsdatum: string;
  pflegekassenBetrag: number;
  logoUrl: string;
  rechnungsEmpfaenger: string;
  empfaengerStrasse: string;
  empfaengerPlz: string;
}

export default function InvoiceLayoutNew({
  rechnung,
  klient,
  dienst,
  rechnungsNummer,
  ikNummer,  // NEU
  zeitraumVon,
  zeitraumBis,
  rechnungsdatum,
  pflegekassenBetrag,
  logoUrl,
  rechnungsEmpfaenger,
  empfaengerStrasse,
  empfaengerPlz,
}: InvoiceLayoutNewProps) {

  // Kombiniere alle Positionen für die Anzeige
  const allePositionenRoh = [
    ...(rechnung.bewilligtePositionen || []),
    ...(rechnung.aubBewilligt || []),
    ...(rechnung.nichtBewilligtePositionen || []),
    ...(rechnung.aubNichtBewilligt || [])
  ];

  console.log('🔍 InvoiceLayoutNew VOR SORT:', {
    total: allePositionenRoh.length,
    codes: allePositionenRoh.map(p => p.lkCode),
    bewilligte: rechnung.bewilligtePositionen?.length || 0,
    aubBewilligt: rechnung.aubBewilligt?.length || 0,
    nichtBewilligte: rechnung.nichtBewilligtePositionen?.length || 0,
    aubNichtBewilligt: rechnung.aubNichtBewilligt?.length || 0
  });

  const allePositionen = [...allePositionenRoh].sort((a, b) => {
    const aIsAUB = a.lkCode.startsWith('AUB');
    const bIsAUB = b.lkCode.startsWith('AUB');

    // Erst alle AUBs, dann alle LKs
    if (aIsAUB && !bIsAUB) return -1;
    if (!aIsAUB && bIsAUB) return 1;

    // Innerhalb der Gruppe numerisch sortieren
    const numA = parseInt(a.lkCode.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.lkCode.replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  console.log('🔍 InvoiceLayoutNew NACH SORT:', {
    total: allePositionen.length,
    codes: allePositionen.map(p => p.lkCode)
  });

  // Zahlungsfrist berechnen (30 Tage)
  const zahlungsfrist = new Date(rechnungsdatum);
  zahlungsfrist.setDate(zahlungsfrist.getDate() + 30);
  const zahlungsfristFormatted = zahlungsfrist.toLocaleDateString('de-DE');

  // Bereinigt Bezeichnungen wie "LK11a LK11a Kleine Reinigung" → "Kleine Reinigung"
  const bereinigeBezeichnung = (bezeichnung: string, lkCode: string): string => {
    if (!bezeichnung) return '';

    // Entferne führende doppelte LK-Codes: "LK11a LK11a Text" → "Text"
    const pattern1 = new RegExp(`^${lkCode}\\s+${lkCode}\\s+`, 'i');
    let cleaned = bezeichnung.replace(pattern1, '');

    // Entferne einzelnen führenden LK-Code: "LK11a Text" → "Text"
    const pattern2 = new RegExp(`^${lkCode}\\s+`, 'i');
    cleaned = cleaned.replace(pattern2, '');

    return cleaned.trim();
  };

  return (
    <>
      {/* Print Styles - NUR für diese Komponente */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* KRITISCH: Chrome Bug Fix - Transitions müssen als erstes disabled werden */
          *,
          *::before,
          *::after {
            transition: none !important;
            animation: none !important;
          }

          /* Body und HTML komplett weiß */
          html,
          body {
            background: white !important;
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Modal Container komplett zurücksetzen */
          .fixed.inset-0,
          .fixed,
          [class*="fixed"] {
            position: static !important;
            background: white !important;
            background-color: white !important;
            padding: 0 !important;
            margin: 0 !important;
            inset: auto !important;
          }

          /* Alle Container weiß */
          .new-invoice-content,
          .new-invoice-content * {
            background: white !important;
            border: none !important;
            box-shadow: none !important;
          }

          /* Inline styles überschreiben */
          [style*="background"],
          [style*="border"],
          [style*="box-shadow"] {
            background: white !important;
            border: none !important;
            box-shadow: none !important;
          }

          /* Nur spezifische Farben behalten */
          .new-invoice-content tr[style*="#FEF2F2"] {
            background: #FEF2F2 !important;
          }

          .new-invoice-content div[style*="#FFF7ED"] {
            background: #FFF7ED !important;
            border: 2px solid #F97316 !important;
            border-left: 6px solid #F97316 !important;
          }

          /* Text-Farben behalten */
          span[style*="color"] {
            color: inherit !important;
          }

          /* Page Setup */
          @page {
            size: A4 portrait;
            margin: 1cm 1.25cm 2.54cm 1.75cm;
            background: white;
          }

          /* Tabellen */
          table {
            page-break-inside: auto;
          }

          thead {
            display: table-header-group;
          }

          tr {
            page-break-inside: avoid;
          }

          td, th {
            page-break-inside: avoid;
          }
        }
      `}} />

      <div className="new-invoice-content bg-white p-8" style={{ maxWidth: '210mm', margin: '0 auto', border: 'none', boxShadow: 'none' }}>

      {/* Logo oben links */}
      <div className="mb-4">
        <img
          src={logoUrl}
          alt="DomusVita Logo"
          style={{ height: '60px', width: 'auto' }}
        />
      </div>

      {/* Absender-Zeile klein */}
      <div style={{
        fontSize: '8pt',
        color: '#6B7280',
        marginBottom: '12px',
        borderBottom: 'none',
        paddingBottom: '4px'
      }}>
        DomusVita Gesundheit GmbH, Waldemarstr. 10 A, 10999 Berlin
      </div>

      {/* Empfänger links, Contact rechts */}
      <div className="flex justify-between mb-6">
        {/* Empfängeradresse links */}
        <div style={{ fontSize: '11pt', lineHeight: '1.5' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>{rechnungsEmpfaenger}</p>
          <p>{empfaengerStrasse}</p>
          <p>{empfaengerPlz}</p>
        </div>

        {/* Contact Details rechts */}
        <div className="text-right" style={{ fontSize: '9pt', lineHeight: '1.6' }}>
          <p>Telefon: {dienst.telefon}</p>
          <p>Telefax: {dienst.fax}</p>
          <p>E-Mail: {dienst.email}</p>
          <p style={{ fontWeight: 'bold', marginTop: '8px' }}>
            Datum: Berlin, {rechnungsdatum}
          </p>
        </div>
      </div>

      {/* Rechnungsinformationen Box */}
      <div style={{
        border: 'none',
        padding: '12px',
        marginBottom: '16px',
        fontSize: '9pt',
        background: 'white',
        borderRadius: '0'
      }}>
        <div className="flex justify-between">
          <div>
            <p><strong>Rechnung Nr.:</strong> {rechnungsNummer}</p>
            <p><strong>Abrechnungszeitraum:</strong> {zeitraumVon} bis {zeitraumBis}</p>
          </div>
          <div className="text-right">
            <p><strong>IK:</strong> {ikNummer}</p>
          </div>
        </div>
      </div>

      {/* Klientendaten Box */}
      <div style={{
        border: 'none',
        padding: '12px',
        marginBottom: '20px',
        fontSize: '9pt',
        borderRadius: '0'
      }}>
        <div className="flex justify-between">
          <div>
            <p style={{ marginBottom: '4px' }}><strong>Leistungsempfänger:</strong></p>
            <p style={{ fontWeight: 'bold' }}>
              {klient.name}{klient.vorname ? `, ${klient.vorname}` : ''}
            </p>
            <p>{klient.adresse}</p>
          </div>
          <div className="text-right">
            <p><strong>Pflegegrad:</strong> {klient.pflegegrad}</p>
            <p><strong>Leistungsgrundlage:</strong> SGB XI §36</p>
          </div>
        </div>
      </div>

      {/* Leistungstabelle */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '9pt',
        marginBottom: '20px'
      }}>
        <thead>
          <tr style={{
            background: 'white',
            borderBottom: 'none'
          }}>
            <th style={{
              padding: '8px',
              textAlign: 'left',
              fontStyle: 'italic',
              width: '8%'
            }}>
              Abk.
            </th>
            <th style={{
              padding: '8px',
              textAlign: 'left',
              fontStyle: 'italic',
              width: '50%'
            }}>
              Leistung
            </th>
            <th style={{
              padding: '8px',
              textAlign: 'right',
              fontStyle: 'italic',
              width: '12%'
            }}>
              Anzahl
            </th>
            <th style={{
              padding: '8px',
              textAlign: 'right',
              fontStyle: 'italic',
              width: '15%'
            }}>
              Einzelpreis
            </th>
            <th style={{
              padding: '8px',
              textAlign: 'right',
              fontStyle: 'italic',
              width: '15%'
            }}>
              Gesamtpreis
            </th>
          </tr>
        </thead>
        <tbody>
          {allePositionen.map((pos: any, idx: number) => (
            <tr
              key={`lk-${idx}`}
              style={{
                background: !pos.bewilligt ? '#FEF2F2' : '',
                borderBottom: 'none'
              }}
            >
              {/* LK-Code */}
              <td style={{ padding: '8px', verticalAlign: 'top' }}>
                <span style={{
                  textDecoration: pos.umgewandeltZu ? 'line-through' : 'none',
                  color: pos.umgewandeltZu ? '#9CA3AF' : 'inherit'
                }}>
                  {pos.lkCode}
                </span>
              </td>

              {/* Bezeichnung mit Status-Hinweisen */}
              <td style={{ padding: '8px', verticalAlign: 'top' }}>
                <span style={{
                  textDecoration: pos.umgewandeltZu ? 'line-through' : 'none',
                  color: pos.umgewandeltZu ? '#9CA3AF' : 'inherit'
                }}>
                  {pos.lkCode} {bereinigeBezeichnung(pos.bezeichnung, pos.lkCode)}
                </span>

                {/* 🔵 BLAU: Umwandlung */}
                {pos.umgewandeltZu && (
                  <span style={{
                    display: 'inline-block',
                    color: '#2563EB',
                    marginLeft: '8px',
                    fontSize: '8pt'
                  }}>
                    → erbracht, aktuell nicht bewilligt, umgewandelt in {pos.umgewandeltZu}
                  </span>
                )}

                {/* 🔴 ROT: Nicht bewilligt */}
                {!pos.bewilligt && !pos.umgewandeltZu && (
                  <span style={{
                    display: 'block',
                    color: '#DC2626',
                    fontSize: '8pt',
                    fontStyle: 'italic',
                    marginTop: '2px'
                  }}>
                    ⚠ erbracht, aktuell nicht bewilligt
                  </span>
                )}

                {/* 🟠 ORANGE: Gekürzt */}
                {pos.gekuerztVon && (
                  <span style={{
                    display: 'block',
                    color: '#EA580C',
                    fontSize: '8pt',
                    fontStyle: 'italic',
                    marginTop: '2px'
                  }}>
                    ℹ gekürzt von {pos.gekuerztVon} auf {pos.menge}
                  </span>
                )}
              </td>

              {/* Menge */}
              <td style={{ padding: '8px', textAlign: 'right', verticalAlign: 'top' }}>
                <span style={{
                  textDecoration: pos.umgewandeltZu ? 'line-through' : 'none',
                  color: pos.umgewandeltZu ? '#9CA3AF' : 'inherit'
                }}>
                  {pos.menge.toFixed(2)}
                </span>
              </td>

              {/* Einzelpreis */}
              <td style={{ padding: '8px', textAlign: 'right', verticalAlign: 'top' }}>
                {pos.preis.toFixed(2)}
              </td>

              {/* Gesamtpreis */}
              <td style={{ padding: '8px', textAlign: 'right', verticalAlign: 'top' }}>
                {pos.bewilligt ? (
                  <span style={{ fontWeight: 'bold' }}>
                    {pos.gesamt.toFixed(2)}
                  </span>
                ) : (
                  <span style={{ color: '#9CA3AF' }}>0,00</span>
                )}
              </td>
            </tr>
          ))}

          {/* Zwischensumme */}
          <tr style={{ background: 'white', fontWeight: 'bold' }}>
            <td colSpan={4} style={{ padding: '8px', textAlign: 'right' }}>
              Zwischensumme:
            </td>
            <td style={{ padding: '8px', textAlign: 'right' }}>
              {rechnung.zwischensummeBA.toFixed(2)}
            </td>
          </tr>

          {/* ZINV */}
          <tr>
            <td style={{ padding: '8px' }}>ZINV</td>
            <td style={{ padding: '8px' }}>Investitionskosten 3,38%</td>
            <td style={{ padding: '8px', textAlign: 'right' }}>1,00</td>
            <td style={{ padding: '8px', textAlign: 'right' }}>
              {rechnung.zinvBA.toFixed(2)}
            </td>
            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
              {rechnung.zinvBA.toFixed(2)}
            </td>
          </tr>

          {/* Gesamtbetrag */}
          <tr style={{ background: 'white', fontWeight: 'bold' }}>
            <td colSpan={4} style={{ padding: '8px', textAlign: 'right' }}>
              Gesamtbetrag:
            </td>
            <td style={{ padding: '8px', textAlign: 'right' }}>
              {rechnung.gesamtbetragBA.toFixed(2)}
            </td>
          </tr>

          {/* Pflegekasse Abzug */}
          <tr>
            <td colSpan={4} style={{ padding: '8px', textAlign: 'right' }}>
              ./. Anteil Pflegekasse:
            </td>
            <td style={{ padding: '8px', textAlign: 'right' }}>
              {pflegekassenBetrag.toFixed(2)}
            </td>
          </tr>

          {/* RECHNUNGSBETRAG */}
          <tr style={{
            background: 'white',
            fontWeight: 'bold',
            fontSize: '11pt'
          }}>
            <td colSpan={4} style={{ padding: '12px', textAlign: 'right' }}>
              Rechnungsbetrag:
            </td>
            <td style={{
              padding: '12px',
              textAlign: 'right',
              color: '#4F46E5'
            }}>
              {rechnung.rechnungsbetragBA.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Hinweis-Box */}
      <div style={{
        background: '#FFF7ED',
        border: '2px solid #F97316',
        borderLeft: '6px solid #F97316',
        padding: '12px',
        marginBottom: '16px',
        fontSize: '8pt',
        borderRadius: '4px'
      }}>
        <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>Hinweis:</p>
        <p style={{ lineHeight: '1.5' }}>
          Positionen mit "erbracht, aktuell nicht bewilligt" wurden dokumentarisch
          aufgeführt, fließen jedoch nicht in die Rechnungssumme ein.
        </p>
      </div>

      {/* Zahlungsbedingungen */}
      <div style={{ fontSize: '9pt', marginBottom: '16px', lineHeight: '1.6' }}>
        <p>Zahlbar bis zum {zahlungsfristFormatted} ohne Abzug.</p>
        <p>Umsatzsteuerfrei gemäß § 4 Nr. 16 UStG</p>
      </div>

      {/* Footer mit Firmendaten */}
      <div style={{
        borderTop: 'none',
        paddingTop: '12px',
        fontSize: '8pt',
        textAlign: 'center',
        color: '#6B7280',
        lineHeight: '1.8'
      }}>
        <p>
          <strong>Sitz der Gesellschaft:</strong> DomusVita Gesundheit GmbH •
          Waldemarstraße 10 A • 10999 Berlin
        </p>
        <p>
          Telefon: {dienst.telefon} • Telefax: {dienst.fax} •
          E-Mail: {dienst.email} • www.domusvita.de
        </p>
        <p>
          <strong>Geschäftsführer:</strong> Lukas Dahrendorf • Alexander Ebel
        </p>
        <p>
          <strong>Bankverbindung:</strong> {dienst.iban} • BIC: {dienst.bic} • {dienst.bank}
        </p>
        <p>
          AG Berlin Charlottenburg • HRB 87436 B • Steuernummer: 29/582/51396
        </p>
      </div>
      </div>
    </>
  );
}
