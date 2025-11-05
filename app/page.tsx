'use client';
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import MedifoxOCRUploadExtended from "@/components/MedifoxOCRUploadExtended";
import InvoiceLayoutNew from "@/app/components/InvoiceLayoutNew";

interface BewilligungRow {
  lkCode: string;
  bezeichnung: string;
  jeWoche: number;
  jeMonat: number;
}

interface KlientData {
  name: string;
  zeitraumVon: string;
  zeitraumBis: string;
  geburtsdatum: string;
  pflegegrad: number | '';
  debitor: string;
  belegNr: string;
  genehmigungsDatum: string;
  genehmigungsNr: string;
}

interface RechnungsPosition {
  lkCode: string;
  bezeichnung: string;
  menge: number;
  preis: number;
  gesamt: number;
  bewilligt: boolean;
  istAUB?: boolean;
  zugehoerigLK?: string;
  gekuerztVon?: number;
  umgewandeltZu?: string;
  mengeAusUmwandlung?: number;
}

interface PflegedienstData {
  name: string;
  strasse: string;
  plz: string;
  ik: string;
  iban: string;
  bic: string;
  bank: string;
  hrb: string;
  telefon: string;
  telefax: string;
  email: string;
}

const PFLEGEDIENSTE: { [key: string]: PflegedienstData } = {
  'kreuzberg': {
    name: 'DomusVita Gesundheit GmbH',
    strasse: 'Waldemarstr. 10 A',
    plz: '10999 Berlin',
    ik: '461104151',
    iban: 'DE53100500000190998890',
    bic: 'BELADEBEXXX',
    bank: 'Berliner Sparkasse',
    hrb: 'HRB 87436 B',
    telefon: '030/6120152-0',
    telefax: '030/6120152-10',
    email: 'kreuzberg@domusvita.de'
  },
  'treptow': {
    name: 'DomusVita Pflegedienst gGmbH',
    strasse: 'Baumschulenstr. 24',
    plz: '12437 Berlin',
    ik: '461104096',
    iban: 'DE53100500000190998890',
    bic: 'BELADEBEXXX',
    bank: 'Berliner Sparkasse',
    hrb: 'HRB 87436 B',
    telefon: '030/53695290',
    telefax: '030/536952929',
    email: 'treptow@domusvita.de'
  }
};

const WOHNHEIME: { [key: string]: string } = {
  'hebron': 'Hartriegelstr. 132, 12439 Berlin',
  'siefos': 'Waldemarstr. 10a, 10999 Berlin'
};

const LK_PREISE: { [key: string]: { bezeichnung: string; preis: number; aubPreis: number } } = {
  'LK01': { bezeichnung: 'Erweiterte kleine Koerperpflege', preis: 25.51, aubPreis: 0.59 },
  'LK02': { bezeichnung: 'Kleine Koerperpflege', preis: 17.01, aubPreis: 0.39 },
  'LK03A': { bezeichnung: 'Erweiterte grosse Koerperpflege', preis: 38.30, aubPreis: 0.88 },
  'LK03B': { bezeichnung: 'Erweiterte grosse Koerperpflege m. Baden', preis: 51.02, aubPreis: 1.17 },
  'LK04': { bezeichnung: 'Grosse Koerperpflege', preis: 34.01, aubPreis: 0.78 },
  'LK05': { bezeichnung: 'Lagern/Betten', preis: 8.50, aubPreis: 0.20 },
  'LK06': { bezeichnung: 'Hilfe bei der Nahrungsaufnahme', preis: 21.30, aubPreis: 0.49 },
  'LK07A': { bezeichnung: 'Darm- und Blasenentleerung', preis: 6.77, aubPreis: 0.16 },
  'LK07B': { bezeichnung: 'Darm- und Blasenentleerung erweitert', preis: 17.01, aubPreis: 0.39 },
  'LK08A': { bezeichnung: 'Hilfestellung beim Verlassen/Wiederaufsuchen der Wohnung', preis: 5.94, aubPreis: 0.14 },
  'LK08B': { bezeichnung: 'Hilfestellung beim Wiederaufsuchen der Wohnung', preis: 5.94, aubPreis: 0.14 },
  'LK09': { bezeichnung: 'Begleitung ausser Haus', preis: 51.02, aubPreis: 1.17 },
  'LK10': { bezeichnung: 'Heizen', preis: 3.38, aubPreis: 1.88 },
  'LK11A': { bezeichnung: 'Kleine Reinigung der Wohnung', preis: 7.43, aubPreis: 0.17 },
  'LK11B': { bezeichnung: 'Grosse Reinigung der Wohnung', preis: 22.29, aubPreis: 0.51 },
  'LK11C': { bezeichnung: 'Aufwendiges Raeumen', preis: 39.62, aubPreis: 0.51 },
  'LK12': { bezeichnung: 'Wechseln u. Waschen der Kleidung', preis: 39.62, aubPreis: 0.91 },
  'LK13': { bezeichnung: 'Einkaufen', preis: 19.81, aubPreis: 0.46 },
  'LK14': { bezeichnung: 'Zubereitung warme Mahlzeit', preis: 22.29, aubPreis: 0.51 },
  'LK15': { bezeichnung: 'Zubereitung kleine Mahlzeit', preis: 7.43, aubPreis: 0.17 },
  'LK16A': { bezeichnung: 'Erstbesuch', preis: 23.00, aubPreis: 0.16 },
  'LK16B': { bezeichnung: 'Folgebesuch', preis: 10.00, aubPreis: 0.16 },
  'LK17A': { bezeichnung: 'Einsatzpauschale', preis: 5.37, aubPreis: 0.12 },
  'LK17B': { bezeichnung: 'Einsatzpauschale WE', preis: 10.73, aubPreis: 0.25 },
  'LK20': { bezeichnung: 'Haeusliche Betreuung Paragraph 124 SGB XI', preis: 8.26, aubPreis: 0.19 },
  'LK20_HH': { bezeichnung: 'Haeusliche Betreuung Paragraph 124 SGB XI (Haushaltsbuch)', preis: 8.26, aubPreis: 0.19 }
};

const PFLEGEGRAD_SACHLEISTUNG: { [key: number]: number } = {
  1: 131.00,
  2: 796.00,
  3: 1497.00,
  4: 1859.00,
  5: 2299.00
};

const formatDateDisplay = (isoDate: string) => {
  if (!isoDate) {
    return '';
  }

  const parts = isoDate.split('-');
  if (parts.length !== 3) {
    return isoDate;
  }

  const [year, month, day] = parts;
  if (!year || !month || !day) {
    return isoDate;
  }

  return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
};

const extractKlientName = (workbook: XLSX.WorkBook): string => {
  const stammdatenSheet = workbook.Sheets['Stammdaten'];
  if (!stammdatenSheet) {
    return '';
  }

  const getCell = (cellRef: string) => {
    const cell = stammdatenSheet[cellRef];
    if (cell && typeof cell.v === 'string') {
      return cell.v.trim();
    }
    return '';
  };

  const lastName = getCell('A2');
  const firstName = getCell('B2');

  if (lastName && firstName) {
    return `${lastName}, ${firstName}`;
  }

  if (lastName || firstName) {
    return [lastName, firstName].filter(Boolean).join(', ');
  }

  return '';
};

