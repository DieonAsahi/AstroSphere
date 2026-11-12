'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
} from 'lucide-react';
import { parseImportFileContent } from '../../lib/utils/importExport';
import { formatSupabaseError } from '../../lib/supabase/adminAuth';

export interface BulkImportValidationResult<T> {
  validRows: T[];
  errors: string[];
}

interface BulkImportModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  columnsHint: string;
  onDownloadCsvTemplate: () => void;
  onDownloadJsonTemplate: () => void;
  validateRecords: (
    records: Array<Record<string, unknown>>
  ) => BulkImportValidationResult<T>;
  onImportConfirm: (validRows: T[]) => Promise<void>;
  renderPreviewRow: (row: T, index: number) => React.ReactNode;
}

export function BulkImportModal<T>({
  isOpen,
  onClose,
  title,
  description,
  columnsHint,
  onDownloadCsvTemplate,
  onDownloadJsonTemplate,
  validateRecords,
  onImportConfirm,
  renderPreviewRow,
}: BulkImportModalProps<T>) {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [validRows, setValidRows] = useState<T[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setSelectedFileName(null);
    setValidRows([]);
    setValidationErrors([]);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (!file) return;

    setSelectedFileName(file.name);
    setParseError(null);
    setValidationErrors([]);
    setValidRows([]);

    try {
      const text = await file.text();
      const rawRecords = parseImportFileContent(file.name, text);
      const result = validateRecords(rawRecords);
      setValidRows(result.validRows);
      setValidationErrors(result.errors);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membaca file import.';
      setParseError(msg);
    }
  };

  const handleConfirm = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    setParseError(null);
    try {
      await onImportConfirm(validRows);
      resetState();
      onClose();
    } catch (err: unknown) {
      const msg = formatSupabaseError(err, 'Gagal mengimpor data ke Supabase');
      setParseError(msg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Template Download Helper */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-slate-800">Format Kolom yang Didukung:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onDownloadCsvTemplate}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors"
                >
                  <Download className="w-3 h-3 text-emerald-600" />
                  <span>Template CSV</span>
                </button>
                <button
                  type="button"
                  onClick={onDownloadJsonTemplate}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors"
                >
                  <Download className="w-3 h-3 text-blue-600" />
                  <span>Template JSON</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-mono bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 break-all">
              {columnsHint}
            </p>
          </div>

          {/* Dropzone / File Picker */}
          <div className="rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50/40 p-5 text-center transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,application/json,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex justify-center gap-2 mb-2 text-slate-400">
              <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
              <FileJson className="w-6 h-6 text-blue-500" />
            </div>
            <p className="font-semibold text-slate-700">
              {selectedFileName
                ? `File terpilih: ${selectedFileName}`
                : 'Pilih file cadangan atau daftar massal (.CSV atau .JSON)'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Baris yang memiliki ID UUID valid akan diperbarui (upsert), baris tanpa ID akan ditambahkan baru.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 px-4 py-2 text-xs font-semibold text-blue-700 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{selectedFileName ? 'Ganti File' : 'Pilih File JSON / CSV'}</span>
            </button>
          </div>

          {/* Parse / Server Error */}
          {parseError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Validation Summary */}
          {(validRows.length > 0 || validationErrors.length > 0) && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {validRows.length} Baris Valid Siap Diimpor
                </span>
                {validationErrors.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 font-semibold text-amber-800">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {validationErrors.length} Baris Bermasalah (Dilewati)
                  </span>
                )}
              </div>

              {validationErrors.length > 0 && (
                <div className="max-h-28 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-1 text-[11px] text-amber-900">
                  {validationErrors.map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
                </div>
              )}

              {validRows.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                  <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                    Pratinjau Data Valid ({Math.min(5, validRows.length)} dari {validRows.length} baris):
                  </p>
                  <div className="space-y-1.5">
                    {validRows.slice(0, 5).map((row, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                      >
                        {renderPreviewRow(row, idx)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2.5 bg-slate-50/60">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={importing || validRows.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengimpor...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Import {validRows.length} Data</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

