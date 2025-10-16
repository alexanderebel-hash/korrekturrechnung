'use client';
import { useState } from 'react';
import * as XLSX from 'xlsx';

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
  pflegegrad: number;
  versichertenNr: string;
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

const LK_PREISE: { [key: string]: { bezeichnung: string; preis: number; aubPreis: number } } = {
  'LK01': { bezeichnung: 'Erweiterte kleine Koerperpflege', preis: 25.52, aubPreis: 0.84 },
  'LK02': { bezeichnung: 'Kleine Koerperpflege', preis: 17.01, aubPreis: 0.39 },
  'LK03A': { bezeichnung: 'Erweiterte grosse Koerperpflege', preis: 42.78, aubPreis: 1.15 },
  'LK03B': { bezeichnung: 'Erweiterte grosse Koerperpflege m. Baden', preis: 51.01, aubPreis: 1.15 },
  'LK04': { bezeichnung: 'Grosse Koerperpflege', preis: 34.01, aubPreis: 0.78 },
  'LK05': { bezeichnung: 'Lagern/Betten', preis: 6.77, aubPreis: 0.93 },
  'LK06': { bezeichnung: 'Hilfe bei der Nahrungsaufnahme', preis: 10.15, aubPreis: 1.63 },
  'LK07A': { bezeichnung: 'Darm- und Blasenentleerung', preis: 6.77, aubPreis: 0.16 },
  'LK07B': { bezeichnung: 'Darm- und Blasenentleerung erweitert', preis: 10.15, aubPreis: 0.39 },
  'LK08A': { bezeichnung: 'Hilfestellung beim Verlassen/Wiederaufsuchen der Wohnung', preis: 3.38, aubPreis: 0.33 },
  'LK08B': { bezeichnung: 'Hilfestellung beim Wiederaufsuchen der Wohnung', preis: 3.38, aubPreis: 0.33 },
  'LK09': { bezeichnung: 'Begleitung ausser Haus', preis: 20.30, aubPreis: 1.59 },
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
  'LK20': { bezeichnung: 'Haeusliche Betreuung Paragraph 124 SGB XI', preis: 3.38, aubPreis: 0.33 },
  'LK20_HH': { bezeichnung: 'Haeusliche Betreuung Paragraph 124 SGB XI (Haushaltsbuch)', preis: 3.38, aubPreis: 0.33 }
};

const PFLEGEGRAD_SACHLEISTUNG: { [key: number]: number } = {
  2: 796.00,
  3: 1497.00,
  4: 1859.00,
  5: 2299.00
};

