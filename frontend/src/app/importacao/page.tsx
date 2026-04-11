'use client';
import { useCallback, useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { importApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Upload, FileText, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const TARGET_FIELDS = [
  { key: 'externalId', label: 'ID Externo' },
  { key: 'title', label: 'Título *' },
  { key: 'description', label: 'Descrição' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Prioridade' },
  { key: 'category', label: 'Categoria' },
  { key: 'sector', label: 'Setor' },
  { key: 'openedAt', label: 'Data de Abertura' },
];

export default function ImportacaoPage() {
  const [step, setStep] = useState<'upload' | 'mapping' | 'result'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [fileData, setFileData] = useState<any>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    importApi.batches().then(res => setBatches(res.data)).catch(() => {});
  }, []);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await importApi.upload(file);
      setFileData(res.data);
      setStep('mapping');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  const handleProcess = async () => {
    if (!fileData) return;
    setProcessing(true);
    try {
      const res = await importApi.process(fileData.path, fileData.filename, mapping);
      setResult(res.data);
      setStep('result');
      importApi.batches().then(r => setBatches(r.data));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao processar importação');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold">Importação de Chamados</h1>
          <p className="text-muted-foreground text-sm mt-1">Importe chamados via CSV ou Excel</p>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 text-sm">
          {['upload', 'mapping', 'result'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${step === s ? 'bg-blue-600 text-white' : batches.length > 0 && i < ['upload','mapping','result'].indexOf(step) ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                {i + 1}
              </div>
              <span className={step === s ? 'font-medium' : 'text-muted-foreground'}>
                {s === 'upload' ? 'Upload' : s === 'mapping' ? 'Mapeamento' : 'Resultado'}
              </span>
              {i < 2 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Selecionar Arquivo</CardTitle>
              <CardDescription>Suporte a CSV, XLS e XLSX (máximo 10MB)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-muted hover:border-blue-300 hover:bg-muted/30'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium">Arraste um arquivo aqui ou clique para selecionar</p>
                <p className="text-sm text-muted-foreground mt-1">CSV, XLS, XLSX</p>
                <input
                  id="file-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
              </div>

              {file && (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button onClick={handleUpload} disabled={uploading} size="sm">
                    {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {uploading ? 'Enviando...' : 'Próximo'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Mapping */}
        {step === 'mapping' && fileData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mapeamento de Colunas</CardTitle>
              <CardDescription>
                Arquivo: <strong>{fileData.filename}</strong> — {fileData.headers?.length} colunas detectadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TARGET_FIELDS.map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-sm">{field.label}</Label>
                    <Select onValueChange={(v) => setMapping(prev => ({ ...prev, [field.key]: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar coluna..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Não mapear</SelectItem>
                        {fileData.headers?.map((h: string) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              {fileData.rows?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Preview (primeiras 5 linhas)</p>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="text-xs w-full">
                      <thead className="bg-muted">
                        <tr>
                          {fileData.headers?.map((h: string) => (
                            <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {fileData.rows?.map((row: any, i: number) => (
                          <tr key={i} className="border-t">
                            {fileData.headers?.map((h: string) => (
                              <td key={h} className="px-3 py-1.5 text-muted-foreground truncate max-w-32">{row[h] ?? '—'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep('upload')}>Voltar</Button>
                <Button onClick={handleProcess} disabled={processing || !mapping.title}>
                  {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                  {processing ? 'Processando...' : 'Importar Chamados'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Result */}
        {step === 'result' && result && (
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
              <h2 className="text-xl font-bold">Importação Concluída!</h2>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-2xl font-bold">{result.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div className="rounded-lg bg-green-50 p-4">
                  <p className="text-2xl font-bold text-green-700">{result.imported}</p>
                  <p className="text-sm text-green-600">Importados</p>
                </div>
                <div className="rounded-lg bg-red-50 p-4">
                  <p className="text-2xl font-bold text-red-700">{result.errors}</p>
                  <p className="text-sm text-red-600">Erros</p>
                </div>
              </div>
              <Button onClick={() => { setStep('upload'); setFile(null); setFileData(null); setMapping({}); setResult(null); }}>
                Nova Importação
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Histórico */}
        {batches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Importações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {batches.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{b.filename}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(b.createdAt)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs">{b.importedRows}/{b.totalRows} importados</p>
                      <Badge variant={b.status === 'CONCLUIDO' ? 'success' : b.status === 'ERRO' ? 'danger' : 'warning'} className="text-xs mt-0.5">
                        {b.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
