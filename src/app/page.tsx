'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ArrowUpRight, Check, CircleAlert, Database, Download, KeyRound, LoaderCircle, LockKeyhole, RefreshCw, ShieldCheck, Table2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type KeyType = 'publishable' | 'secret';
type Row = Record<string, unknown>;

export default function Home() {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [keyType, setKeyType] = useState<KeyType>('publishable');
  const [tableName, setTableName] = useState('');
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [tableData, setTableData] = useState<Record<string, Row[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'txt' | 'csv'>('txt');
  const hasConnection = Boolean(supabaseUrl && supabaseKey);
  const rowCount = Object.values(tableData).reduce((count, rows) => count + rows.length, 0);
  const canFetch = hasConnection && !loading && (keyType === 'publishable' ? Boolean(tableName) : selectedTables.length > 0);
  const clearNotice = () => { setError(null); setWarning(null); };

  const listTables = useCallback(async () => {
    if (!hasConnection) { setError('Enter your project URL and API key first.'); return; }
    setLoading(true); clearNotice();
    try {
      const { data, error: requestError } = await createClient(supabaseUrl, supabaseKey).from('information_schema.tables').select('table_name').eq('table_schema', 'public');
      if (requestError) throw requestError;
      setTables((data as { table_name: string }[]).map((row) => row.table_name));
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Failed to discover tables.'); }
    finally { setLoading(false); }
  }, [hasConnection, supabaseKey, supabaseUrl]);

  const fetchData = useCallback(async () => {
    if (!hasConnection) { setError('Enter your project URL and API key first.'); return; }
    if (keyType === 'publishable' && !tableName) { setError('Enter a table name to continue.'); return; }
    if (keyType === 'secret' && selectedTables.length === 0) { setError('Select at least one table to continue.'); return; }
    setLoading(true); clearNotice(); setTableData({});
    try {
      if (keyType === 'publishable') {
        const { data, error: requestError } = await createClient(supabaseUrl, supabaseKey).from(tableName).select('*');
        if (requestError) throw requestError;
        setTableData({ [tableName]: (data ?? []) as Row[] });
      } else {
        const response = await fetch('/api/fetch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ supabaseUrl, supabaseKey, tableNames: selectedTables }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to fetch data.');
        setTableData(result);
      }
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'An unknown error occurred.'); }
    finally { setLoading(false); }
  }, [hasConnection, keyType, selectedTables, supabaseKey, supabaseUrl, tableName]);

  const exportData = () => {
    const names = Object.keys(tableData);
    if (!names.length) { setError('Fetch some data before exporting.'); return; }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let content: string;
    if (exportFormat === 'csv') {
      const name = names[0];
      if (names.length > 1) setWarning('CSV exports the first selected table. TXT includes all tables.');
      const rows = tableData[name];
      if (!rows.length) { setError('The selected table has no rows to export.'); return; }
      const headers = Object.keys(rows[0]);
      content = [headers.join(','), ...rows.map((row) => headers.map((header) => `"${row[header] == null ? '' : String(row[header]).replace(/"/g, '""')}"`).join(','))].join('\n');
    } else {
      content = names.map((name) => `=== Table: ${name} ===\n${JSON.stringify(tableData[name], null, 2)}`).join('\n\n');
    }
    const url = window.URL.createObjectURL(new Blob([content], { type: exportFormat === 'csv' ? 'text/csv' : 'text/plain' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `sbc-${names[0]}-${timestamp}.${exportFormat}`; anchor.click(); window.URL.revokeObjectURL(url);
  };

  const handleKeyType = (value: string) => { setKeyType(value as KeyType); setTableName(''); setTables([]); setSelectedTables([]); setTableData({}); clearNotice(); };

  return (
    <div className="min-h-screen bg-[#f6f7f4] text-[#20211e]">
      <header className="border-b border-[#dedfd9]"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-[#3ecf8e] text-[#123b2d]"><Database className="size-5" strokeWidth={2.5} /></div><div><p className="font-heading text-[15px] font-semibold tracking-[-0.02em]">Supabase Checker</p><p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#7b7d75]">by 2nul/nyah2n</p></div></div><div className="hidden items-center gap-2 text-xs font-medium text-[#73766e] sm:flex"><ShieldCheck className="size-4 text-[#269a69]" />Data security assurance</div></div></header>
      <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><div className="mb-8 max-w-2xl"><h1 className="font-heading text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">A clear view into your data.</h1><p className="mt-4 max-w-xl text-base leading-7 text-[#6e7169]">Connect to a Supabase project, inspect selected tables, and export a clean snapshot in seconds.</p></div>
        {(error || warning) && <div className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${error ? 'border-[#edb9b2] bg-[#fff5f3] text-[#9f3e32]' : 'border-[#ead9a8] bg-[#fffaf0] text-[#876b21]'}`}><CircleAlert className="mt-0.5 size-4 shrink-0" /><span>{error || warning}</span><button className="ml-auto text-xs font-semibold underline underline-offset-4" onClick={clearNotice}>Dismiss</button></div>}
        <div className="grid gap-6 lg:grid-cols-[minmax(340px,0.8fr)_minmax(0,1.5fr)]">
          <Card className="border-[#dedfd9] bg-white shadow-[0_10px_35px_rgba(40,47,36,0.05)]"><CardHeader className="border-b border-[#ecece7] px-6 py-5"><div className="flex items-start justify-between gap-4"><div><CardTitle className="font-heading text-lg tracking-[-0.02em]">Connect project</CardTitle><CardDescription className="mt-1">Add credentials to begin inspecting.</CardDescription></div><div className="rounded-lg bg-[#effaf5] p-2 text-[#269a69]"><KeyRound className="size-4" /></div></div></CardHeader><CardContent className="space-y-5 px-6 py-6"><div className="space-y-2"><Label htmlFor="supabase-url">Project URL</Label><Input id="supabase-url" type="url" value={supabaseUrl} onChange={(event) => { setSupabaseUrl(event.target.value); clearNotice(); }} placeholder="https://your-project.supabase.co" className="h-10 bg-[#fbfbf9]" /></div><div className="space-y-2"><Label htmlFor="supabase-key">API key</Label><Input id="supabase-key" type="password" value={supabaseKey} onChange={(event) => { setSupabaseKey(event.target.value); clearNotice(); }} placeholder="Paste your key" className="h-10 bg-[#fbfbf9]" /></div><div className="space-y-3"><div><Label>Access level</Label><p className="mt-1 text-xs text-[#85877f]">Choose the key type you are using.</p></div><RadioGroup value={keyType} onValueChange={handleKeyType} className="grid gap-2"><label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#dedfd9] p-3 transition-colors hover:border-[#9ed9bc] has-[[data-state=checked]]:border-[#3ecf8e] has-[[data-state=checked]]:bg-[#f3fcf7]"><RadioGroupItem value="publishable" id="publishable" className="mt-0.5" /><span><span className="block text-sm font-medium">Publishable key</span><span className="block text-xs text-[#85877f]">For tables exposed through RLS</span></span></label><label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#dedfd9] p-3 transition-colors hover:border-[#9ed9bc] has-[[data-state=checked]]:border-[#3ecf8e] has-[[data-state=checked]]:bg-[#f3fcf7]"><RadioGroupItem value="secret" id="secret" className="mt-0.5" /><span><span className="block text-sm font-medium">Secret key</span><span className="block text-xs text-[#85877f]">For server-side table discovery</span></span></label></RadioGroup></div>{keyType === 'publishable' && <div className="space-y-2"><Label htmlFor="table-name">Table name</Label><Input id="table-name" value={tableName} onChange={(event) => { setTableName(event.target.value); clearNotice(); }} placeholder="e.g. customers" className="h-10 bg-[#fbfbf9]" /></div>}{keyType === 'secret' && <div className="space-y-3"><Button variant="outline" className="w-full justify-between" onClick={listTables} disabled={loading || !hasConnection}><span className="flex items-center gap-2"><RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />{loading ? 'Discovering tables...' : 'Discover tables'}</span><ArrowUpRight className="size-4" /></Button>{tables.length > 0 && <div className="space-y-2 rounded-lg border border-[#ecece7] bg-[#fbfbf9] p-3">{tables.map((table) => <label key={table} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-white"><Checkbox checked={selectedTables.includes(table)} onCheckedChange={(checked) => setSelectedTables(checked ? [...selectedTables, table] : selectedTables.filter((selected) => selected !== table))} /><span>{table}</span></label>)}</div>}</div>}<Button className="h-11 w-full bg-[#1f7a55] text-white hover:bg-[#176444]" onClick={fetchData} disabled={!canFetch}>{loading ? <><LoaderCircle className="animate-spin" />Fetching data</> : <><Zap />Fetch data</>}</Button><p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-[#85877f]"><LockKeyhole className="size-3" />Nothing is stored or sent to a third party.</p></CardContent></Card>
          <Card className="min-h-[520px] border-[#dedfd9] bg-white shadow-[0_10px_35px_rgba(40,47,36,0.05)]"><CardHeader className="border-b border-[#ecece7] px-6 py-5 sm:px-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle className="font-heading text-lg tracking-[-0.02em]">Data preview</CardTitle><CardDescription className="mt-1">{rowCount ? `${rowCount} rows across ${Object.keys(tableData).length} ${Object.keys(tableData).length === 1 ? 'table' : 'tables'}` : 'Your fetched records will appear here.'}</CardDescription></div>{rowCount > 0 && <div className="flex items-center gap-2"><select aria-label="Export format" value={exportFormat} onChange={(event) => setExportFormat(event.target.value as 'txt' | 'csv')} className="h-8 rounded-md border border-[#dedfd9] bg-white px-2 text-xs font-medium outline-none focus:ring-2 focus:ring-[#3ecf8e]/40"><option value="txt">TXT</option><option value="csv">CSV</option></select><Button size="sm" onClick={exportData}><Download />Export</Button></div>}</div></CardHeader><CardContent className="p-6 sm:p-7">{!Object.keys(tableData).length ? <div className="flex min-h-[390px] flex-col items-center justify-center rounded-xl border border-dashed border-[#d8dad2] bg-[#fbfbf9] px-6 text-center"><div className="mb-4 flex size-12 items-center justify-center rounded-full bg-[#effaf5] text-[#269a69]"><Table2 className="size-5" /></div><h3 className="font-heading text-base font-semibold">No preview yet</h3><p className="mt-2 max-w-xs text-sm leading-6 text-[#85877f]">Connect a project and fetch a table to see a readable snapshot here.</p></div> : <div className="space-y-6">{Object.entries(tableData).map(([name, rows]) => <div key={name} className="overflow-hidden rounded-xl border border-[#dedfd9]"><div className="flex items-center justify-between border-b border-[#ecece7] bg-[#fbfbf9] px-4 py-3"><div className="flex items-center gap-2"><Table2 className="size-4 text-[#269a69]" /><span className="text-sm font-semibold">{name}</span></div><span className="text-xs text-[#85877f]">{rows.length} rows</span></div>{rows.length > 0 ? <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-[#ecece7] text-[11px] uppercase tracking-[0.12em] text-[#85877f]"><tr>{Object.keys(rows[0]).map((key) => <th key={key} className="whitespace-nowrap px-4 py-3 font-semibold">{key}</th>)}</tr></thead><tbody className="divide-y divide-[#f0f0ec]">{rows.map((row, rowIndex) => <tr key={rowIndex} className="hover:bg-[#fbfbf9]">{Object.keys(row).map((key) => <td key={key} className="max-w-[220px] truncate whitespace-nowrap px-4 py-3 text-[#4e514a]">{row[key] == null ? <span className="italic text-[#a5a79f]">null</span> : typeof row[key] === 'object' ? JSON.stringify(row[key]) : String(row[key])}</td>)}</tr>)}</tbody></table></div> : <p className="px-4 py-8 text-center text-sm italic text-[#85877f]">No data in this table.</p>}</div>)}</div>}</CardContent></Card>
        </div>
      </main><footer className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 border-t border-[#dedfd9] px-5 py-5 text-xs text-[#85877f] sm:px-8 lg:px-12"><div className="flex flex-wrap items-center gap-x-4 gap-y-2"><span>Supabase Checker</span><span>MIT License</span><span>By 2nul/nyah2n</span></div><div className="flex items-center gap-4"><a href="https://github.com/2nul/supabase-checker" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition-colors hover:text-[#20211e]" aria-label="View Supabase Checker on GitHub"><svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-current"><path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.74.08-.74 1.2.09 1.83 1.23 1.83 1.23 1.07 1.83 2.8 1.3 3.48.99.11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.45 11.45 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.6-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .5Z" /></svg>GitHub</a><span className="flex items-center gap-1.5"><Check className="size-3" />Built for quick checks</span></div></footer>
    </div>
  );
}