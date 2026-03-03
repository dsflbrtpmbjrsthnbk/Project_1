import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, MessageSquare, Send, Trash2, ArrowLeft, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
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
    queryFn: () => itemsApi.get(Number(inventoryId), Number(itemId))
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
  if (!item) return <div>Not found</div>;

  const fields = inv.fields;

  const fieldEntries = [
    ...([1,2,3].filter(n => fields[`string${n}`]).map(n => ({ label: fields[`string${n}`], value: item[`string${n}`], type: 'string' }))),
    ...([1,2,3].filter(n => fields[`text${n}`]).map(n => ({ label: fields[`text${n}`], value: item[`text${n}`], type: 'text' }))),
    ...([1,2,3].filter(n => fields[`number${n}`]).map(n => ({ label: fields[`number${n}`], value: item[`number${n}`], type: 'number' }))),
    ...([1,2,3].filter(n => fields[`link${n}`]).map(n => ({ label: fields[`link${n}`], value: item[`link${n}`], type: 'link' }))),
    ...([1,2,3].filter(n => fields[`bool${n}`]).map(n => ({ label: fields[`bool${n}`], value: item[`bool${n}`], type: 'bool' }))),
  ];

  return (
    <div className="max-w-3xl animate-fade-in">
      {/* Breadcrumb */}
      <Link to={`/inventories/${inventoryId}`} className="flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600 mb-4">
        <ArrowLeft size={14} /> {inv?.title}
      </Link>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="custom-id text-base">{item.customId}</span>
            <p className="text-xs text-slate-400 mt-1">
              Created {format(new Date(item.createdAt), 'PPP')} · Updated {format(new Date(item.updatedAt), 'PPP')}
            </p>
          </div>
          <button onClick={() => likeMut.mutate()}
            disabled={!isAuthenticated}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all
              ${item.userLiked ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500'}`}>
            <Heart size={16} className={item.userLiked ? 'fill-current' : ''} />
            {item.likeCount}
          </button>
        </div>

        {/* Fields */}
        <div className="divide-y divide-slate-100">
          {fieldEntries.map(({ label, value, type }) => (
            <div key={label} className="py-3 flex items-start gap-4">
              <span className="text-sm font-medium text-slate-500 w-40 shrink-0">{label}</span>
              <div className="flex-1">
                {value === null || value === undefined ? (
                  <span className="text-slate-300 text-sm">—</span>
                ) : type === 'bool' ? (
                  <span className={`badge ${value ? 'badge-green' : 'badge-gray'}`}>{value ? 'Yes' : 'No'}</span>
                ) : type === 'link' ? (
                  <a href={value} target="_blank" rel="noreferrer"
                    className="text-brand-600 hover:underline text-sm flex items-center gap-1">
                    {value} <ExternalLink size={12} />
                  </a>
                ) : type === 'text' ? (
                  <div className="text-sm text-slate-700 prose prose-sm max-w-none">
                    <ReactMarkdown>{value}</ReactMarkdown>
                  </div>
                ) : type === 'number' ? (
                  <span className="font-mono text-slate-800">{value}</span>
                ) : (
                  <span className="text-sm text-slate-800">{value}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Discussion */}
      <div className="card p-6">
        <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
          <MessageSquare size={18} /> Discussion ({item.comments?.length ?? 0})
        </h2>

        <div className="space-y-4 mb-6">
          {item.comments?.map(c => (
            <div key={c.id} className="flex gap-3 animate-slide-in">
              <img src={c.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName)}&size=32&background=4c6ef5&color=fff`}
                className="w-8 h-8 rounded-full shrink-0" alt={c.authorName} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{c.authorName}</span>
                  <span className="text-xs text-slate-400">{format(new Date(c.createdAt), 'MMM d, HH:mm')}</span>
                  {(isAdmin || user?.id === c.authorId) && (
                    <button onClick={() => deleteCommentMut.mutate(c.id)}
                      className="ml-auto btn-icon text-red-400 hover:text-red-600">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-700 break-words">{c.text}</p>
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
