import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Download, RefreshCw, X } from 'lucide-react';
import {
  listResource, createResource, updateResource, updateStatus, exportResource,
} from '../lib/api';
import type { ModuleConfig, FieldConfig } from '../config/modules';

interface Props {
  module: ModuleConfig;
}

function FieldInput({
  field, value, onChange,
}: {
  field: FieldConfig;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded" />
        <span className="text-sm">{field.label}</span>
      </label>
    );
  }
  if (field.type === 'select') {
    return (
      <select className="input" value={String(value || '')} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select...</option>
        {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  if (field.type === 'textarea') {
    return <textarea className="input min-h-[80px]" value={String(value || '')} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <input
      type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'datetime' ? 'datetime-local' : 'text'}
      className="input"
      value={String(value ?? '')}
      onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
    />
  );
}

export default function DataManager({ module }: Props) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: [module.apiEndpoint, page],
    queryFn: () => listResource(module.apiEndpoint, { page, page_size: 15 }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (modal === 'edit' && editId) {
        return updateResource(module.apiEndpoint, editId, form);
      }
      return createResource(module.apiEndpoint, form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [module.apiEndpoint] });
      setModal(null);
      setForm({});
      setEditId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => updateStatus(module.apiEndpoint, id, 'deleted'),
    onSuccess: () => qc.invalidateQueries({ queryKey: [module.apiEndpoint] }),
  });

  const openCreate = () => {
    const defaults: Record<string, unknown> = {};
    module.fields.forEach((f) => {
      if (f.type === 'checkbox') defaults[f.key] = false;
      else if (f.type === 'number') defaults[f.key] = 0;
      else defaults[f.key] = '';
    });
    setForm(defaults);
    setModal('create');
    setEditId(null);
  };

  const openEdit = (item: Record<string, unknown>) => {
    setEditId(String(item.id));
    const vals: Record<string, unknown> = {};
    module.fields.forEach((f) => { vals[f.key] = item[f.key]; });
    setForm(vals);
    setModal('edit');
  };

  const handleExport = async () => {
    const result = await exportResource(module.apiEndpoint);
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${module.id}-export.json`;
    a.click();
  };

  const items = data?.items || [];
  const displayKeys = module.fields.map((f) => f.key).slice(0, 5);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-espresso">{module.name}</h1>
          <p className="mt-1 text-coffee/70">Manage {module.name.toLowerCase()} — all data from live API</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary"><RefreshCw className="h-4 w-4" /></button>
          <button onClick={handleExport} className="btn-secondary"><Download className="h-4 w-4" /> Export</button>
          <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Add New</button>
        </div>
      </div>

      <div className="table-wrap">
        {isLoading ? (
          <div className="p-12 text-center text-coffee/60">Loading from database...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-coffee/60">No records yet. Click "Add New" to create one.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {displayKeys.map((k) => (
                  <th key={k}>{module.fields.find((f) => f.key === k)?.label || k}</th>
                ))}
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: Record<string, unknown>) => (
                <tr key={String(item.id)} className="hover:bg-amber-warm/5">
                  {displayKeys.map((k) => (
                    <td key={k}>{String(item[k] ?? '—')}</td>
                  ))}
                  <td>
                    <span className={item.status === 'active' ? 'badge bg-green-100 text-green-800' : 'badge bg-gray-100 text-gray-600'}>
                      {String(item.status)}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(item)} className="rounded-lg p-1.5 hover:bg-amber-warm/10" title="Edit">
                        <Pencil className="h-4 w-4 text-coffee" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(String(item.id))} className="rounded-lg p-1.5 hover:bg-red-50" title="Delete">
                        <Trash2 className="h-4 w-4 text-chili" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data?.pages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={p === page ? 'btn-primary px-3 py-1 text-sm' : 'btn-secondary px-3 py-1 text-sm'}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">{modal === 'create' ? 'Create' : 'Edit'} {module.name}</h2>
              <button onClick={() => setModal(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              {module.fields
                .filter((f) => modal === 'create' || !f.createOnly)
                .map((field) => (
                  <div key={field.key}>
                    {field.type !== 'checkbox' && <label className="label">{field.label}{field.required && ' *'}</label>}
                    <FieldInput
                      field={field}
                      value={form[field.key]}
                      onChange={(v) => setForm({ ...form, [field.key]: v })}
                    />
                  </div>
                ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="btn-primary"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
            {saveMutation.isError && (
              <p className="mt-2 text-sm text-chili">{(saveMutation.error as Error).message || 'Save failed'}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
