import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, MessageSquare, Send, Trash2, ArrowLeft, ExternalLink } from 'lucide-react';
import { itemsApi, inventoriesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

export default function ItemPage() {
  const { inventoryId, itemId } = useParams();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');

  const { data: inv } = useQuery({
    queryKey: ['inventory', inventoryId],
    queryFn: () => inventoriesApi.get(Number(inventoryId))
  });

  const { data: item, isLoading } = useQuery({
    queryKey: ['item', inventoryId, itemId],
    queryFn: () => itemsApi.get(Number(inventoryId), Number(itemId)),
    refetchInterval: 3000
  });

  const likeMut = useMutation({
    mutationFn: () => itemsApi.toggleLike(Number(inventoryId), Number(itemId)),
    onSuccess: () => qc.invalidateQueries(['item', inventoryId, itemId])
  });

  const commentMut = useMutation({
    mutationFn: (text) => itemsApi.addComment(Number(inventoryId), Number(itemId), { text }),
    onSuccess: () => { setComment(''); qc.invalidateQueries(['item', inventoryId, itemId]); }
  });

  const deleteCommentMut = useMutation({
    mutationFn: (commentId) => itemsApi.deleteComment(Number(inventoryId), Number(itemId), commentId),
    onSuccess: () => qc.invalidateQueries(['item', inventoryId, itemId])
  });

  if (isLoading || !inv) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!item) return <div className="py-20 text-center dark:text-slate-400">Not found</div>;

  const fields = inv.fields;

  const fieldEntries = [
    ...([1, 2, 3].filter(n => fields?.[`str${n}`]?.name).map(n => ({ label: fields[`str${n}`].name, value: item[`string${n}`], type: 'string', desc: fields[`str${n}`].desc }))),
    ...([1, 2, 3].filter(n => fields?.[`txt${n}`]?.name).map(n => ({ label: fields[`txt${n}`].name, value: item[`text${n}`], type: 'text', desc: fields[`txt${n}`].desc }))),
    ...([1, 2, 3].filter(n => fields?.[`num${n}`]?.name).map(n => ({ label: fields[`num${n}`].name, value: item[`number${n}`], type: 'number', desc: fields[`num${n}`].desc }))),
    ...([1, 2, 3].filter(n => fields?.[`lnk${n}`]?.name).map(n => ({ label: fields[`lnk${n}`].name, value: item[`link${n}`], type: 'link', desc: fields[`lnk${n}`].desc }))),
    ...([1, 2, 3].filter(n => fields?.[`bol${n}`]?.name).map(n => ({ label: fields[`bol${n}`].name, value: item[`bool${n}`], type: 'bool', desc: fields[`bol${n}`].desc }))),
  ];

  return (
    <div className="max-w-3xl animate-fade-in">
      {/* Breadcrumb */}
      <Link to={`/inventories/${inventoryId}`} className="flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 mb-4 transition-colors">
        <ArrowLeft size={14} /> {inv?.title}
      </Link>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="custom-id text-base">{item.customId}</span>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Created {format(new Date(item.createdAt), 'PPP')} · Updated {format(new Date(item.updatedAt), 'PPP')}
            </p>
          </div>
          <button onClick={() => likeMut.mutate()}
            disabled={!isAuthenticated}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-red-400
              ${item.userLiked ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400'}`}>
            <Heart size={16} className={item.userLiked ? 'fill-current' : ''} />
            {item.likeCount}
          </button>
        </div>

        {/* Fields */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {fieldEntries.map(({ label, value, type, desc }) => (
            <div key={label} className="py-3 flex items-start gap-4 flex-col sm:flex-row">
              <div className="w-48 shrink-0">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
                {desc && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 max-w-[90%] leading-tight">{desc}</p>}
              </div>
              <div className="flex-1 w-full min-w-0">
                {value === null || value === undefined ? (
                  <span className="text-slate-300 dark:text-slate-700 text-sm">—</span>
                ) : type === 'bool' ? (
                  <span className={`badge ${value ? 'badge-green' : 'badge-gray'}`}>{value ? 'Yes' : 'No'}</span>
                ) : type === 'link' ? (
                  <a href={value} target="_blank" rel="noreferrer"
                    className="text-brand-600 dark:text-brand-400 hover:underline text-sm flex items-center gap-1 truncate w-fit max-w-full">
                    <span className="truncate">{value}</span> <ExternalLink size={12} className="shrink-0" />
                  </a>
                ) : type === 'text' ? (
                  <div className="text-sm text-slate-700 dark:text-slate-300 prose prose-sm prose-slate dark:prose-invert max-w-none break-words">
                    <ReactMarkdown>{value}</ReactMarkdown>
                  </div>
                ) : type === 'number' ? (
                  <span className="font-mono text-slate-800 dark:text-slate-200">{value}</span>
                ) : (
                  <span className="text-sm text-slate-800 dark:text-slate-200 break-words">{value}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Discussion */}
      <div className="card p-6">
        <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2 dark:text-white">
          <MessageSquare size={18} /> Discussion ({item.comments?.length ?? 0})
        </h2>

        <div className="space-y-4 mb-6">
          {item.comments?.map(c => (
            <div key={c.id} className="flex gap-3 animate-slide-in">
              <img src={c.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName)}&size=32&background=4c6ef5&color=fff`}
                className="w-8 h-8 rounded-full shrink-0" alt={c.authorName} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium dark:text-slate-200">{c.authorName}</span>
                  <span className="text-xs text-slate-400">{format(new Date(c.createdAt), 'MMM d, HH:mm')}</span>
                  {(isAdmin || user?.id === c.authorId) && (
                    <button onClick={() => deleteCommentMut.mutate(c.id)}
                      className="ml-auto btn-icon text-red-400 hover:text-red-600 dark:hover:text-red-400">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 break-words">{c.text}</p>
              </div>
            </div>
          ))}
          {item.comments?.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No comments yet. Be the first!</p>
          )}
        </div>

        {isAuthenticated && (
          <div className="flex gap-2">
            <input value={comment} onChange={e => setComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && comment.trim() && commentMut.mutate(comment)}
              placeholder="Write a comment..."
              className="input flex-1" />
            <button onClick={() => comment.trim() && commentMut.mutate(comment)}
              disabled={!comment.trim() || commentMut.isPending}
              className="btn-primary">
              <Send size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