export default function Home() {
  const logoUrl = '/logo.png';
  
  const [klientData, setKlientData] = useState<KlientData>({
    name: '',
    zeitraumVon: '',
    zeitraumBis: '',
    geburtsdatum: '',
    pflegegrad: 3,
    versichertenNr: '',
    debitor: '62202',
    belegNr: '13400',
    genehmigungsDatum: '06.01.2025',
    genehmigungsNr: 'S0131070040738'
  });
  const [bewilligung, setBewilligung] = useState<BewilligungRow[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [medifoxPdf, setMedifoxPdf] = useState<File | null>(null);
  const [rechnungPositionen, setRechnungPositionen] = useState<RechnungsPosition[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [pflegekassenBetrag, setPflegekassenBetrag] = useState<number>(1497.00);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showPrivatPreview, setShowPrivatPreview] = useState(false);
  const [korrekturAnfrage, setKorrekturAnfrage] = useState('');
  const [showRechnungsnummerModal, setShowRechnungsnummerModal] = useState(false);
  const [rechnungsnummer, setRechnungsnummer] = useState('');
  const [actionType, setActionType] = useState<'print' | 'download'>('print');
  const [pdfType, setPdfType] = useState<'ba' | 'privat'>('ba');

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
    const updated = { ...klientData, [field]: value };
    if (field === 'pflegegrad') {
      const pg = value as number;
      setPflegekassenBetrag(PFLEGEGRAD_SACHLEISTUNG[pg] || 0);
    }
    setKlientData(updated);
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
      anzahlNichtBewilligt: nichtBewilligtePositionen.length
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

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleKorrekturSenden = () => {
    alert(`Korrekturanfrage: ${korrekturAnfrage}`);
    setKorrekturAnfrage('');
  };

  const theoretisch = berechneTheoretischeRechnung();
  const korrektur = berechneKorrekturrechnung();
  const rechnung = berechneRechnungFuerAnzeige();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
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
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            Schritt 1: Klientendaten eingeben
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
            <div>
              <label className="text-gray-600 block mb-1">Name:</label>
              <input
                type="text"
                placeholder="z.B. Tschida, Klaus"
                value={klientData.name}
                onChange={(e) => updateKlientData('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-gray-600 block mb-1">Geburtsdatum:</label>
              <input
                type="text"
                placeholder="25.06.1941"
                value={klientData.geburtsdatum}
                onChange={(e) => updateKlientData('geburtsdatum', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-gray-600 block mb-1">Pflegegrad:</label>
              <select
                value={klientData.pflegegrad}
                onChange={(e) => updateKlientData('pflegegrad', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={2}>Pflegegrad 2</option>
                <option value={3}>Pflegegrad 3</option>
                <option value={4}>Pflegegrad 4</option>
                <option value={5}>Pflegegrad 5</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-gray-600 block mb-1">Zeitraum Von:</label>
              <input
                type="text"
                placeholder="01.09.2025"
                value={klientData.zeitraumVon}
                onChange={(e) => updateKlientData('zeitraumVon', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-gray-600 block mb-1">Zeitraum Bis:</label>
              <input
                type="text"
                placeholder="30.09.2025"
                value={klientData.zeitraumBis}
                onChange={(e) => updateKlientData('zeitraumBis', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4">
            Schritt 2: Bewilligte Leistungen
          </h3>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-3">
              <strong>Option A:</strong> Excel-Datei hochladen
            </p>
            
            <div 
              onClick={() => document.getElementById('excel-input')?.click()}
              className="border-2 border-dashed border-green-400 rounded-xl p-6 text-center hover:border-green-600 transition-all cursor-pointer"
            >
              {!excelFile ? (
                <>
                  <div className="text-4xl mb-2">📊</div>
                  <div className="text-md text-green-600 font-medium mb-1">
                    Excel-Datei hochladen
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between bg-green-100 rounded-lg px-4 py-2">
                  <span className="text-green-800 font-medium text-sm">
                    {excelFile.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExcelFile(null);
                    }}
                    className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-xs"
                  >
                    X
                  </button>
                </div>
              )}
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
            </div>
          </div>

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
                            className="w-full px-2 py-1 border rounded font-mono text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            placeholder="Grosse Koerperpflege"
                            value={row.bezeichnung}
                            onChange={(e) => updateBewilligung(idx, 'bezeichnung', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.jeWoche}
                            onChange={(e) => updateBewilligung(idx, 'jeWoche', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border rounded text-right text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.jeMonat}
                            onChange={(e) => updateBewilligung(idx, 'jeMonat', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border rounded text-right text-sm"
                          />
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
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <p className="text-green-800 text-sm">
              <strong>{bewilligung.length} Leistungen erfasst!</strong> Bereit fuer Schritt 3.
            </p>
          </div>
        )}

        {bewilligung.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">
              Schritt 3: Medifox-Rechnung (Originalrechnung)
            </h3>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3">
                <strong>Optional:</strong> Medifox-PDF hochladen
              </p>
              
              <div 
                onClick={() => document.getElementById('medifox-input')?.click()}
                className="border-2 border-dashed border-purple-400 rounded-xl p-4 text-center hover:border-purple-600 transition-all cursor-pointer"
              >
                {!medifoxPdf ? (
                  <>
                    <div className="text-3xl mb-1">📄</div>
                    <div className="text-sm text-purple-600 font-medium">
                      Medifox-Rechnung (PDF)
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between bg-purple-100 rounded-lg px-4 py-2">
                    <span className="text-purple-800 font-medium text-sm">
                      {medifoxPdf.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMedifoxPdf(null);
                      }}
                      className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-xs"
                    >
                      X
                    </button>
                  </div>
                )}
                <input
                  id="medifox-input"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setMedifoxPdf(file);
                  }}
                  className="hidden"
                />
              </div>
            </div>

            <div>
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
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl shadow-lg p-6 mb-6 border-2 border-purple-200">
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

            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
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
                      value={klientData.pflegegrad}
                      onChange={(e) => updateKlientData('pflegegrad', parseInt(e.target.value))}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      <option value={2}>PG 2</option>
                      <option value={3}>PG 3</option>
                      <option value={4}>PG 4</option>
                      <option value={5}>PG 5</option>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold text-gray-800">Korrekturrechnung BA</h3>
                <button 
                  onClick={() => setShowPdfPreview(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  X
                </button>
              </div>

              <div className="p-8">
                <div className="border-2 border-gray-300 p-8 bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-6 border-b-2 border-indigo-600 pb-4">
                      <div className="flex-1">
                        <img src={logoUrl} alt="DomusVita Logo" className="h-24 w-auto" />
                      </div>
                      <div className="text-right text-xs text-gray-600">
                        <p className="font-semibold">DomusVita Gesundheit GmbH</p>
                        <p>Waldemarstr. 10 A</p>
                        <p>10999 Berlin</p>
                        <p className="mt-2">IK: 461104096</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 text-xs text-gray-600">
                    <p>DomusVita Gesundheit GmbH, Waldemarstr. 10 A, 10999 Berlin</p>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm font-bold">Bezirksamt Mitte von Berlin</p>
                    <p className="text-sm">Standort Wedding</p>
                    <p className="text-sm">Muellerstrasse 146 - 147</p>
                    <p className="text-sm">13344 Berlin</p>
                  </div>

                  <div className="mb-6 text-right text-xs">
                    <p>Telefon: 030/6120152-0</p>
                    <p>Telefax: 030/6120152-10</p>
                    <p>E-Mail: kreuzberg@domusvita.de</p>
                    <p className="font-semibold mt-2">Datum: Berlin, {new Date().toLocaleDateString('de-DE')}</p>
                  </div>

                  <div className="border-t border-b py-2 mb-4 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p><strong>Rechnung Nr.: {rechnungsnummer}</strong></p>
                        <p><strong>Debitor:</strong> {klientData.debitor}</p>
                      </div>
                      <div className="text-right">
                        <p><strong>IK:</strong> 461104096</p>
                      </div>
                    </div>
                    <p className="text-xs mt-2">
                      <strong>Abrechnungszeitraum:</strong> {klientData.zeitraumVon} bis {klientData.zeitraumBis}
                    </p>
                  </div>

                  <div className="border p-3 mb-4 text-xs bg-blue-50">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p><strong>Leistungsempfaenger:</strong></p>
                        <p className="font-semibold">{klientData.name}</p>
                        <p>10999 Berlin</p>
                      </div>
                      <div>
                        <p><strong>Geburtsdatum:</strong> {klientData.geburtsdatum}</p>
                        <p><strong>Pflegegrad:</strong> {klientData.pflegegrad}</p>
                        <p><strong>Versicherten-Nr.:</strong> {klientData.versichertenNr}</p>
                      </div>
                    </div>
                  </div>

                  <table className="w-full text-xs mb-4 border-collapse">
                    <thead>
                      <tr className="bg-indigo-100">
                        <th className="border px-2 py-1 text-left">Abk.</th>
                        <th className="border px-2 py-1 text-left">Leistung</th>
                        <th className="border px-2 py-1 text-right">Anzahl</th>
                        <th className="border px-2 py-1 text-right">Einzelpreis</th>
                        <th className="border px-2 py-1 text-right">Gesamtpreis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rechnung.aubPositionen.map((pos, idx) => (
                        <tr key={`aub-${idx}`}>
                          <td className="border px-2 py-1">AUB</td>
                          <td className="border px-2 py-1">{pos.bezeichnung}</td>
                          <td className="border px-2 py-1 text-right">{pos.menge.toFixed(2)}</td>
                          <td className="border px-2 py-1 text-right">{pos.preis.toFixed(2)}</td>
                          <td className="border px-2 py-1 text-right font-semibold">{pos.gesamt.toFixed(2)}</td>
                        </tr>
                      ))}
                      
                      {rechnung.allePositionen.map((pos, idx) => (
                        <tr key={`lk-${idx}`} className={!pos.bewilligt ? 'bg-red-50' : ''}>
                          <td className="border px-2 py-1">
                            <span className={pos.umgewandeltZu ? 'line-through text-gray-400' : ''}>
                              {pos.lkCode}
                            </span>
                          </td>
                          <td className="border px-2 py-1">
                            <span className={pos.umgewandeltZu ? 'line-through text-gray-400' : ''}>
                              {pos.lkCode} {pos.bezeichnung}
                            </span>
                            {pos.umgewandeltZu && (
                              <span className="text-blue-600 ml-2 font-semibold text-xs">
                                → in {pos.umgewandeltZu} umgewandelt
                              </span>
                            )}
                            {pos.mengeAusUmwandlung && (
                              <span className="text-blue-600 ml-2 text-xs">
                                (inkl. {pos.mengeAusUmwandlung} aus LK14)
                              </span>
                            )}
                            {!pos.bewilligt && !pos.umgewandeltZu && (
                              <span className="block text-red-600 text-xs italic mt-1">
                                ⚠ erbracht, aktuell nicht bewilligt
                              </span>
                            )}
                            {pos.gekuerztVon && (
                              <span className="block text-orange-600 text-xs italic mt-1">
                                ℹ gekuerzt von {pos.gekuerztVon} auf {pos.menge}
                              </span>
                            )}
                          </td>
                          <td className="border px-2 py-1 text-right">
                            <span className={pos.umgewandeltZu ? 'line-through text-gray-400' : ''}>
                              {pos.menge.toFixed(2)}
                            </span>
                          </td>
                          <td className="border px-2 py-1 text-right">
                            <span className={pos.umgewandeltZu ? 'line-through text-gray-400' : ''}>
                              {pos.preis.toFixed(2)}
                            </span>
                          </td>
                          <td className="border px-2 py-1 text-right">
                            {pos.bewilligt ? (
                              <span className="font-semibold">{pos.gesamt.toFixed(2)}</span>
                            ) : (
                              <span className="text-gray-400">0,00</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      
                      <tr className="bg-gray-200 font-semibold">
                        <td colSpan={4} className="border px-2 py-1 text-right">Zwischensumme:</td>
                        <td className="border px-2 py-1 text-right">{rechnung.zwischensumme.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="border px-2 py-1">ZINV</td>
                        <td className="border px-2 py-1">Investitionskosten 3,38%</td>
                        <td className="border px-2 py-1 text-right">1,00</td>
                        <td className="border px-2 py-1 text-right">{rechnung.zinv.toFixed(2)}</td>
                        <td className="border px-2 py-1 text-right font-semibold">{rechnung.zinv.toFixed(2)}</td>
                      </tr>
                      <tr className="bg-gray-200 font-bold">
                        <td colSpan={4} className="px-2 py-1 text-right">Gesamtbetrag:</td>
                        <td className="px-2 py-1 text-right">{rechnung.gesamtbetrag.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td colSpan={4} className="px-2 py-1 text-right">./. Anteil Pflegekasse:</td>
                        <td className="px-2 py-1 text-right">{pflegekassenBetrag.toFixed(2)}</td>
                      </tr>
                      <tr className="bg-indigo-100 font-bold text-lg">
                        <td colSpan={4} className="px-2 py-1 text-right">Rechnungsbetrag:</td>
                        <td className="px-2 py-1 text-right text-indigo-700">{rechnung.rechnungsbetragBA.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 text-xs">
                    <p className="font-semibold mb-1">Hinweis:</p>
                    <p>Positionen mit "erbracht, aktuell nicht bewilligt" wurden dokumentarisch aufgefuehrt, fliessen jedoch nicht in die Rechnungssumme ein.</p>
                  </div>

                  <p className="text-xs mt-4">Zahlbar bis zum {new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('de-DE')} ohne Abzug.</p>
                  <p className="text-xs">Umsatzsteuerfrei gemaess § 4 Nr. 16 UStG</p>

                  <div className="border-t-2 border-indigo-600 mt-8 pt-4">
                    <div className="flex items-center justify-between">
                      <img src={logoUrl} alt="DomusVita Logo" className="h-12 w-auto opacity-50" />
                      <div className="text-xs text-gray-600 text-right">
                        <p className="font-semibold">DomusVita Gesundheit GmbH</p>
                        <p>Waldemarstrasse 10 A • 10999 Berlin</p>
                        <p>Tel: 030/6120152-0 • kreuzberg@domusvita.de</p>
                        <p>IBAN: DE53100500000190998890 • BIC: BELADEBEXXX</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showPrivatPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold text-gray-800">Privatrechnung Klient</h3>
                <button 
                  onClick={() => setShowPrivatPreview(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  X
                </button>
              </div>

              <div className="p-8">
                <div className="border-2 border-gray-300 p-8 bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-6 border-b-2 border-orange-600 pb-4">
                      <div className="flex-1">
                        <img src={logoUrl} alt="DomusVita Logo" className="h-24 w-auto" />
                      </div>
                      <div className="text-right text-xs text-gray-600">
                        <p className="font-semibold">DomusVita Gesundheit GmbH</p>
                        <p>Waldemarstr. 10 A</p>
                        <p>10999 Berlin</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm font-bold">{klientData.name}</p>
                    <p className="text-sm">10999 Berlin</p>
                  </div>

                  <div className="mb-6 text-right text-xs">
                    <p>Telefon: 030/6120152-0</p>
                    <p>E-Mail: kreuzberg@domusvita.de</p>
                    <p className="font-semibold mt-2">Datum: Berlin, {new Date().toLocaleDateString('de-DE')}</p>
                  </div>

                  <div className="border-t border-b py-2 mb-4 bg-orange-50">
                    <h2 className="text-lg font-bold text-center">PRIVATRECHNUNG</h2>
                    <p className="text-xs text-center">Nicht bewilligte Leistungen</p>
                  </div>

                  <div className="border p-3 mb-4 text-xs">
                    <p><strong>Abrechnungszeitraum:</strong> {klientData.zeitraumVon} bis {klientData.zeitraumBis}</p>
                    <p><strong>Leistungsempfaenger:</strong> {klientData.name}</p>
                  </div>

                  <table className="w-full text-xs mb-4 border-collapse">
                    <thead>
                      <tr className="bg-orange-100">
                        <th className="border px-2 py-1 text-left">Abk.</th>
                        <th className="border px-2 py-1 text-left">Leistung</th>
                        <th className="border px-2 py-1 text-right">Anzahl</th>
                        <th className="border px-2 py-1 text-right">Einzelpreis</th>
                        <th className="border px-2 py-1 text-right">Gesamtpreis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {korrektur.aubPrivat.map((pos, idx) => (
                        <tr key={idx}>
                          <td className="border px-2 py-1">AUB</td>
                          <td className="border px-2 py-1">{pos.bezeichnung}</td>
                          <td className="border px-2 py-1 text-right">{pos.menge.toFixed(2)}</td>
                          <td className="border px-2 py-1 text-right">{pos.preis.toFixed(2)}</td>
                          <td className="border px-2 py-1 text-right">{pos.gesamt.toFixed(2)}</td>
                        </tr>
                      ))}
                      {korrektur.privatLKPositionen.map((pos, idx) => (
                        <tr key={idx}>
                          <td className="border px-2 py-1">{pos.lkCode}</td>
                          <td className="border px-2 py-1">{pos.bezeichnung}</td>
                          <td className="border px-2 py-1 text-right">{pos.menge.toFixed(2)}</td>
                          <td className="border px-2 py-1 text-right">{pos.preis.toFixed(2)}</td>
                          <td className="border px-2 py-1 text-right">{pos.gesamt.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-200">
                        <td colSpan={4} className="border px-2 py-1 text-right"><strong>Zwischensumme:</strong></td>
                        <td className="border px-2 py-1 text-right"><strong>{korrektur.zwischensummePrivat.toFixed(2)}</strong></td>
                      </tr>
                      <tr>
                        <td colSpan={4} className="border px-2 py-1 text-right">ZINV (3,38%):</td>
                        <td className="border px-2 py-1 text-right">{korrektur.zinvPrivat.toFixed(2)}</td>
                      </tr>
                      <tr className="bg-orange-100 font-bold">
                        <td colSpan={4} className="px-2 py-1 text-right">Rechnungsbetrag:</td>
                        <td className="px-2 py-1 text-right">{korrektur.gesamtbetragPrivat.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="bg-yellow-50 p-4 rounded-lg text-xs mt-4">
                    <p className="font-semibold mb-2">Hinweis:</p>
                    <p>Die aufgefuehrten Leistungen wurden von Ihrer Pflegekasse bzw. dem Bezirksamt nicht bewilligt oder ueberschreiten die genehmigte Menge.</p>
                  </div>

                  <p className="text-xs mt-4">Zahlbar bis zum {new Date(Date.now() + 14*24*60*60*1000).toLocaleDateString('de-DE')} ohne Abzug.</p>
                  <p className="text-xs">Umsatzsteuerfrei gemaess § 4 Nr. 16 UStG</p>

                  <div className="border-t-2 border-orange-600 mt-8 pt-4">
                    <div className="flex items-center justify-between">
                      <img src={logoUrl} alt="DomusVita Logo" className="h-12 w-auto opacity-50" />
                      <div className="text-xs text-gray-600 text-right">
                        <p className="font-semibold">DomusVita Gesundheit GmbH</p>
                        <p>Waldemarstrasse 10 A • 10999 Berlin</p>
                        <p>IBAN: DE53100500000190998890 • BIC: BELADEBEXXX</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}