export default function Home() {
  const logoUrl = '/logo.png';
  
  const [pflegedienstKey, setPflegedienstKey] = useState<string>('kreuzberg');
  const [wohnheimKey, setWohnheimKey] = useState<string>('hebron');
  
  const [klientData, setKlientData] = useState<KlientData>({
    name: '',
    zeitraumVon: '',
    zeitraumBis: '',
    geburtsdatum: '',
    pflegegrad: '',
    debitor: '62202',
    belegNr: '13400',
    genehmigungsDatum: '06.01.2025',
    genehmigungsNr: 'S0131070040738'
  });
  
  const dienst = PFLEGEDIENSTE[pflegedienstKey];
  const klientAdresse = WOHNHEIME[wohnheimKey];
  const [abrechnungszeitraumVon, setAbrechnungszeitraumVon] = useState('');
  const [abrechnungszeitraumBis, setAbrechnungszeitraumBis] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  
  const [bewilligung, setBewilligung] = useState<BewilligungRow[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [medifoxPdf, setMedifoxPdf] = useState<File | null>(null);
  const [rechnungPositionen, setRechnungPositionen] = useState<RechnungsPosition[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [pflegekassenBetrag, setPflegekassenBetrag] = useState<number>(0);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showPrivatPreview, setShowPrivatPreview] = useState(false);
  const [showPreviewNew, setShowPreviewNew] = useState(false);
  const [korrekturAnfrage, setKorrekturAnfrage] = useState('');
  const [showRechnungsnummerModal, setShowRechnungsnummerModal] = useState(false);
  const [rechnungsnummer, setRechnungsnummer] = useState('');
  const [actionType, setActionType] = useState<'print' | 'download'>('print');
  const [pdfType, setPdfType] = useState<'ba' | 'privat'>('ba');
  const [medifoxPositionen, setMedifoxPositionen] = useState<Array<{
    lkCode: string;
    bezeichnung: string;
    menge: number;
    einzelpreis: number;
    gesamtpreis: number;
    isAUB?: boolean;
  }>>([]);
  const [uploadMode, setUploadMode] = useState<'manual' | 'blob' | 'save'>('manual');
  const [blobBewilligungen, setBlobBewilligungen] = useState<Array<{
    url: string;
    filename: string;
    uploadedAt: Date;
    size: number;
  }>>([]);
  const [isLoadingBlob, setIsLoadingBlob] = useState(false);
  const [isSavingBlob, setIsSavingBlob] = useState(false);
  const [blobError, setBlobError] = useState('');
  const zeitraumVonDisplay = formatDateDisplay(klientData.zeitraumVon);
  const zeitraumBisDisplay = formatDateDisplay(klientData.zeitraumBis);

  useEffect(() => {
    setAbrechnungszeitraumVon(klientData.zeitraumVon);
    setAbrechnungszeitraumBis(klientData.zeitraumBis);

    if (klientData.zeitraumVon) {
      const [year, month] = klientData.zeitraumVon.split('-');
      if (year && month) {
        const normalizedMonth = `${year}-${month.padStart(2, '0')}`;
        setSelectedMonth(prev =>
          prev === normalizedMonth ? prev : normalizedMonth
        );
        return;
      }
    }

    setSelectedMonth(prev => (prev === '' ? prev : ''));
  }, [klientData.zeitraumVon, klientData.zeitraumBis]);

  const ladeTestBewilligung = () => {
    const testBewilligung: BewilligungRow[] = [
      { lkCode: 'LK02', bezeichnung: 'Kleine Körperpflege', jeWoche: 1, jeMonat: 4 },
      { lkCode: 'LK11b', bezeichnung: 'Große Reinigung der Wohnung', jeWoche: 1, jeMonat: 4 },
      { lkCode: 'LK12', bezeichnung: 'Wechseln u. Waschen der Kleidung', jeWoche: 1, jeMonat: 4 },
      { lkCode: 'LK13', bezeichnung: 'Einkaufen', jeWoche: 1, jeMonat: 4 },
      { lkCode: 'LK15', bezeichnung: 'Zubereitung kleine Mahlzeit', jeWoche: 21, jeMonat: 0 }
    ];
    setBewilligung(testBewilligung);
    
    // Klientendaten auch setzen
    setKlientData(prev => ({
      ...prev,
      name: 'Mustermann, Max',
      zeitraumVon: '2025-09-01',
      zeitraumBis: '2025-09-30',
      pflegegrad: 3
    }));
    setPflegekassenBetrag(PFLEGEGRAD_SACHLEISTUNG[3]);
  };

  const ladeTestRechnungspositionen = () => {
    const testPositionen: RechnungsPosition[] = [
      { lkCode: 'LK04', bezeichnung: 'Grosse Koerperpflege', menge: 2, preis: 34.01, gesamt: 68.02, bewilligt: false, istAUB: false },
      { lkCode: 'LK07A', bezeichnung: 'Darm- und Blasenentleerung', menge: 30, preis: 6.77, gesamt: 203.10, bewilligt: false, istAUB: false },
      { lkCode: 'LK11A', bezeichnung: 'Kleine Reinigung der Wohnung', menge: 4, preis: 7.43, gesamt: 29.72, bewilligt: false, istAUB: false },
      { lkCode: 'LK11B', bezeichnung: 'Grosse Reinigung der Wohnung', menge: 5, preis: 22.29, gesamt: 111.45, bewilligt: true, istAUB: false },
      { lkCode: 'LK12', bezeichnung: 'Wechseln u. Waschen der Kleidung', menge: 9, preis: 39.62, gesamt: 356.58, bewilligt: true, istAUB: false },
      { lkCode: 'LK13', bezeichnung: 'Einkaufen', menge: 3, preis: 19.81, gesamt: 59.43, bewilligt: true, istAUB: false },
      { lkCode: 'LK14', bezeichnung: 'Zubereitung warme Mahlzeit', menge: 12, preis: 22.29, gesamt: 267.48, bewilligt: false, istAUB: false },
      { lkCode: 'LK15', bezeichnung: 'Zubereitung kleine Mahlzeit', menge: 76, preis: 7.43, gesamt: 564.68, bewilligt: true, istAUB: false },
      { lkCode: 'LK17A', bezeichnung: 'Einsatzpauschale', menge: 21, preis: 5.37, gesamt: 112.77, bewilligt: false, istAUB: false },
      { lkCode: 'LK17B', bezeichnung: 'Einsatzpauschale WE', menge: 8, preis: 10.73, gesamt: 85.84, bewilligt: false, istAUB: false }
    ];
    setRechnungPositionen(testPositionen);
  };

  const handleNeueRechnung = () => {
    if (window.confirm('Sind Sie sicher, dass Sie eine neue Korrekturrechnung erstellen möchten? Alle aktuellen Daten gehen verloren.')) {
      window.location.reload();
    }
  };

  const handleOCRPositionsExtracted = (positionen: any[], metadata?: any) => {
    // LKs und AUBs filtern
    const lkPositionen = positionen.filter(p => !p.isAUB);
    const aubPositionen = positionen.filter(p => p.isAUB);

    // Schritt 1: LKs verarbeiten und Bewilligungsstatus prüfen
    const verarbeiteteLKs: RechnungsPosition[] = lkPositionen.map(pos => {
      // Prüfen ob LK in Bewilligung vorhanden ist
      const bewilligt = bewilligung.some(b =>
        b.lkCode.toLowerCase().replace(/\s/g, '') === pos.lkCode.toLowerCase().replace(/\s/g, '')
      );

      return {
        lkCode: pos.lkCode,
        bezeichnung: pos.bezeichnung,
        menge: pos.menge,
        preis: pos.einzelpreis,
        gesamt: pos.menge * pos.einzelpreis,
        bewilligt: bewilligt,
        istAUB: false
      };
    });

    // Schritt 2: Für JEDEN bewilligten LK die entsprechende AUB hinzufügen
    const benoetigteAUBs: RechnungsPosition[] = [];

    verarbeiteteLKs.forEach(lk => {
      if (lk.bewilligt && lk.menge > 0) {
        // Suche die passende AUB für diesen LK
        // AUB-Code ist z.B. "AUB_LK02" für "LK02" oder "AUB LK02"
        const lkCodeClean = lk.lkCode.toUpperCase().replace(/\s/g, '');

        const passenderAUB = aubPositionen.find(aub => {
          const aubCodeClean = aub.lkCode.toUpperCase().replace(/\s/g, '').replace('AUB_', '').replace('AUB', '');
          return aubCodeClean === lkCodeClean;
        });

        if (passenderAUB) {
          // AUB mit der GLEICHEN Menge wie der bewilligte LK hinzufügen
          benoetigteAUBs.push({
            lkCode: passenderAUB.lkCode,
            bezeichnung: passenderAUB.bezeichnung,
            menge: lk.menge, // Wichtig: gleiche Menge wie der LK!
            preis: passenderAUB.einzelpreis,
            gesamt: lk.menge * passenderAUB.einzelpreis,
            bewilligt: true, // AUB ist immer bewilligt wenn der LK bewilligt ist
            istAUB: true,
            zugehoerigLK: lk.lkCode
          });
        } else {
          // Fallback: AUB-Preis aus LK_PREISE holen wenn nicht in OCR gefunden
          const lkInfo = LK_PREISE[lkCodeClean];
          if (lkInfo && lkInfo.aubPreis > 0) {
            benoetigteAUBs.push({
              lkCode: `AUB_${lkCodeClean}`,
              bezeichnung: `AUB zu ${lk.bezeichnung}`,
              menge: lk.menge,
              preis: lkInfo.aubPreis,
              gesamt: lk.menge * lkInfo.aubPreis,
              bewilligt: true,
              istAUB: true,
              zugehoerigLK: lk.lkCode
            });
          }
        }
      }
    });

    // Schritt 3: Nicht bewilligte LKs bekommen ihre AUBs auch (aber als nicht bewilligt)
    verarbeiteteLKs.forEach(lk => {
      if (!lk.bewilligt && lk.menge > 0) {
        const lkCodeClean = lk.lkCode.toUpperCase().replace(/\s/g, '');

        const passenderAUB = aubPositionen.find(aub => {
          const aubCodeClean = aub.lkCode.toUpperCase().replace(/\s/g, '').replace('AUB_', '').replace('AUB', '');
          return aubCodeClean === lkCodeClean;
        });

        if (passenderAUB) {
          benoetigteAUBs.push({
            lkCode: passenderAUB.lkCode,
            bezeichnung: passenderAUB.bezeichnung,
            menge: lk.menge,
            preis: passenderAUB.einzelpreis,
            gesamt: lk.menge * passenderAUB.einzelpreis,
            bewilligt: false,
            istAUB: true,
            zugehoerigLK: lk.lkCode
          });
        } else {
          // Fallback
          const lkInfo = LK_PREISE[lkCodeClean];
          if (lkInfo && lkInfo.aubPreis > 0) {
            benoetigteAUBs.push({
              lkCode: `AUB_${lkCodeClean}`,
              bezeichnung: `AUB zu ${lk.bezeichnung}`,
              menge: lk.menge,
              preis: lkInfo.aubPreis,
              gesamt: lk.menge * lkInfo.aubPreis,
              bewilligt: false,
              istAUB: true,
              zugehoerigLK: lk.lkCode
            });
          }
        }
      }
    });

    // Alle Positionen zusammenführen: LKs + automatisch berechnete AUBs
    const neuePositionen: RechnungsPosition[] = [...verarbeiteteLKs, ...benoetigteAUBs];

    setRechnungPositionen(neuePositionen);
    setMedifoxPositionen(positionen);

    // Metadata verarbeiten
    if (metadata) {
      if (metadata.klient) {
        setKlientData(prev => ({ ...prev, name: metadata.klient }));
      }
      if (metadata.zeitraum) {
        // Zeitraum z.B. "01.09.2025 - 30.09.2025" parsen
        const match = metadata.zeitraum.match(/(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/);
        if (match) {
          const [, von, bis] = match;
          // DD.MM.YYYY zu YYYY-MM-DD konvertieren
          const vonISO = von.split('.').reverse().join('-');
          const bisISO = bis.split('.').reverse().join('-');
          setKlientData(prev => ({
            ...prev,
            zeitraumVon: vonISO,
            zeitraumBis: bisISO,
            name: metadata.klient || prev.name
          }));
        }
      }
      if (metadata.pflegegrad) {
        setKlientData(prev => ({
          ...prev,
          pflegegrad: metadata.pflegegrad,
          name: metadata.klient || prev.name
        }));
        setPflegekassenBetrag(PFLEGEGRAD_SACHLEISTUNG[metadata.pflegegrad] || pflegekassenBetrag);
      }
    }
  };

  // Funktion: Blob-Liste laden
  const loadBlobBewilligungen = async () => {
    setIsLoadingBlob(true);
    setBlobError('');
    try {
      const response = await fetch('/api/bewilligungen/list');
      const data = await response.json();

      if (data.success) {
        setBlobBewilligungen(data.bewilligungen);
      } else {
        setBlobError(data.error || 'Fehler beim Laden der Bewilligungen');
      }
    } catch (error: any) {
      setBlobError(error.message || 'Netzwerkfehler');
    } finally {
      setIsLoadingBlob(false);
    }
  };

  // Funktion: Bewilligung aus Blob laden
  const loadBewilligungFromBlob = async (url: string, filename: string) => {
    setIsLoadingBlob(true);
    setBlobError('');
    try {
      const response = await fetch(`/api/bewilligungen/download?url=${encodeURIComponent(url)}`);
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const file = new File([blob], filename, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      setExcelFile(file);
      await processExcelFile(file);
    } catch (error: any) {
      setBlobError(error.message || 'Fehler beim Laden der Datei');
    } finally {
      setIsLoadingBlob(false);
    }
  };

  // Funktion: Bewilligung in Blob speichern
  const saveBewilligungToBlob = async () => {
    if (!excelFile) {
      setBlobError('Keine Datei zum Speichern ausgewählt');
      return;
    }

    setIsSavingBlob(true);
    setBlobError('');
    try {
      const formData = new FormData();
      formData.append('file', excelFile);

      const response = await fetch('/api/bewilligungen/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Bewilligung erfolgreich gespeichert!');
        await loadBlobBewilligungen(); // Liste aktualisieren
        setUploadMode('blob'); // Wechsle zum Blob-Tab
      } else {
        setBlobError(data.error || 'Fehler beim Speichern');
      }
    } catch (error: any) {
      setBlobError(error.message || 'Netzwerkfehler');
    } finally {
      setIsSavingBlob(false);
    }
  };

  // useEffect: Blob-Liste beim Öffnen des Blob-Modus laden
  useEffect(() => {
    if (uploadMode === 'blob') {
      loadBlobBewilligungen();
    }
  }, [uploadMode]);

  const processExcelFile = async (file: File) => {
    setIsProcessing(true);
    setError('');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { 
        cellStyles: true,
        cellDates: true 
      });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      const rawData = XLSX.utils.sheet_to_json(sheet) as any[];
      
      const bewilligungData: BewilligungRow[] = rawData.map(row => ({
        lkCode: row['LK-Code'] || '',
        bezeichnung: row['Leistungsbezeichnung'] || '',
        jeWoche: row['Je Woche'] || 0,
        jeMonat: row['Je Monat'] || 0
      })).filter(row => row.lkCode && (row.jeWoche > 0 || row.jeMonat > 0));

      setBewilligung(bewilligungData);
      
      const extractedName = extractKlientName(workbook);
      if (extractedName) {
        setKlientData(prev => ({
          ...prev,
          name: extractedName
        }));
      }

      setIsProcessing(false);
      
      if (bewilligungData.length === 0) {
        setError('Keine Leistungen mit Mengen > 0 gefunden.');
      }
      
    } catch (err) {
      setError(`Fehler: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
      setIsProcessing(false);
    }
  };

  const addLK = () => {
    setBewilligung([...bewilligung, { lkCode: '', bezeichnung: '', jeWoche: 0, jeMonat: 0 }]);
  };

  const updateBewilligung = (index: number, field: keyof BewilligungRow, value: string | number) => {
    const updated = [...bewilligung];
    updated[index] = { ...updated[index], [field]: value };
    setBewilligung(updated);
  };

  const removeLK = (index: number) => {
    setBewilligung(bewilligung.filter((_, i) => i !== index));
  };

  const updateKlientData = (field: keyof KlientData, value: string | number) => {
    if (field === 'pflegegrad') {
      if (value === '') {
        setKlientData(prev => ({ ...prev, pflegegrad: '' }));
        setPflegekassenBetrag(0);
        return;
      }

      const numericValue = typeof value === 'number' ? value : parseInt(value, 10);

      if (!Number.isNaN(numericValue)) {
        setKlientData(prev => ({ ...prev, pflegegrad: numericValue }));
        setPflegekassenBetrag(PFLEGEGRAD_SACHLEISTUNG[numericValue] || 0);
      }
      return;
    }

    setKlientData(prev => ({ ...prev, [field]: value }));
  };

  const addRechnungsPosition = () => {
    const newPos: RechnungsPosition = {
      lkCode: '',
      bezeichnung: '',
      menge: 0,
      preis: 0,
      gesamt: 0,
      bewilligt: false,
      istAUB: false
    };
    setRechnungPositionen([...rechnungPositionen, newPos]);
  };

  const ladeAlleLKs = () => {
    const alleLKs: RechnungsPosition[] = Object.keys(LK_PREISE).map(lkCode => {
      const lkData = LK_PREISE[lkCode];
      const istBewilligt = bewilligung.some(b => b.lkCode.toUpperCase() === lkCode);
      
      return {
        lkCode: lkCode,
        bezeichnung: lkData.bezeichnung,
        menge: 0,
        preis: lkData.preis,
        gesamt: 0,
        bewilligt: istBewilligt,
        istAUB: false
      };
    });
    
    setRechnungPositionen(alleLKs);
  };

  const updateRechnungsPosition = (index: number, field: keyof RechnungsPosition, value: string | number | boolean) => {
    const updated = [...rechnungPositionen];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'lkCode') {
      const lkCode = (value as string).toUpperCase();
      const lkData = LK_PREISE[lkCode];
      
      if (lkData) {
        updated[index].bezeichnung = lkData.bezeichnung;
        updated[index].preis = lkData.preis;
        updated[index].gesamt = updated[index].menge * lkData.preis;
      }
      
      const istBewilligt = bewilligung.some(b => b.lkCode.toUpperCase() === lkCode);
      updated[index].bewilligt = istBewilligt;
    }
    
    if (field === 'menge') {
      updated[index].gesamt = (value as number) * updated[index].preis;
    }
    
    setRechnungPositionen(updated);
  };

  const removeRechnungsPosition = (index: number) => {
    setRechnungPositionen(rechnungPositionen.filter((_, i) => i !== index));
  };

  const berechneAUBs = (lkPositionen: RechnungsPosition[]): RechnungsPosition[] => {
    const aubPositionen: RechnungsPosition[] = [];
    
    lkPositionen.forEach(pos => {
      if (pos.menge > 0 && !pos.istAUB) {
        const lkData = LK_PREISE[pos.lkCode];
        if (lkData && lkData.aubPreis > 0) {
          aubPositionen.push({
            lkCode: `AUB`,
            bezeichnung: `Ausbildungsumlage zu ${pos.lkCode}`,
            menge: pos.menge,
            preis: lkData.aubPreis,
            gesamt: pos.menge * lkData.aubPreis,
            bewilligt: pos.bewilligt,
            istAUB: true,
            zugehoerigLK: pos.lkCode
          });
        }
      }
    });
    
    return aubPositionen;
  };

  const berechneRechnungFuerAnzeige = () => {
    let positionen = rechnungPositionen.filter(p => !p.istAUB && p.menge > 0).map(p => ({...p}));
    
    const lk14Pos = positionen.find(p => p.lkCode === 'LK14');
    const lk15Pos = positionen.find(p => p.lkCode === 'LK15');
    const lk14Bewilligt = bewilligung.find(b => b.lkCode.toUpperCase() === 'LK14');
    const lk15Bewilligt = bewilligung.find(b => b.lkCode.toUpperCase() === 'LK15');
    
    if (lk14Pos && lk15Pos && lk14Pos.menge > 0 && !lk14Bewilligt && lk15Bewilligt) {
      const lk15MaxMenge = lk15Bewilligt.jeMonat || (lk15Bewilligt.jeWoche * 4.33);
      const summeMengen = lk14Pos.menge + lk15Pos.menge;
      
      if (summeMengen <= lk15MaxMenge) {
        const lk14Index = positionen.findIndex(p => p.lkCode === 'LK14');
        positionen[lk14Index] = {
          ...lk14Pos,
          bewilligt: false,
          umgewandeltZu: 'LK15'
        };
        
        const lk15Index = positionen.findIndex(p => p.lkCode === 'LK15');
        positionen[lk15Index] = {
          ...lk15Pos,
          menge: summeMengen,
          gesamt: summeMengen * lk15Pos.preis,
          bewilligt: true,
          mengeAusUmwandlung: lk14Pos.menge
        };
      }
    }
    
    positionen = positionen.map(pos => {
      if (pos.umgewandeltZu) {
        return pos;
      }
      
      const bewilligtPos = bewilligung.find(b => b.lkCode.toUpperCase() === pos.lkCode.toUpperCase());
      if (bewilligtPos) {
        const maxMenge = bewilligtPos.jeMonat || Math.floor(bewilligtPos.jeWoche * 4.33);
        const originalMenge = pos.menge;
        
        if (pos.menge > maxMenge) {
          return {
            ...pos,
            menge: maxMenge,
            gesamt: maxMenge * pos.preis,
            bewilligt: true,
            gekuerztVon: originalMenge
          };
        }
        return { ...pos, bewilligt: true };
      }
      return { ...pos, bewilligt: false };
    });
    
    const bewilligtePositionen = positionen.filter(p => p.bewilligt);
    const aubPositionen = berechneAUBs(bewilligtePositionen);

    const gesamtBewilligt = bewilligtePositionen.reduce((sum, p) => sum + p.gesamt, 0);
    const gesamtAUB = aubPositionen.reduce((sum, p) => sum + p.gesamt, 0);
    const zwischensumme = gesamtBewilligt + gesamtAUB;
    const zinv = zwischensumme * 0.0338;
    const gesamtbetrag = zwischensumme + zinv;
    const rechnungsbetragBA = Math.max(0, gesamtbetrag - pflegekassenBetrag);

    const baZahltNurZINV = gesamtbetrag < pflegekassenBetrag;
    const finalRechnungsbetragBA = baZahltNurZINV ? zinv : rechnungsbetragBA;

    // LK14 hinzufügen wenn in Medifox vorhanden aber zu LK15 umgewandelt
    const lk14InMedifox = rechnungPositionen.find(pos => pos.lkCode === 'LK14');
    if (lk14InMedifox && !positionen.find(p => p.lkCode === 'LK14')) {
      positionen.push({
        lkCode: 'LK14',
        bezeichnung: lk14InMedifox.bezeichnung || 'Zubereitung warme Mahlzeit',
        menge: lk14InMedifox.menge,
        preis: lk14InMedifox.preis,
        gesamt: 0,
        bewilligt: false,
        umgewandeltZu: 'LK15'
      });
    }

    // Sortierung NACH LK14-Hinzufügung: Erst alle AUBs (1-20), dann alle LKs (01-20)
    positionen.sort((a, b) => {
      const aIsAUB = a.lkCode.startsWith('AUB');
      const bIsAUB = b.lkCode.startsWith('AUB');

      // Typ-Priorität: AUB kommt vor LK
      if (aIsAUB && !bIsAUB) return -1;
      if (!aIsAUB && bIsAUB) return 1;

      // Innerhalb der Gruppe: numerisch sortieren
      const numA = parseInt(a.lkCode.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.lkCode.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

    return {
      allePositionen: positionen,
      aubPositionen,
      gesamtBewilligt,
      gesamtAUB,
      zwischensumme,
      zinv,
      gesamtbetrag,
      rechnungsbetragBA: finalRechnungsbetragBA,
      baZahltNurZINV
    };
  };

  const wendeSonderregelnAn = (positionen: RechnungsPosition[]): RechnungsPosition[] => {
    const result = [...positionen];
    
    const lk14Pos = result.find(p => p.lkCode === 'LK14');
    const lk15Pos = result.find(p => p.lkCode === 'LK15');
    const lk14Bewilligt = bewilligung.find(b => b.lkCode.toUpperCase() === 'LK14');
    const lk15Bewilligt = bewilligung.find(b => b.lkCode.toUpperCase() === 'LK15');
    
    if (lk14Pos && lk15Pos && lk14Pos.menge > 0 && !lk14Bewilligt && lk15Bewilligt) {
      const lk15MaxMenge = lk15Bewilligt.jeMonat || (lk15Bewilligt.jeWoche * 4.33);
      const summeMengen = lk14Pos.menge + lk15Pos.menge;
      
      if (summeMengen <= lk15MaxMenge) {
        const lk15Index = result.indexOf(lk15Pos);
        result[lk15Index] = {
          ...lk15Pos,
          menge: summeMengen,
          gesamt: summeMengen * lk15Pos.preis,
          bewilligt: true
        };
        
        const lk14Index = result.indexOf(lk14Pos);
        result[lk14Index] = {
          ...lk14Pos,
          menge: 0,
          gesamt: 0,
          bewilligt: false
        };
      }
    }
    
    return result;
  };

  const berechneTheoretischeRechnung = () => {
    const aktivePositionen = rechnungPositionen.filter(p => !p.istAUB && p.menge > 0);
    const gesamtLK = aktivePositionen.reduce((sum, p) => sum + p.gesamt, 0);
    
    const aubAlle = berechneAUBs(aktivePositionen);
    const gesamtAUB = aubAlle.reduce((sum, p) => sum + p.gesamt, 0);
    
    const zwischensumme = gesamtLK + gesamtAUB;
    const zinv = zwischensumme * 0.0338;
    const gesamtbetrag = zwischensumme + zinv;
    
    return {
      anzahlPositionen: aktivePositionen.length,
      gesamtLK,
      gesamtAUB,
      zwischensumme,
      zinv,
      gesamtbetrag
    };
  };

  const berechneKorrekturrechnung = () => {
    let positionen = rechnungPositionen.filter(p => !p.istAUB && p.menge > 0).map(p => ({...p}));
    
    positionen = wendeSonderregelnAn(positionen);
    
    positionen = positionen.map(pos => {
      const bewilligtPos = bewilligung.find(b => b.lkCode.toUpperCase() === pos.lkCode.toUpperCase());
      if (bewilligtPos) {
        const maxMenge = bewilligtPos.jeMonat || Math.floor(bewilligtPos.jeWoche * 4.33);
        const originalMenge = pos.menge;
        
        if (pos.menge > maxMenge) {
          return {
            ...pos,
            menge: maxMenge,
            gesamt: maxMenge * pos.preis,
            bewilligt: true,
            gekuerztVon: originalMenge
          };
        }
        return { ...pos, bewilligt: true };
      }
      return { ...pos, bewilligt: false };
    });
    
    const bewilligtePositionen = positionen.filter(p => p.bewilligt && p.menge > 0);
    const nichtBewilligtePositionen = positionen.filter(p => !p.bewilligt && p.menge > 0);
    const gekuerztePositionen = positionen.filter(p => p.gekuerztVon && p.gekuerztVon > p.menge);
    
    const gesamtBewilligt = bewilligtePositionen.reduce((sum, p) => sum + p.gesamt, 0);
    const gesamtNichtBewilligt = nichtBewilligtePositionen.reduce((sum, p) => sum + p.gesamt, 0);
    
    const aubBewilligt = berechneAUBs(bewilligtePositionen);
    const aubNichtBewilligt = berechneAUBs(nichtBewilligtePositionen);
    
    const gesamtAUBBewilligt = aubBewilligt.reduce((sum, p) => sum + p.gesamt, 0);
    const gesamtAUBNichtBewilligt = aubNichtBewilligt.reduce((sum, p) => sum + p.gesamt, 0);
    
    const zwischensummeBA = gesamtBewilligt + gesamtAUBBewilligt;
    const zinvBA = zwischensummeBA * 0.0338;
    const gesamtbetragBA = zwischensummeBA + zinvBA;
    const rechnungsbetragBA = Math.max(0, gesamtbetragBA - pflegekassenBetrag);
    
    const baZahltNurZINV = gesamtbetragBA < pflegekassenBetrag;
    const finalRechnungsbetragBA = baZahltNurZINV ? zinvBA : rechnungsbetragBA;
    
    const privatLKPositionen: RechnungsPosition[] = [];
    
    nichtBewilligtePositionen.forEach(pos => privatLKPositionen.push(pos));
    
    gekuerztePositionen.forEach(pos => {
      if (pos.gekuerztVon) {
        const gekuerzteMenge = pos.gekuerztVon - pos.menge;
        privatLKPositionen.push({
          ...pos,
          menge: gekuerzteMenge,
          gesamt: gekuerzteMenge * pos.preis,
          bewilligt: false
        });
      }
    });
    
    const gesamtPrivatLK = privatLKPositionen.reduce((sum, p) => sum + p.gesamt, 0);
    const aubPrivat = berechneAUBs(privatLKPositionen);
    const gesamtPrivatAUB = aubPrivat.reduce((sum, p) => sum + p.gesamt, 0);
    
    const zwischensummePrivat = gesamtPrivatLK + gesamtPrivatAUB;
    const zinvPrivat = baZahltNurZINV ? 0 : (zwischensummePrivat * 0.0338);
    const gesamtbetragPrivat = zwischensummePrivat + zinvPrivat;
    
    return {
      bewilligtePositionen,
      nichtBewilligtePositionen,
      privatLKPositionen,
      aubBewilligt,
      aubNichtBewilligt,
      aubPrivat,
      gesamtBewilligt,
      gesamtAUBBewilligt,
      gesamtNichtBewilligt,
      gesamtAUBNichtBewilligt,
      zwischensummeBA,
      zinvBA,
      gesamtbetragBA,
      rechnungsbetragBA: finalRechnungsbetragBA,
      baZahltNurZINV,
      zwischensummePrivat,
      zinvPrivat,
      gesamtbetragPrivat,
      anzahlBewilligt: bewilligtePositionen.length,
      anzahlNichtBewilligt: nichtBewilligtePositionen.length,
      gesamtPrivatLK,
      gesamtPrivatAUB 
    };
  };

  const handlePrintOrDownload = (type: 'ba' | 'privat', action: 'print' | 'download') => {
    if (type === 'ba' && !rechnungsnummer) {
      setPdfType(type);
      setActionType(action);
      setShowRechnungsnummerModal(true);
    } else {
      executePrintOrDownload(type, action);
    }
  };

  const executePrintOrDownload = (type: 'ba' | 'privat', action: 'print' | 'download') => {
    if (type === 'ba') {
      setShowPdfPreview(true);
    } else {
      setShowPrivatPreview(true);
    }
    
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleRechnungsnummerSubmit = () => {
    if (rechnungsnummer.trim()) {
      setShowRechnungsnummerModal(false);
      executePrintOrDownload(pdfType, actionType || 'print');
    }
  };

  const theoretisch = berechneTheoretischeRechnung();
  const korrektur = berechneKorrekturrechnung();
  const rechnung = berechneRechnungFuerAnzeige();

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <img src={logoUrl} alt="DomusVita Logo" className="h-20 w-auto" />
              <div>
                <h1 className="text-4xl font-bold text-indigo-600 mb-2">
                  DomusVita Pflegeabrechnung
                </h1>
                <p className="text-gray-600">
                  Automatische Korrekturrechnung fuer BA/PK
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={ladeTestBewilligung}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm font-medium whitespace-nowrap"
              >
                🧪 Test-Bewilligung laden
              </button>
              <button
                onClick={ladeTestRechnungspositionen}
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 text-sm font-medium whitespace-nowrap"
              >
                🧪 Test-Rechnungen laden
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6 print:hidden">
          <img src={logoUrl} alt="DomusVita Logo" className="h-20 w-auto" />
          <div>
            <h1 className="text-4xl font-bold text-indigo-600 mb-2">
              DomusVita Pflegeabrechnung
            </h1>
            <p className="text-gray-600">
              Automatische Korrekturrechnung fuer BA/PK
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 print:hidden">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            Schritt 1: Grunddaten
          </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <label className="text-gray-600 block mb-1 font-medium">Pflegedienst auswählen:</label>
            <select
              value={pflegedienstKey}
              onChange={(e) => setPflegedienstKey(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="kreuzberg">Kreuzberg - Waldemarstr. 10 A</option>
              <option value="treptow">Treptow - Hoffmannstr. 15</option>
            </select>
          </div>

          <div>
            <label className="text-gray-600 block mb-1 font-medium">Wohnheim Standort auswählen:</label>
            <select
              value={wohnheimKey}
              onChange={(e) => setWohnheimKey(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="hebron">Haus Hebron - Hartriegelstr. 132</option>
              <option value="siefos">Siefos - Waldemarstr. 10a</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
          <div>
            <label className="text-gray-600 block mb-1">Name Klient:</label>
            <input
              type="text"
              placeholder="z.B. Tschida, Klaus"
              value={klientData.name}
              onChange={(e) => updateKlientData('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="text-gray-600 block mb-1">Pflegegrad:</label>
            <select
              value={klientData.pflegegrad === '' ? '' : String(klientData.pflegegrad)}
              onChange={(e) => updateKlientData('pflegegrad', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Bitte wählen...</option>
              <option value="1">Pflegegrad 1</option>
              <option value="2">Pflegegrad 2</option>
              <option value="3">Pflegegrad 3</option>
              <option value="4">Pflegegrad 4</option>
              <option value="5">Pflegegrad 5</option>
            </select>
          </div>


        </div>

        {/* Monatsauswahl */}
        <div className="mb-4 text-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Abrechnungsmonat:
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              const month = e.target.value;
              setSelectedMonth(month);

              if (month) {
                const [year, rawMonth] = month.split('-');
                if (year && rawMonth) {
                  const monthNumber = parseInt(rawMonth, 10);
                  if (!Number.isNaN(monthNumber)) {
                    const normalizedMonth = monthNumber.toString().padStart(2, '0');
                    const firstDayISO = `${year}-${normalizedMonth}-01`;
                    const lastDay = new Date(parseInt(year, 10), monthNumber, 0).getDate();
                    const lastDayISO = `${year}-${normalizedMonth}-${String(lastDay).padStart(2, '0')}`;

                    setAbrechnungszeitraumVon(firstDayISO);
                    setAbrechnungszeitraumBis(lastDayISO);
                    setKlientData(prev => ({
                      ...prev,
                      zeitraumVon: firstDayISO,
                      zeitraumBis: lastDayISO
                    }));
                  }
                }
              } else {
                setAbrechnungszeitraumVon('');
                setAbrechnungszeitraumBis('');
                setKlientData(prev => ({
                  ...prev,
                  zeitraumVon: '',
                  zeitraumBis: ''
                }));
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Automatisch befüllte Zeiträume (readonly) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Abrechnungszeitraum Von:
            </label>
            <input
              type="text"
              value={formatDateDisplay(abrechnungszeitraumVon)}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Abrechnungszeitraum Bis:
            </label>
            <input
              type="text"
              value={formatDateDisplay(abrechnungszeitraumBis)}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-800">
            <strong>Automatisch gesetzt:</strong> Pflegedienst: {dienst.name}, {dienst.strasse} |
            Klientenadresse: {klientAdresse}
          </p>
        </div>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 print:hidden">
          <h2 className="text-2xl font-bold text-purple-700 mb-6 flex items-center gap-2">
            <span>📋</span> Schritt 2: Bewilligte Leistungen
          </h2>

          {/* Tab-Navigation */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setUploadMode('manual')}
              className={`px-6 py-3 font-medium transition-all ${
                uploadMode === 'manual'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📤 Manueller Upload
            </button>
            <button
              onClick={() => setUploadMode('blob')}
              className={`px-6 py-3 font-medium transition-all ${
                uploadMode === 'blob'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ☁️ Aus Blob laden
            </button>
            {excelFile && (
              <button
                onClick={() => setUploadMode('save')}
                className={`px-6 py-3 font-medium transition-all ${
                  uploadMode === 'save'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                💾 In Blob speichern
              </button>
            )}
          </div>

          {/* Fehleranzeige */}
          {blobError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              ⚠️ {blobError}
            </div>
          )}

          {/* Modus: Manueller Upload */}
          {uploadMode === 'manual' && (
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3">
                <strong>Option A:</strong> Excel-Datei hochladen
              </p>

              <div
                onClick={() => document.getElementById('excel-input')?.click()}
                className="border-2 border-dashed border-green-400 rounded-xl p-8 text-center bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all cursor-pointer"
              >
                <input
                  id="excel-input"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setExcelFile(file);
                      processExcelFile(file);
                    }
                  }}
                  className="hidden"
                />
                <div className="flex flex-col items-center space-y-4">
                  <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <div>
                    <p className="text-lg font-semibold text-gray-700">
                      Excel-Datei hochladen
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Format: bewilligung_[nachname]_[DD.MM.YY]-[DD.MM.YY].xlsx
                    </p>
                  </div>
                </div>
              </div>

              {excelFile && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-green-800">
                        ✓ {excelFile.name}
                      </p>
                      <p className="text-sm text-green-600">
                        {(excelFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => setUploadMode('save')}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all"
                    >
                      💾 Jetzt speichern
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modus: Aus Blob laden */}
          {uploadMode === 'blob' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Gespeicherte Bewilligungen:</strong>
                </p>
                <button
                  onClick={loadBlobBewilligungen}
                  disabled={isLoadingBlob}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50"
                >
                  🔄 Aktualisieren
                </button>
              </div>

              {isLoadingBlob ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">Lade Bewilligungen...</p>
                </div>
              ) : blobBewilligungen.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-600">
                    📭 Keine gespeicherten Bewilligungen gefunden
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Lade eine Datei manuell hoch und speichere sie in Blob
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {blobBewilligungen.map((bewilligung, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all cursor-pointer"
                      onClick={() => loadBewilligungFromBlob(bewilligung.url, bewilligung.filename)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-blue-800">
                            📄 {bewilligung.filename}
                          </p>
                          <p className="text-sm text-blue-600">
                            {(bewilligung.size / 1024).toFixed(1)} KB • {new Date(bewilligung.uploadedAt).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Modus: In Blob speichern */}
          {uploadMode === 'save' && excelFile && (
            <div className="mb-6">
              <div className="p-6 bg-purple-50 border border-purple-200 rounded-xl">
                <h3 className="text-lg font-semibold text-purple-700 mb-4">
                  💾 Bewilligung in Vercel Blob speichern
                </h3>

                <div className="mb-4 p-4 bg-white rounded-lg border border-purple-200">
                  <p className="font-medium text-gray-800">
                    Dateiname: <span className="text-purple-600">{excelFile.name}</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Größe: {(excelFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>

                <button
                  onClick={saveBewilligungToBlob}
                  disabled={isSavingBlob}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all font-medium shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {isSavingBlob ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Speichere...
                    </span>
                  ) : (
                    '💾 Jetzt in Blob speichern'
                  )}
                </button>

                <p className="text-sm text-gray-600 mt-3 text-center">
                  Nach dem Speichern ist die Datei unter "Aus Blob laden" verfügbar
                </p>
              </div>
            </div>
          )}

        {isProcessing && (
          <div className="text-center py-4">
            <div className="animate-spin inline-block w-6 h-6 border-4 border-green-600 border-t-transparent rounded-full"></div>
            <p className="mt-2 text-sm text-gray-600">Verarbeite Excel...</p>
          </div>
        )}

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-yellow-800 text-sm">{error}</p>
          </div>
        )}

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">ODER</span>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-3">
            <strong>Option B:</strong> Manuell eingeben
          </p>

          <button
            onClick={addLK}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm mb-4"
          >
            + LK hinzufuegen
          </button>

          {bewilligung.length === 0 ? (
            <div className="text-center py-6 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
              <p className="text-sm">Noch keine Leistungen erfasst</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-green-100">
                  <tr>
                    <th className="px-3 py-2 text-left">LK-Code</th>
                    <th className="px-3 py-2 text-left">Bezeichnung</th>
                    <th className="px-3 py-2 text-right">Je Woche</th>
                    <th className="px-3 py-2 text-right">Je Monat</th>
                    <th className="px-3 py-2 text-center">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {bewilligung.map((row, idx) => (
                    <tr key={idx} className="border-b border-green-100 hover:bg-green-50">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          placeholder="LK04"
                          value={row.lkCode}
                          onChange={(e) => updateBewilligung(idx, 'lkCode', e.target.value)}
                          className="w-full px-2 py-1 border rounded font-mono text-sm" />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          placeholder="Grosse Koerperpflege"
                          value={row.bezeichnung}
                          onChange={(e) => updateBewilligung(idx, 'bezeichnung', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm" />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={row.jeWoche}
                          onChange={(e) => updateBewilligung(idx, 'jeWoche', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border rounded text-right text-sm" />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={row.jeMonat}
                          onChange={(e) => updateBewilligung(idx, 'jeMonat', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border rounded text-right text-sm" />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => removeLK(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          X
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>

        {bewilligung.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 print:hidden">
            <p className="text-green-800 text-sm">
              <strong>{bewilligung.length} Leistungen erfasst!</strong> Bereit fuer Schritt 3.
            </p>
          </div>
        )}

        {bewilligung.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 print:hidden">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">
              Schritt 3: Medifox-Rechnung (Originalrechnung)
            </h3>

            {/* OPTION A: OCR-Upload */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-indigo-700 mb-3">
                Option A: PDF hochladen (automatisch)
              </h4>
              <MedifoxOCRUploadExtended
                onPositionsExtracted={handleOCRPositionsExtracted}
                showMetadata={true}
              />
            </div>

            {/* ODER-Trennlinie */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-bold uppercase tracking-wide">ODER</span>
              </div>
            </div>

            {/* OPTION B: Manuelle Eingabe */}
            <div>
              <h4 className="text-md font-semibold text-purple-700 mb-3">
                Option B: Manuell eingeben
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                <strong>Rechnungspositionen aus Medifox (wie erbracht):</strong>
              </p>
              
              <div className="flex gap-3 mb-4">
                <button
                  onClick={ladeAlleLKs}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
                >
                  Alle LKs laden
                </button>
                <button
                  onClick={addRechnungsPosition}
                  className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 text-sm"
                >
                  + Einzelne Position
                </button>
              </div>

              {rechnungPositionen.length === 0 ? (
                <div className="text-center py-6 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-sm">Noch keine Positionen erfasst</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-purple-100">
                      <tr>
                        <th className="px-2 py-2 text-left">LK-Code</th>
                        <th className="px-2 py-2 text-left">Bezeichnung</th>
                        <th className="px-2 py-2 text-right">Menge</th>
                        <th className="px-2 py-2 text-right">Preis</th>
                        <th className="px-2 py-2 text-right">Gesamt</th>
                        <th className="px-2 py-2 text-center">Status</th>
                        <th className="px-2 py-2 text-center">Aktion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rechnungPositionen.map((pos, idx) => (
                        <tr key={idx} className={`border-b hover:bg-purple-50 ${pos.bewilligt ? 'bg-green-50' : 'bg-red-50'}`}>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={pos.lkCode}
                              readOnly
                              className="w-full px-2 py-1 border rounded font-mono text-sm bg-gray-100"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={pos.bezeichnung}
                              readOnly
                              className="w-full px-2 py-1 border rounded text-sm bg-gray-100"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={pos.menge}
                              onChange={(e) => updateRechnungsPosition(idx, 'menge', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border rounded text-right text-sm font-bold"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              step="0.01"
                              value={pos.preis}
                              readOnly
                              className="w-full px-2 py-1 border rounded text-right text-sm bg-gray-100"
                            />
                          </td>
                          <td className="px-2 py-2 text-right font-medium">
                            {pos.gesamt.toFixed(2)}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {pos.bewilligt ? (
                              <span className="text-green-600 font-bold text-lg">✓</span>
                            ) : (
                              <span className="text-red-600 font-bold text-lg">✗</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => removeRechnungsPosition(idx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              X
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {rechnungPositionen.filter(p => p.menge > 0).length > 0 && (
          <>
            <div className="hidden bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl shadow-lg p-6 mb-6 border-2 border-purple-200 print:hidden">
              <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
                <span>📊</span> Theoretische Gesamtrechnung (alle Positionen)
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                So wäre die Rechnung, wenn ALLES bewilligt wäre:
              </p>
              
              <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Anzahl LK-Positionen:</span>
                    <span className="font-semibold">{theoretisch.anzahlPositionen}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Summe LK:</span>
                    <span className="font-semibold">{theoretisch.gesamtLK.toFixed(2)} EUR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Summe AUB:</span>
                    <span className="font-semibold">{theoretisch.gesamtAUB.toFixed(2)} EUR</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-bold">Zwischensumme:</span>
                    <span className="font-bold">{theoretisch.zwischensumme.toFixed(2)} EUR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">ZINV (3,38%):</span>
                    <span className="font-semibold">{theoretisch.zinv.toFixed(2)} EUR</span>
                  </div>
                  <div className="flex justify-between border-t-2 border-purple-300 pt-2">
                    <span className="font-bold text-lg text-purple-800">Theoretischer Gesamtbetrag:</span>
                    <span className="font-bold text-xl text-purple-700">{theoretisch.gesamtbetrag.toFixed(2)} EUR</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden bg-white rounded-xl shadow-lg p-6 mb-6 print:hidden">
              <h3 className="text-lg font-semibold text-indigo-900 mb-4">
                Korrekturrechnung - Tatsächliche Abrechnung
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2">Bewilligt (BA)</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {korrektur.anzahlBewilligt} LK-Positionen
                  </p>
                  <p className="text-xl font-bold text-green-700">
                    {korrektur.gesamtBewilligt.toFixed(2)} EUR
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    + AUB: {korrektur.gesamtAUBBewilligt.toFixed(2)} EUR
                  </p>
                </div>

                <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
                  <h4 className="font-semibold text-red-800 mb-2">Nicht bewilligt (Privat)</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {korrektur.anzahlNichtBewilligt} LK-Positionen
                  </p>
                  <p className="text-xl font-bold text-red-700">
                    {korrektur.gesamtNichtBewilligt.toFixed(2)} EUR
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    + AUB: {korrektur.gesamtAUBNichtBewilligt.toFixed(2)} EUR
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">Pflegekasse</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Pflegegrad {klientData.pflegegrad}
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      value={klientData.pflegegrad === '' ? '' : String(klientData.pflegegrad)}
                      onChange={(e) => updateKlientData('pflegegrad', e.target.value)}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      <option value="">Bitte wählen...</option>
                      <option value="1">PG 1</option>
                      <option value="2">PG 2</option>
                      <option value="3">PG 3</option>
                      <option value="4">PG 4</option>
                      <option value="5">PG 5</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      value={pflegekassenBetrag}
                      onChange={(e) => setPflegekassenBetrag(parseFloat(e.target.value) || 0)}
                      className="w-32 px-2 py-1 border rounded text-right text-sm font-bold"
                    />
                    <span className="text-sm">EUR</span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 rounded-lg p-4 border-2 border-indigo-200 mb-6">
                <h4 className="font-semibold text-indigo-800 mb-3">Rechnungsbetrag BA:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Summe LK (bewilligt):</span>
                    <span className="font-semibold">{korrektur.gesamtBewilligt.toFixed(2)} EUR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Summe AUB:</span>
                    <span className="font-semibold">{korrektur.gesamtAUBBewilligt.toFixed(2)} EUR</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-bold">Zwischensumme:</span>
                    <span className="font-bold">{korrektur.zwischensummeBA.toFixed(2)} EUR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ZINV (3,38%):</span>
                    <span className="font-semibold">{korrektur.zinvBA.toFixed(2)} EUR</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-bold">Gesamtbetrag:</span>
                    <span className="font-bold">{korrektur.gesamtbetragBA.toFixed(2)} EUR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>./. Pflegekasse:</span>
                    <span className="font-semibold">{pflegekassenBetrag.toFixed(2)} EUR</span>
                  </div>
                  <div className="flex justify-between border-t-2 border-indigo-300 pt-2">
                    <span className="font-bold text-lg">Rechnungsbetrag BA:</span>
                    <span className="font-bold text-indigo-700 text-xl">
                      {korrektur.rechnungsbetragBA.toFixed(2)} EUR
                    </span>
                  </div>
                  {korrektur.baZahltNurZINV && (
                    <div className="bg-yellow-100 p-2 rounded mt-2">
                      <p className="text-xs text-yellow-800">
                        ⚠️ BA zahlt nur ZINV (Pflegekasse deckt Leistungen)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-200 mb-6">
                <h4 className="font-semibold text-orange-800 mb-3">Privatrechnung Klient:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Summe LK (nicht bewilligt/gekuerzt):</span>
                    <span className="font-semibold">{(korrektur.gesamtPrivatLK || 0).toFixed(2)} EUR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Summe AUB:</span>
                    <span className="font-semibold">{(korrektur.gesamtPrivatAUB || 0).toFixed(2)} EUR</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-bold">Zwischensumme:</span>
                    <span className="font-bold">{korrektur.zwischensummePrivat.toFixed(2)} EUR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ZINV (3,38%):</span>
                    <span className="font-semibold">{korrektur.zinvPrivat.toFixed(2)} EUR</span>
                  </div>
                  <div className="flex justify-between border-t-2 border-orange-300 pt-2">
                    <span className="font-bold text-lg">Privatrechnung gesamt:</span>
                    <span className="font-bold text-orange-700 text-xl">
                      {korrektur.gesamtbetragPrivat.toFixed(2)} EUR
                    </span>
                  </div>
                </div>
                </div>

              <div className="mt-6 space-y-4">
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Korrekturrechnung BA:</h4>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handlePrintOrDownload('ba', 'print')}
                      className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
                    >
                      🖨️ Drucken
                    </button>
                    <button
                      onClick={() => handlePrintOrDownload('ba', 'download')}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium"
                    >
                      💾 Als PDF speichern
                    </button>
                    <button
                      onClick={() => setShowPreviewNew(true)}
                      className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-medium"
                    >
                      📄 Vorschau BA (Neu)
                    </button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Privatrechnung Klient:</h4>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handlePrintOrDownload('privat', 'print')}
                      className="flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 font-medium"
                    >
                      🖨️ Drucken
                    </button>
                    <button 
                      onClick={() => handlePrintOrDownload('privat', 'download')}
                      className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-medium"
                    >
                      💾 Als PDF speichern
                    </button>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <button
                    onClick={handleNeueRechnung}
                    className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 font-medium"
                  >
                    🔄 Neue Korrekturrechnung erstellen
                  </button>
                </div>
              </div>
            </div>

            {/* Button für neue Rechnung - außerhalb des versteckten Bereichs */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6 print:hidden">
              <div className="mt-6 space-y-4">
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Korrekturrechnung BA:</h4>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPreviewNew(true)}
                      className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-medium"
                    >
                      📄 Vorschau BA (Neu)
                    </button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <button
                    onClick={handleNeueRechnung}
                    className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 font-medium"
                  >
                    🔄 Neue Korrekturrechnung erstellen
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {showRechnungsnummerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Rechnungsnummer eingeben</h3>
              <p className="text-sm text-gray-600 mb-4">
                Bitte geben Sie die Rechnungsnummer ein:
              </p>
              <input
                type="text"
                value={rechnungsnummer}
                onChange={(e) => setRechnungsnummer(e.target.value)}
                placeholder="z.B. RG-2025-001"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={handleRechnungsnummerSubmit}
                  disabled={!rechnungsnummer.trim()}
                  className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
                >
                  Weiter
                </button>
                <button
                  onClick={() => setShowRechnungsnummerModal(false)}
                  className="flex-1 bg-gray-400 text-white px-6 py-3 rounded-lg hover:bg-gray-500 font-medium"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}

        {showPdfPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto print:bg-white print:relative print:block print:overflow-visible">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto my-8 print:max-w-none print:max-h-none print:overflow-visible print:m-0 print:shadow-none print:rounded-none">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10 print:hidden">
                <h3 className="text-xl font-bold text-gray-800">Korrekturrechnung BA</h3>
                <button
                  onClick={() => setShowPdfPreview(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  X
                </button>
              </div>

              <div className="p-8 print:p-0">
                <style dangerouslySetInnerHTML={{__html: `
                  @media print {
                    @page {
                      size: A4 portrait;
                      margin: 3.5cm 1.25cm 3cm 1.75cm;
                    }
                    body {
                      font-family: Arial, Helvetica, sans-serif;
                      font-size: 9pt;
                      line-height: 11pt;
                      font-variant-numeric: tabular-nums;
                    }
                    .invoice-header-imprint {
                      font-family: Calibri, "Segoe UI", system-ui, sans-serif;
                      font-size: 8pt;
                      line-height: 11pt;
                    }
                    .invoice-meta {
                      font-size: 10pt;
                      line-height: 12.7pt;
                    }
                    .fixed-header {
                      position: fixed;
                      top: 0;
                      left: 0;
                      right: 0;
                      height: 3cm;
                      display: flex;
                      justify-content: space-between;
                      align-items: flex-start;
                      padding: 0.5cm 1.25cm 0.5cm 1.75cm;
                      background: white;
                      z-index: 1000;
                    }
                    .fixed-footer {
                      position: fixed;
                      bottom: 0;
                      left: 0;
                      right: 0;
                      height: 2.5cm;
                      padding: 0.3cm 1.25cm 0.5cm 1.75cm;
                      background: white;
                      border-top: 2px solid #4F46E5;
                      font-family: Calibri, "Segoe UI", system-ui, sans-serif;
                      font-size: 8pt;
                      line-height: 1.6;
                      text-align: center;
                      z-index: 1000;
                    }
                    /* Table pagination - prevent row splitting */
                    .invoice-table {
                      page-break-inside: auto;
                    }
                    .invoice-table thead {
                      display: table-header-group;
                    }
                    .invoice-table tfoot {
                      display: table-footer-group;
                    }
                    .invoice-table tr {
                      page-break-inside: avoid;
                      page-break-after: auto;
                    }
                    .invoice-table td,
                    .invoice-table th {
                      page-break-inside: avoid;
                    }
                    .invoice-table thead th {
                      font-style: italic;
                      font-size: 9pt;
                    }
                    .invoice-table tbody td {
                      font-size: 9pt;
                      line-height: 11pt;
                    }
                    .invoice-total-label {
                      font-weight: 700;
                      font-size: 12pt;
                    }
                  }
                `}} />

                {/* Fixed Header - appears on every page */}
                <div className="fixed-header print:block hidden">
                  <div className="flex-1">
                    <img src={logoUrl} alt="DomusVita Logo" style={{ height: '50px', width: 'auto' }} />
                  </div>
                  <div className="text-right invoice-header-imprint" style={{ fontSize: '8pt', color: '#666' }}>
                    <p style={{ fontWeight: 'bold', margin: 0 }}>{dienst.name}</p>
                    <p style={{ margin: 0 }}>{dienst.strasse}</p>
                    <p style={{ margin: 0 }}>{dienst.plz}</p>
                    <p style={{ margin: '4px 0 0 0' }}>IK: {dienst.ik}</p>
                  </div>
                </div>

                {/* Fixed Footer - appears on every page */}
                <div className="fixed-footer print:block hidden">
                  <p style={{ margin: '2px 0', fontWeight: 'bold' }}>Sitz der Gesellschaft: DomusVita Gesundheit GmbH • Waldemarstrasse 10 A • 10999 Berlin</p>
                  <p style={{ margin: '2px 0' }}>Telefon: 030/6120152-0 • Telefax: 030/6120152-10 • E-Mail: kreuzberg@domusvita.de • www.domusvita.de</p>
                  <p style={{ margin: '2px 0' }}>Geschäftsführer: Lukas Dahrendorf • Alexander Ebel</p>
                  <p style={{ margin: '2px 0' }}>Bankverbindung: DE53100500000190998890 • BIC: BELADEBEXXX • Berliner Sparkasse</p>
                  <p style={{ margin: '2px 0' }}>AG Berlin Charlottenburg • HRB 87436 B • Steuernummer: 29/582/51396</p>
                </div>

                <div
                  className="bg-white"
                  style={{ fontFamily: 'Arial, sans-serif', fontSize: '9pt', lineHeight: '11pt' }}
                >
                  <div className="bg-white invoice-body" style={{ fontFamily: 'Arial, sans-serif', fontSize: '9pt', lineHeight: '11pt' }}>
                    <div className="mb-6 print:hidden">
                      <div className="flex items-start justify-between mb-4 pb-3" style={{ borderBottom: '2px solid #4F46E5' }}>
                        <div className="flex-1">
                          <img src={logoUrl} alt="DomusVita Logo" style={{ height: '60px', width: 'auto' }} />
                        </div>
                        <div className="text-right invoice-header-imprint" style={{ fontSize: '8pt', color: '#666' }}>
                          <p style={{ fontWeight: 'bold', margin: 0 }}>{dienst.name}</p>
                          <p style={{ margin: 0 }}>{dienst.strasse}</p>
                          <p style={{ margin: 0 }}>{dienst.plz}</p>
                          <p style={{ margin: '4px 0 0 0' }}>IK: {dienst.ik}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 invoice-header-imprint" style={{ fontSize: '8pt', color: '#666' }}>
                      <p style={{ margin: 0 }}>{dienst.name}, {dienst.strasse}, {dienst.plz}</p>
                    </div>

                    <div className="invoice-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', fontSize: '10pt', lineHeight: '12.7pt' }}>
                      <div>
                        <p style={{ fontWeight: 'bold', margin: 0 }}>Bezirksamt Mitte von Berlin</p>
                        <p style={{ margin: 0 }}>Standort Wedding</p>
                        <p style={{ margin: 0 }}>Muellerstrasse 146 - 147</p>
                        <p style={{ margin: 0 }}>13344 Berlin</p>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '10pt' }}>
                        <p style={{ margin: 0 }}>Telefon: {dienst.telefon}</p>
                        <p style={{ margin: 0 }}>Telefax: {dienst.telefax}</p>
                        <p style={{ margin: 0 }}>E-Mail: {dienst.email}</p>
                        <p style={{ fontWeight: 'bold', marginTop: '4px', margin: 0 }}>Datum: Berlin, {new Date().toLocaleDateString('de-DE')}</p>
                      </div>
                    </div>

                    <div style={{ border: '1px solid #E5E7EB', borderRadius: '4px', padding: '8px', marginBottom: '12px', background: '#F9FAFB' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '9pt', lineHeight: '11pt' }}>
                        <div>
                          <p style={{ margin: 0 }}><strong>Rechnung Nr.: {rechnungsnummer}</strong></p>
                          <p style={{ margin: 0 }}><strong>Debitor:</strong> {klientData.debitor}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ margin: 0 }}><strong>IK:</strong> {dienst.ik}</p>
                        </div>
                      </div>
                      <p style={{ fontSize: '9pt', lineHeight: '11pt', marginTop: '6px', margin: 0 }}>
                        <strong>Abrechnungszeitraum:</strong> {zeitraumVonDisplay} bis {zeitraumBisDisplay}
                      </p>
                    </div>

                    <div className="invoice-meta" style={{ border: '1px solid #DBEAFE', padding: '8px', marginBottom: '12px', background: '#EFF6FF' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '10pt', lineHeight: '12.7pt' }}>
                        <div>
                          <p style={{ margin: 0 }}><strong>Leistungsempfaenger:</strong></p>
                          <p style={{ fontWeight: 'bold', margin: '2px 0' }}>{klientData.name}</p>
                          <p style={{ margin: 0 }}>{klientAdresse}</p>
                        </div>
                        <div>
                          <p style={{ margin: 0 }}><strong>Pflegegrad:</strong> {klientData.pflegegrad}</p>
                          <p style={{ margin: '4px 0 0 0' }}><strong>Leistungsgrundlage:</strong> SGB XI §36</p>
                        </div>
                      </div>
                    </div>

                    <table className="invoice-table" style={{ width: '100%', fontSize: '9pt', lineHeight: '11pt', marginBottom: '12px', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
                      <thead>
                        <tr style={{ background: '#C7D2FE' }}>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px 4px', textAlign: 'left', fontStyle: 'italic', fontWeight: 'normal' }}>Abk.</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px 4px', textAlign: 'left', fontStyle: 'italic', fontWeight: 'normal' }}>Leistung</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px 4px', textAlign: 'right', fontStyle: 'italic', fontWeight: 'normal' }}>Anzahl</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px 4px', textAlign: 'right', fontStyle: 'italic', fontWeight: 'normal' }}>Einzelpreis</th>
                          <th style={{ border: '1px solid #E5E7EB', padding: '6px 4px', textAlign: 'right', fontStyle: 'italic', fontWeight: 'normal' }}>Gesamtpreis</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rechnung.aubPositionen.map((pos, idx) => (
                          <tr key={`aub-${idx}`}>
                            <td style={{ border: '1px solid #E5E7EB', padding: '4px' }}>AUB</td>
                            <td style={{ border: '1px solid #E5E7EB', padding: '4px' }}>{pos.bezeichnung}</td>
                            <td style={{ border: '1px solid #E5E7EB', padding: '4px', textAlign: 'right' }}>{pos.menge.toFixed(2)}</td>
                            <td style={{ border: '1px solid #E5E7EB', padding: '4px', textAlign: 'right' }}>{pos.preis.toFixed(2)}</td>
                            <td style={{ border: '1px solid #E5E7EB', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>{pos.gesamt.toFixed(2)}</td>
                          </tr>
                        ))}

                        {rechnung.allePositionen.map((pos, idx) => (
                          <tr key={`lk-${idx}`} style={{ background: !pos.bewilligt ? '#FEF2F2' : '' }}>
                            <td style={{ border: '1px solid #E5E7EB', padding: '4px' }}>
                              <span style={{ textDecoration: pos.umgewandeltZu ? 'line-through' : 'none', color: pos.umgewandeltZu ? '#9CA3AF' : 'inherit' }}>
                                {pos.lkCode}
                              </span>
                            </td>
                            <td style={{ border: '1px solid #E5E7EB', padding: '4px' }}>
                              <span style={{ textDecoration: pos.umgewandeltZu ? 'line-through' : 'none', color: pos.umgewandeltZu ? '#9CA3AF' : 'inherit' }}>
                                {pos.lkCode} {pos.bezeichnung}
                              </span>
                              {pos.umgewandeltZu && (
                                <span style={{ color: '#2563EB', marginLeft: '6px', fontWeight: 'bold', fontSize: '8px' }}>
                                  → in {pos.umgewandeltZu} umgewandelt
                                </span>
                              )}
                              {pos.mengeAusUmwandlung && (
                                <span style={{ color: '#2563EB', marginLeft: '6px', fontSize: '8px' }}>
                                  (inkl. {pos.mengeAusUmwandlung} aus LK14)
                                </span>
                              )}
                              {!pos.bewilligt && !pos.umgewandeltZu && (
                                <span style={{ display: 'block', color: '#DC2626', fontSize: '8px', fontStyle: 'italic', marginTop: '2px' }}>
                                  ⚠ erbracht, aktuell nicht bewilligt
                                </span>
                              )}
                              {pos.gekuerztVon && (
                                <span style={{ display: 'block', color: '#EA580C', fontSize: '8px', fontStyle: 'italic', marginTop: '2px' }}>
                                  ℹ gekuerzt von {pos.gekuerztVon} auf {pos.menge}
                                </span>
                              )}
                            </td>
                            <td style={{ border: '1px solid #E5E7EB', padding: '4px', textAlign: 'right' }}>
                              <span style={{ textDecoration: pos.umgewandeltZu ? 'line-through' : 'none', color: pos.umgewandeltZu ? '#9CA3AF' : 'inherit' }}>
                                {pos.menge.toFixed(2)}
                              </span>
                            </td>
                            <td style={{ border: '1px solid #E5E7EB', padding: '4px', textAlign: 'right' }}>
                              <span style={{ textDecoration: pos.umgewandeltZu ? 'line-through' : 'none', color: pos.umgewandeltZu ? '#9CA3AF' : 'inherit' }}>
                                {pos.preis.toFixed(2)}
                              </span>
                            </td>
                            <td style={{ border: '1px solid #E5E7EB', padding: '4px', textAlign: 'right' }}>
                              {pos.bewilligt ? (
                                <span style={{ fontWeight: 'bold' }}>{pos.gesamt.toFixed(2)}</span>
                              ) : (
                                <span style={{ color: '#9CA3AF' }}>0,00</span>
                              )}
                            </td>
                          </tr>
                        ))}

                        <tr style={{ background: '#E5E7EB', fontWeight: 'bold' }}>
                          <td colSpan={4} style={{ border: '1px solid #E5E7EB', padding: '4px', textAlign: 'right' }}>Zwischensumme:</td>
                          <td style={{ border: '1px solid #E5E7EB', padding: '4px', textAlign: 'right' }}>{rechnung.zwischensumme.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid #E5E7EB', padding: '4px' }}>ZINV</td>
                          <td style={{ border: '1px solid #E5E7EB', padding: '4px' }}>Investitionskosten 3,38%</td>
                          <td style={{ border: '1px solid #E5E7EB', padding: '4px', textAlign: 'right' }}>1,00</td>
                          <td style={{ border: '1px solid #E5E7EB', padding: '4px', textAlign: 'right' }}>{rechnung.zinv.toFixed(2)}</td>
                          <td style={{ border: '1px solid #E5E7EB', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>{rechnung.zinv.toFixed(2)}</td>
                        </tr>
                        <tr style={{ background: '#E5E7EB', fontWeight: 'bold' }}>
                          <td colSpan={4} style={{ padding: '4px', textAlign: 'right' }}>Gesamtbetrag:</td>
                          <td style={{ padding: '4px', textAlign: 'right' }}>{rechnung.gesamtbetrag.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td colSpan={4} style={{ padding: '4px', textAlign: 'right' }}>./. Anteil Pflegekasse:</td>
                          <td style={{ padding: '4px', textAlign: 'right' }}>{pflegekassenBetrag.toFixed(2)}</td>
                        </tr>
                        <tr className="invoice-total-label" style={{ background: '#C7D2FE', fontWeight: 'bold', fontSize: '12pt' }}>
                          <td colSpan={4} style={{ padding: '6px 4px', textAlign: 'right' }}>Rechnungsbetrag:</td>
                          <td style={{ padding: '6px 4px', textAlign: 'right', color: '#4F46E5' }}>{rechnung.rechnungsbetragBA.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ background: '#FEF3C7', borderLeft: '3px solid #F59E0B', padding: '8px', marginBottom: '12px', fontSize: '10pt', lineHeight: '12.7pt' }}>
                      <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>Hinweis:</p>
                      <p style={{ margin: 0 }}>Positionen mit "erbracht, aktuell nicht bewilligt" wurden dokumentarisch aufgefuehrt, fliessen jedoch nicht in die Rechnungssumme ein.</p>
                    </div>

                    <p style={{ fontSize: '10pt', lineHeight: '12.7pt', margin: '8px 0' }}>Zahlbar bis zum {new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('de-DE')} ohne Abzug.</p>
                    <p style={{ fontSize: '10pt', lineHeight: '12.7pt', margin: 0 }}>Umsatzsteuerfrei gemaess § 4 Nr. 16 UStG</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showPrivatPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto print:bg-white print:relative print:block print:overflow-visible print:p-0">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8 print:max-w-none print:max-h-none print:overflow-visible print:m-0 print:shadow-none print:rounded-none">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10 print:hidden">
                <h3 className="text-xl font-bold text-gray-800">Privatrechnung Klient</h3>
                <button
                  onClick={() => setShowPrivatPreview(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  X
                </button>
              </div>

              <div className="p-8 print:p-0">
                <style dangerouslySetInnerHTML={{__html: `
                  @media print {
                    @page {
                      size: A4 portrait;
                      margin: 3.5cm 1.25cm 3cm 1.75cm;
                    }
                    body {
                      font-family: Arial, Helvetica, sans-serif;
                      font-size: 9pt;
                      line-height: 11pt;
                      font-variant-numeric: tabular-nums;
                    }
                    .invoice-header-imprint {
                      font-family: Calibri, "Segoe UI", system-ui, sans-serif;
                      font-size: 8pt;
                      line-height: 11pt;
                    }
                    .invoice-meta {
                      font-size: 10pt;
                      line-height: 12.7pt;
                    }
                    .fixed-header-privat {
                      position: fixed;
                      top: 0;
                      left: 0;
                      right: 0;
                      height: 3cm;
                      display: flex;
                      justify-content: space-between;
                      align-items: flex-start;
                      padding: 0.5cm 1.25cm 0.5cm 1.75cm;
                      background: white;
                      z-index: 1000;
                    }
                    .fixed-footer-privat {
                      position: fixed;
                      bottom: 0;
                      left: 0;
                      right: 0;
                      height: 2.5cm;
                      padding: 0.3cm 1.25cm 0.5cm 1.75cm;
                      background: white;
                      border-top: 2px solid #EA580C;
                      font-family: Calibri, "Segoe UI", system-ui, sans-serif;
                      font-size: 8pt;
                      line-height: 1.6;
                      text-align: center;
                      z-index: 1000;
                    }
                    /* Table pagination - prevent row splitting */
                    .invoice-table {
                      page-break-inside: auto;
                    }
                    .invoice-table thead {
                      display: table-header-group;
                    }
                    .invoice-table tfoot {
                      display: table-footer-group;
                    }
                    .invoice-table tr {
                      page-break-inside: avoid;
                      page-break-after: auto;
                    }
                    .invoice-table td,
                    .invoice-table th {
                      page-break-inside: avoid;
                    }
                    .invoice-table thead th {
                      font-style: italic;
                      font-size: 9pt;
                    }
                    .invoice-table tbody td {
                      font-size: 9pt;
                      line-height: 11pt;
                    }
                    .invoice-total-label {
                      font-weight: 700;
                      font-size: 12pt;
                    }
                  }
                `}} />

                {/* Fixed Header - appears on every page */}
                <div className="fixed-header-privat print:block hidden">
                  <div className="flex-1">
                    <img src={logoUrl} alt="DomusVita Logo" style={{ height: '50px', width: 'auto' }} />
                  </div>
                  <div className="text-right invoice-header-imprint" style={{ fontSize: '8pt', color: '#666' }}>
                    <p style={{ fontWeight: 'bold', margin: 0 }}>{dienst.name}</p>
                    <p style={{ margin: 0 }}>{dienst.strasse}</p>
                    <p style={{ margin: 0 }}>{dienst.plz}</p>
                    <p style={{ margin: '4px 0 0 0' }}>IK: {dienst.ik}</p>
                  </div>
                </div>

                {/* Fixed Footer - appears on every page */}
                <div className="fixed-footer-privat print:block hidden">
                  <p style={{ margin: '2px 0', fontWeight: 'bold' }}>Sitz der Gesellschaft: DomusVita Gesundheit GmbH • Waldemarstrasse 10 A • 10999 Berlin</p>
                  <p style={{ margin: '2px 0' }}>Telefon: 030/6120152-0 • Telefax: 030/6120152-10 • E-Mail: kreuzberg@domusvita.de • www.domusvita.de</p>
                  <p style={{ margin: '2px 0' }}>Geschäftsführer: Lukas Dahrendorf • Alexander Ebel</p>
                  <p style={{ margin: '2px 0' }}>Bankverbindung: DE53100500000190998890 • BIC: BELADEBEXXX • Berliner Sparkasse</p>
                  <p style={{ margin: '2px 0' }}>AG Berlin Charlottenburg • HRB 87436 B • Steuernummer: 29/582/51396</p>
                </div>

                <div className="bg-white invoice-body" style={{ fontFamily: 'Arial, sans-serif', fontSize: '9pt', lineHeight: '11pt' }}>
                  <div className="mb-6 print:hidden">
                    <div className="flex items-start justify-between mb-4 pb-3" style={{ borderBottom: '2px solid #EA580C' }}>
                      <div className="flex-1">
                        <img src={logoUrl} alt="DomusVita Logo" style={{ height: '60px', width: 'auto' }} />
                      </div>
                      <div className="text-right invoice-header-imprint" style={{ fontSize: '8pt', color: '#666' }}>
                        <p style={{ fontWeight: 'bold', margin: 0 }}>{dienst.name}</p>
                        <p style={{ margin: 0 }}>{dienst.strasse}</p>
                        <p style={{ margin: 0 }}>{dienst.plz}</p>
                      </div>
                    </div>
                  </div>

                  <div className="invoice-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', fontSize: '10pt', lineHeight: '12.7pt' }}>
                    <div>
                      <p style={{ fontWeight: 'bold', margin: 0 }}>{klientData.name}</p>
                      <p style={{ margin: 0 }}>{klientAdresse}</p>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '10pt' }}>
                      <p style={{ margin: 0 }}>Telefon: {dienst.telefon}</p>
                      <p style={{ margin: 0 }}>Telefax: {dienst.telefax}</p>
                      <p style={{ margin: 0 }}>E-Mail: {dienst.email}</p>
                      <p style={{ fontWeight: 'bold', marginTop: '4px', margin: 0 }}>Datum: Berlin, {new Date().toLocaleDateString('de-DE')}</p>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', padding: '8px 0', marginBottom: '12px', background: '#FFF7ED' }}>
                    <h2 style={{ fontSize: '12pt', fontWeight: 'bold', textAlign: 'center', margin: 0 }}>PRIVATRECHNUNG</h2>
                    <p style={{ fontSize: '10pt', lineHeight: '12.7pt', textAlign: 'center', margin: '2px 0 0 0' }}>Nicht bewilligte Leistungen</p>
                  </div>

                  <div className="invoice-meta" style={{ border: '1px solid #E5E7EB', padding: '8px', marginBottom: '12px', fontSize: '10pt', lineHeight: '12.7pt' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <p style={{ margin: 0 }}><strong>Abrechnungszeitraum:</strong> {zeitraumVonDisplay} bis {zeitraumBisDisplay}</p>
                        <p style={{ margin: '2px 0 0 0' }}><strong>Leistungsempfaenger:</strong> {klientData.name}</p>
                      </div>
                      <div>
                        <p style={{ margin: 0 }}><strong>Pflegegrad:</strong> {klientData.pflegegrad}</p>
                        <p style={{ margin: '4px 0 0 0' }}><strong>Leistungsgrundlage:</strong> SGB XI §36</p>
                      </div>
                    </div>
                  </div>

                  <table className="invoice-table" style={{ width: '100%', fontSize: '9pt', lineHeight: '11pt', marginBottom: '12px', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
                    <thead>
                      <tr style={{ background: '#FED7AA' }}>
                        <th style={{ border: '1px solid #E5E7EB', padding: '6px 4px', textAlign: 'left', fontStyle: 'italic', fontWeight: 'normal' }}>Abk.</th>
                        <th style={{ border: '1px solid #E5E7EB', padding: '6px 4px', textAlign: 'left', fontStyle: 'italic', fontWeight: 'normal' }}>Leistung</th>
                        <th style={{ border: '1px solid #E5E7EB', padding: '6px 4px', textAlign: 'right', fontStyle: 'italic', fontWeight: 'normal' }}>Anzahl</th>
                        <th style={{ border: '1px solid #E5E7EB', padding: '6px 4px', textAlign: 'right', fontStyle: 'italic', fontWeight: 'normal' }}>Einzelpreis</th>
                        <th style={{ border: '1px solid #E5E7EB', padding: '6px 4px', textAlign: 'right', fontStyle: 'italic', fontWeight: 'normal' }}>Gesamtpreis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {korrektur.aubPrivat.map((pos, idx) => (
                        <tr key={idx}>
                          <td style={{ border: '1px solid #E5E7EB', padding: '4px' }}>AUB</td>
                          <td style={{ border: '1px solid #E5E7EB', padding: '4px' }}>{pos.bezeichnung}</td>
                          <td style={{ border: '1px solid #E5E7EB', padding: '4px', textAlign: 'right' }}>{pos.menge.toFixed(2)}</td>
                          <td style={{ border: '1px solid #E5E7EB', padding: '4px', textAlign: 'right' }}>{pos.preis.toFixed(2)}</td>
                          <td style={{ border: '1px solid #E5E7EB', padding: '4px', textAlign: 'right' }}>{pos.gesamt.toFixed(2)}</td>
                        </tr>
                      ))}
                      {korrektur.privatLKPositionen.map((pos, idx) => (
                        <tr key={idx}>
                          <td style={{ border: '1px solid #E5E7EB', padding: '4px' }}>{pos.lkCode}</td>
                          <td style={{ border: '1px solid #E5E7EB', padding: '4px' }}>{pos.bezeichnung}</td>
                          <td style={{ border: '1px solid #E5E7EB', padding: '4px', textAlign: 'right' }}>{pos.menge.toFixed(2)}</td>
                          <td style={{ border: '1px solid #E5E7EB', padding: '4px', textAlign: 'right' }}>{pos.preis.toFixed(2)}</td>
                          <td style={{ border: '1px solid #E5E7EB', padding: '4px', textAlign: 'right' }}>{pos.gesamt.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: '#E5E7EB' }}>
                        <td colSpan={4} style={{ border: '1px solid #E5E7EB', padding: '4px', textAlign: 'right' }}><strong>Zwischensumme:</strong></td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '4px', textAlign: 'right' }}><strong>{korrektur.zwischensummePrivat.toFixed(2)}</strong></td>
                      </tr>
                      <tr>
                        <td colSpan={4} style={{ border: '1px solid #E5E7EB', padding: '4px', textAlign: 'right' }}>ZINV (3,38%):</td>
                        <td style={{ border: '1px solid #E5E7EB', padding: '4px', textAlign: 'right' }}>{korrektur.zinvPrivat.toFixed(2)}</td>
                      </tr>
                      <tr className="invoice-total-label" style={{ background: '#FED7AA', fontWeight: 'bold', fontSize: '12pt' }}>
                        <td colSpan={4} style={{ padding: '6px 4px', textAlign: 'right' }}>Rechnungsbetrag:</td>
                        <td style={{ padding: '6px 4px', textAlign: 'right', color: '#EA580C' }}>{korrektur.gesamtbetragPrivat.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ background: '#FEF3C7', padding: '8px', borderRadius: '6px', fontSize: '10pt', lineHeight: '12.7pt', marginTop: '12px' }}>
                    <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>Hinweis:</p>
                    <p style={{ margin: 0 }}>Die aufgefuehrten Leistungen wurden von Ihrer Pflegekasse bzw. dem Bezirksamt nicht bewilligt oder ueberschreiten die genehmigte Menge.</p>
                  </div>

                  <p style={{ fontSize: '10pt', lineHeight: '12.7pt', margin: '8px 0' }}>Zahlbar bis zum {new Date(Date.now() + 14*24*60*60*1000).toLocaleDateString('de-DE')} ohne Abzug.</p>
                  <p style={{ fontSize: '10pt', lineHeight: '12.7pt', margin: 0 }}>Umsatzsteuerfrei gemaess § 4 Nr. 16 UStG</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {showPreviewNew && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 print:bg-white print:p-0">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-auto print:rounded-none print:shadow-none print:max-w-full print:max-h-full print:overflow-visible">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10 print:hidden">
                <h3 className="text-xl font-bold text-indigo-600">
                  📄 Korrekturrechnung BA (Neues Layout)
                </h3>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Rechnung Nr. (optional)"
                    value={rechnungsnummer}
                    onChange={(e) => setRechnungsnummer(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-48"
                  />
                  <button
                    onClick={() => window.print()}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    🖨️ Drucken/PDF
                  </button>
                  <button
                    onClick={() => setShowPreviewNew(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Neue Layout-Komponente */}
              <InvoiceLayoutNew
                rechnung={korrektur}
                klient={{
                  name: klientData.name,
                  adresse: klientAdresse,
                  pflegegrad: klientData.pflegegrad
                }}
                dienst={{
                  name: dienst.name,
                  strasse: dienst.strasse,
                  plz: dienst.plz,
                  ik: dienst.ik,
                  telefon: dienst.telefon,
                  fax: dienst.telefax,
                  email: dienst.email,
                  iban: dienst.iban,
                  bic: dienst.bic,
                  bank: dienst.bank
                }}
                rechnungsNummer={rechnungsnummer || "XXXXXX"}
                debitorNummer={klientData.debitor}
                zeitraumVon={zeitraumVonDisplay}
                zeitraumBis={zeitraumBisDisplay}
                rechnungsdatum={new Date().toLocaleDateString('de-DE')}
                pflegekassenBetrag={pflegekassenBetrag}
                logoUrl={logoUrl}
                rechnungsEmpfaenger="Bezirksamt Mitte von Berlin"
                empfaengerStrasse="Standort Wedding, Muellerstrasse 146-147"
                empfaengerPlz="13344 Berlin"
              />
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
// Test webhook
