import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { listResource, createResource, updateResource, updateStatus } from '../lib/api';
import { CRUD_MODULES } from '../config/roles';

interface Props { moduleId: string; title: string; }

export default function ModuleCrudPage({ moduleId, title }: Props) {
  const config = CRUD_MODULES[moduleId];
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: [config?.apiEndpoint],
    queryFn: () => listResource(config!.apiEndpoint, { page_size: 50 }),
    enabled: !!config,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (modal === 'edit' && editId) return updateResource(config!.apiEndpoint, editId, form);
      return createResource(config!.apiEndpoint, form);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [config?.apiEndpoint] }); setModal(null); setForm({}); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => updateStatus(config!.apiEndpoint, id, 'deleted'),
    onSuccess: () => qc.invalidateQueries({ queryKey: [config?.apiEndpoint] }),
  });

  if (!config) return <p>Module not configured</p>;

  const items = data?.items || [];
  const fields = config.fields;

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary"><RefreshCw className="h-4 w-4" /></button>
          <button onClick={() => { setForm({}); setModal('create'); }} className="btn-primary"><Plus className="h-4 w-4" /> Add</button>
        </div>
      </div>
      <div className="table-wrap">
        {isLoading ? <div className="p-12 text-center">Loading...</div> : items.length === 0 ? (
          <div className="p-12 text-center text-coffee/60">No records. Click Add to create.</div>
        ) : (
          <table className="data-table">
            <thead><tr>{fields.slice(0, 4).map((f) => <th key={f.key}>{f.label}</th>)}<th>Actions</th></tr></thead>
            <tbody>
              {items.map((item: Record<string, unknown>) => (
                <tr key={String(item.id)} data-testid="crud-row">
                  {fields.slice(0, 4).map((f) => <td key={f.key}>{String(item[f.key] ?? '—')}</td>)}
                  <td className="flex gap-1">
                    <button onClick={() => { setEditId(String(item.id)); const v: Record<string, unknown> = {}; fields.forEach((f) => { v[f.key] = item[f.key]; }); setForm(v); setModal('edit'); }} className="p-1.5 hover:bg-amber-warm/10 rounded-lg"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => deleteMutation.mutate(String(item.id))} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4 text-chili" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md">
            <h2 className="font-display text-xl font-bold mb-4">{modal === 'create' ? 'Create' : 'Edit'}</h2>
            {fields.map((f) => (
              <div key={f.key} className="mb-3">
                <label className="label">{f.label}</label>
                {f.type === 'select' ? (
                  <select className="input" value={String(form[f.key] || '')} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                    <option value="">Select</option>
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea className="input" value={String(form[f.key] || '')} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                ) : f.type === 'checkbox' ? (
                  <input type="checkbox" checked={!!form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} />
                ) : (
                  <input type={f.type === 'number' ? 'number' : 'text'} className="input" value={String(form[f.key] ?? '')} onChange={(e) => setForm({ ...form, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })} />
                )}
              </div>
            ))}
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
