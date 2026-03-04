import React from 'react';
import { ReportState } from '../../types/report';
import { Customer, Job } from '../../types';

interface ReportDocumentProps {
    report: ReportState;
    job?: Job | null;
    customer?: Customer | null;
    onClose: () => void;
}

export const ReportDocument: React.FC<ReportDocumentProps> = ({ report, job, customer, onClose }) => {
    const [scale, setScale] = React.useState(1);

    React.useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 840) {
                const newScale = (window.innerWidth - 32) / 800; // 800px is the target width approx
                setScale(Math.max(0.4, newScale));
            } else {
                setScale(1);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handlePrint = () => window.print();

    return (
        <div
            className="fixed inset-0 z-[5000] bg-slate-950/80 backdrop-blur-2xl overflow-y-auto flex flex-col items-center animate-in fade-in zoom-in-95 duration-500"
            onClick={onClose}
        >
            {/* Glossy Top Toolbar */}
            <div className="print:hidden sticky top-0 z-[5010] w-full bg-slate-900/40 backdrop-blur-xl border-b border-white/10 text-white px-6 py-4 flex items-center justify-between shadow-2xl transition-all duration-300">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-delaval-blue rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-blue-900/20">TC</div>
                    <div>
                        <h2 className="font-bold text-sm leading-tight">IMQCS Test Report</h2>
                        <p className="text-xs text-white/50">{customer?.name || 'Unknown Farm'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePrint}
                        className="hidden md:flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all transform active:scale-95 whitespace-nowrap"
                    >
                        🖨️ Print / Save PDF
                    </button>
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all transform active:scale-95 shadow-lg shadow-red-900/40"
                    >
                        ✕ Close
                    </button>
                </div>
            </div>

            {/* A4 Document Container */}
            <div
                className="py-12 px-4 print:py-0 print:px-0 w-full flex justify-center origin-top transition-transform duration-300 ease-out"
                style={{ transform: `scale(${scale})` }}
                onClick={e => e.stopPropagation()}
            >
                <div
                    className="bg-white w-full max-w-[210mm] print:shadow-none relative rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-200"
                    style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif', fontSize: '9pt', color: '#000', minHeight: '297mm' }}
                >
                    {/* Document Header */}
                    <div style={{ borderBottom: '3px solid #003875', padding: '12px 20px 8px', background: '#f0f4ff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '16pt', fontWeight: 900, color: '#003875', letterSpacing: '-0.5px' }}>
                                    TEST REPORT ON MILKING MACHINE
                                </div>
                                <div style={{ fontSize: '8pt', color: '#555', marginTop: 2 }}>
                                    Irish Milking Quality Control Scheme (IMQCS) — Licensed Tester Report
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 700, fontSize: '10pt', color: '#003875' }}>Condon Dairy Services</div>
                                <div style={{ fontSize: '8pt', color: '#555' }}>Tony Condon</div>
                                {job && <div style={{ fontSize: '8pt', color: '#888', marginTop: 4 }}>Job #{job.job_number}</div>}
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '12px 20px' }}>
                        {/* === SECTION A: HEADER === */}
                        <SectionTitle>A. Header Information</SectionTitle>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                            <Field label="Customer / Farm Name" value={customer?.name} />
                            <Field label="Date of Test" value={report.date ? new Date(report.date).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' }) : ''} />
                            <Field label="Address" value={customer?.address} />
                            <Field label="Machine Make" value={report.machineMake} />
                            <Field label="Tester Name" value={report.tester} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <Field label="Plant Type" value={report.plantType} />
                                <Field label="No. Units" value={report.noUnits} />
                            </div>
                        </div>

                        {/* === SECTION 1: INSTALLATION === */}
                        <SectionTitle>1. Installation</SectionTitle>

                        {/* Pipelines Table */}
                        <div style={{ marginBottom: 8 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                                <thead>
                                    <tr style={{ background: '#e8edf5' }}>
                                        <TH>Component</TH>
                                        <TH>Bore</TH>
                                        <TH>Materials</TH>
                                        <TH>Height/Slope</TH>
                                        <TH>Size</TH>
                                        <TH>Location</TH>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { label: 'Main Airline', key: 'mainAirline', hasLocation: true },
                                        { label: 'Pulsator Airlines', key: 'pulsatorAirlines', hasLocation: true },
                                        { label: 'Milkline', key: 'milkline', hasLocation: true },
                                        { label: 'Washline', key: 'washline', hasLocation: true },
                                        { label: 'Milk Lift', key: 'milkLift', hasLocation: false },
                                    ].map(({ label, key, hasLocation }) => {
                                        const row = (report.installation as any)[key];
                                        return (
                                            <tr key={key} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <TD bold>{label}</TD>
                                                <TD>{row?.bore}</TD>
                                                <TD>{row?.materials}</TD>
                                                <TD>{row?.slope || row?.height}</TD>
                                                <TD>{row?.size}</TD>
                                                <TD>{hasLocation ? row?.location : '—'}</TD>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pumps & Regulation + Milking Units */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                            <div>
                                <SubTitle>Pumps & Regulation</SubTitle>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                                    <tbody>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <TD bold>Milk Pump Make</TD><TD>{report.installation.milkPump.make}</TD>
                                            <TD bold>Rate</TD><TD>{report.installation.milkPump.rate} {report.installation.milkPump.highSpeed ? <span style={{ fontSize: '7pt', color: '#666' }}>(High Speed)</span> : ''}</TD>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <TD bold>Vacuum Pump</TD><TD>{report.installation.vacuumPump.make}</TD>
                                            <TD bold>Type</TD><TD>{report.installation.vacuumPump.type}</TD>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <TD bold>Capacity</TD><TD>{report.installation.vacuumPump.capacity}</TD>
                                            <TD bold>Location</TD><TD>{report.installation.vacuumPump.location}</TD>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <TD bold>Regulator Make</TD><TD>{report.installation.regulator.make}</TD>
                                            <TD bold>Type</TD><TD>{report.installation.regulator.type}</TD>
                                        </tr>
                                        <tr>
                                            <TD bold>Location</TD><TD>{report.installation.regulator.location}</TD>
                                            <TD bold>Farm Gauge</TD><TD>{report.installation.regulator.gauge}</TD>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <SubTitle>Milking Units</SubTitle>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                                    <tbody>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <TD bold>Claws Make</TD><TD>{report.installation.claws.make}</TD>
                                            <TD bold>Type</TD><TD>{report.installation.claws.type}</TD>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <TD bold>Volume</TD><TD>{report.installation.claws.volume}</TD>
                                            <TD bold>Weight</TD><TD>{report.installation.claws.weight}</TD>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <TD bold>Liners Make</TD><TD>{report.installation.liners.make}</TD>
                                            <TD bold>Type</TD><TD>{report.installation.liners.type}</TD>
                                        </tr>
                                        <tr>
                                            <TD bold>Shell</TD><TD colSpan={3}>{report.installation.liners.shell}</TD>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* === SECTION 2: MAINTENANCE === */}
                        <SectionTitle>2. Maintenance</SectionTitle>
                        <div style={{ marginBottom: 10 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <TD bold>V. Pump Oil</TD><TD>{report.maintenance.vPumpOil}</TD>
                                        <TD bold>V. Pump Belts</TD><TD>{report.maintenance.vPumpBelts}</TD>
                                        <TD bold>M. Pump Belts</TD><TD>{report.maintenance.mPumpBelts}</TD>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <TD bold>Milk Pump Diaphragm</TD><TD>{report.maintenance.milkPumpDiaphragm}</TD>
                                        <TD bold>Liners</TD><TD>{report.maintenance.liners}</TD>
                                        <TD bold>Milk Tubes</TD><TD>{report.maintenance.milkTubes}</TD>
                                    </tr>
                                    <tr>
                                        <TD bold>Pulse Tubes</TD><TD>{report.maintenance.pulseTubes}</TD>
                                        <TD bold>Relay Diaphragms</TD><TD>{report.maintenance.relayDiaphragms}</TD>
                                        <TD bold>Pulsators Clean</TD><TD>{report.maintenance.pulsatorsClean}</TD>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* === SECTION 3: AIR FLOW TESTS === */}
                        <SectionTitle>3. Air Flow & Vacuum Regulator Tests</SectionTitle>
                        <div style={{ marginBottom: 10 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                                <thead>
                                    <tr style={{ background: '#e8edf5' }}>
                                        <TH style={{ width: '4%' }}>No.</TH>
                                        <TH style={{ width: '38%' }}>Test Description</TH>
                                        <TH style={{ width: '15%' }}>Reading</TH>
                                        <TH style={{ width: '28%' }}>Derived Measurement</TH>
                                        <TH style={{ width: '15%' }}>Value</TH>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { no: '1', desc: 'Operating Vacuum — AFM at test point near regulator', reading: report.airFlow.t1_operatingVacuum, unit: 'kPa', derivedLabel: 'Recommended Vacuum', derived: report.airFlow.t1_recommended, derivedUnit: 'kPa' },
                                        { no: '2', desc: 'Pump Capacity — AFM direct to pump', reading: `${report.airFlow.t2_pumpCapacity} l/min @ ${report.airFlow.t2_rpm} rpm`, unit: '', derivedLabel: 'Required Pump Capacity', derived: report.airFlow.t2_requiredCapacity, derivedUnit: 'l/min' },
                                        { no: '3', desc: 'AFM at test point near regulator — teat plugs inserted, regulator plugged', reading: report.airFlow.t3_afmAtTestPoint, unit: 'l/min', derivedLabel: 'Air Pipeline Leakage (2–3)', derived: report.airFlow.t3_airPipelineLeakage, derivedUnit: '' },
                                        { no: '4', desc: 'Add Milking System — close claw air admission', reading: report.airFlow.t4_addMilkingSystem, unit: 'l/min', derivedLabel: 'Milking System Leakage (3–4)', derived: report.airFlow.t4_systemLeakage, derivedUnit: '' },
                                        { no: '5', desc: 'Open air admission at claws', reading: report.airFlow.t5_openAirAdmission, unit: 'l/min', derivedLabel: 'Claw Admission / Unit (4–5)', derived: report.airFlow.t5_clawAdmission, derivedUnit: '' },
                                        { no: '6', desc: 'Add pulsators — all units milking', reading: report.airFlow.t6_addPulsators, unit: 'l/min', derivedLabel: 'Pulsation Use (5–6)', derived: report.airFlow.t6_pulsationUse, derivedUnit: '' },
                                        { no: '6a', desc: 'Add ancillary equipment', reading: report.airFlow.t6a_addAncillary, unit: 'l/min', derivedLabel: 'Ancillary Equipment Use (6–6a)', derived: report.airFlow.t6a_ancillaryUse, derivedUnit: '' },
                                        { no: '7', desc: 'Drop Vacuum 2 kPa — all units milking, regulator plugged', reading: report.airFlow.t7_dropVacuum2kPa, unit: 'l/min', derivedLabel: 'Regulator Leakage (7–8)', derived: report.airFlow.t7_regulatorLeakage, derivedUnit: '' },
                                        { no: '8', desc: 'Add regulator, drop vacuum 2 kPa — all units milking', reading: report.airFlow.t8_addRegulator, unit: 'l/min', derivedLabel: 'Required Reserve', derived: report.airFlow.t8_requiredReserve, derivedUnit: '' },
                                    ].map(row => (
                                        <tr key={row.no} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '3px 4px', fontWeight: 700, textAlign: 'center', background: '#f8fafc', borderRight: '1px solid #e2e8f0' }}>{row.no}</td>
                                            <TD>{row.desc}</TD>
                                            <TD><strong>{row.reading}</strong> {row.unit && <span style={{ color: '#666' }}>{row.unit}</span>}</TD>
                                            <TD style={{ color: '#555' }}>{row.derivedLabel}</TD>
                                            <TD><strong>{row.derived}</strong> {row.derivedUnit && <span style={{ color: '#666' }}>{row.derivedUnit}</span>}</TD>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* === SECTION 4: PULSATION === */}
                        <SectionTitle>4. Pulsation</SectionTitle>
                        <div style={{ marginBottom: 8 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                                <thead>
                                    <tr style={{ background: '#e8edf5' }}>
                                        <TH>Type</TH><TH>No.</TH><TH>Make</TH><TH>Type</TH><TH>Units/Relay</TH>
                                        <TH>Rate c/min</TH><TH>Ratio "a+b"</TH><TH>"a" value</TH><TH>"d" value</TH>
                                        <TH>Max</TH><TH>Min</TH><TH>DIFF</TH>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(['individual', 'master', 'relays'] as const).map(key => {
                                        const row = report.pulsation[key];
                                        return (
                                            <tr key={key} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <TD bold style={{ textTransform: 'capitalize' }}>{key}</TD>
                                                <TD>{row.no}</TD><TD>{row.make}</TD><TD>{row.type}</TD><TD>{row.units}</TD>
                                                <TD>{row.rate}</TD><TD>{row.ratio}</TD><TD>{row.a}</TD><TD>{row.d}</TD>
                                                <TD>{row.max}</TD><TD>{row.min}</TD><TD>{row.diff}</TD>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div style={{ marginTop: 4, fontSize: '8pt', color: '#444' }}>
                                Pulsation Graphs Attached: <strong>{report.pulsation.graphsAttached ? 'Yes' : 'No'}</strong>
                                {'  |  '}Belt Guards Fitted: <strong>{report.pulsation.beltGuardsFitted ? 'Yes' : 'No'}</strong>
                            </div>
                        </div>

                        {/* === SECTION 5: FAULTS & RECOMMENDATIONS === */}
                        <SectionTitle>5. Faults & Recommendations</SectionTitle>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt', marginBottom: 10 }}>
                            <thead>
                                <tr style={{ background: '#e8edf5' }}>
                                    <TH style={{ width: '18%' }}>Section</TH>
                                    <TH style={{ width: '41%' }}>Faults</TH>
                                    <TH style={{ width: '41%' }}>Recommendations</TH>
                                </tr>
                            </thead>
                            <tbody>
                                {([
                                    { key: 'installation', label: 'Installation' },
                                    { key: 'maintenance', label: 'Maintenance' },
                                    { key: 'vacuumTests', label: 'Vacuum Tests' },
                                    { key: 'pulsationTests', label: 'Pulsation Tests' },
                                    { key: 'safety', label: 'Safety' },
                                    { key: 'other', label: 'Other' },
                                ] as const).map(({ key, label }) => {
                                    const section = (report.faults as any)[key];
                                    return (
                                        <tr key={key} style={{ borderBottom: '1px solid #e2e8f0', verticalAlign: 'top' }}>
                                            <TD bold>{label}</TD>
                                            <td style={{ padding: '4px 6px', borderRight: '1px solid #e2e8f0', color: section?.faults ? '#c0392b' : '#aaa', fontStyle: section?.faults ? 'normal' : 'italic', whiteSpace: 'pre-wrap' }}>
                                                {section?.faults || 'None recorded'}
                                            </td>
                                            <td style={{ padding: '4px 6px', color: section?.recommendations ? '#1a5276' : '#aaa', fontStyle: section?.recommendations ? 'normal' : 'italic', whiteSpace: 'pre-wrap' }}>
                                                {section?.recommendations || 'None'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Signature Block */}
                        <div style={{ borderTop: '2px solid #003875', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ fontSize: '8pt' }}>
                                <div style={{ fontWeight: 700, marginBottom: 16 }}>Tester Name: {report.tester}</div>
                                <div style={{ borderTop: '1px solid #000', width: 200, paddingTop: 2 }}>Signature</div>
                            </div>
                            <div style={{ fontSize: '8pt', textAlign: 'right' }}>
                                <div style={{ fontWeight: 700, marginBottom: 16 }}>Date: {report.date}</div>
                                <div style={{ borderTop: '1px solid #000', width: 140, paddingTop: 2, marginLeft: 'auto' }}>IMQCS Stamp</div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ borderTop: '1px solid #ccc', marginTop: 10, paddingTop: 6, fontSize: '7pt', color: '#888', textAlign: 'center' }}>
                            Condon Dairy Services — Tony Condon — Licensed IMQCS Tester
                            {job ? ` — Job #${job.job_number}` : ''}
                            {' — '}Generated {new Date().toLocaleDateString('en-IE')}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    @page { size: A4; margin: 8mm; }
                }
            `}</style>
        </div>
    );
};

// ——— Internal layout helpers ———

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{
        background: '#003875',
        color: 'white',
        fontWeight: 700,
        fontSize: '8.5pt',
        padding: '3px 8px',
        marginBottom: 6,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
    }}>{children}</div>
);

const SubTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{
        background: '#dde8f5',
        fontWeight: 700,
        fontSize: '7.5pt',
        padding: '2px 6px',
        marginBottom: 4,
        color: '#003875',
    }}>{children}</div>
);

const Field: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: '7pt', color: '#666', fontWeight: 700, textTransform: 'uppercase', marginBottom: 1 }}>{label}</div>
        <div style={{ borderBottom: '1px solid #ccc', padding: '2px 4px', minHeight: 18, fontSize: '9pt', fontWeight: 500, background: '#fafafa' }}>
            {value || <span style={{ color: '#ccc' }}>—</span>}
        </div>
    </div>
);

const TH: React.FC<{ children?: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
    <th style={{
        padding: '3px 5px',
        textAlign: 'left',
        fontWeight: 700,
        fontSize: '7pt',
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        color: '#003875',
        borderRight: '1px solid #c5d3e8',
        borderBottom: '1px solid #b0c0d8',
        ...style,
    }}>{children}</th>
);

const TD: React.FC<{ children?: React.ReactNode; bold?: boolean; colSpan?: number; style?: React.CSSProperties }> = ({ children, bold, colSpan, style }) => (
    <td style={{
        padding: '3px 5px',
        borderRight: '1px solid #e2e8f0',
        fontWeight: bold ? 600 : 400,
        color: '#111',
        verticalAlign: 'middle',
        ...style,
    }} colSpan={colSpan}>{children || <span style={{ color: '#ddd' }}>—</span>}</td>
);
