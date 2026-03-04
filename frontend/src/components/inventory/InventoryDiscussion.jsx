import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Trash2, MessageSquare } from 'lucide-react';
import { inventoriesApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

export default function InventoryDiscussion({ inventoryId }) {
    const { user, isAuthenticated, isAdmin } = useAuth();
    const { t } = useTranslation();
    const qc = useQueryClient();
    const [comment, setComment] = useState('');

    const { data: comments, isLoading } = useQuery({
        queryKey: ['inv_comments', inventoryId],
        queryFn: () => inventoriesApi.getComments(inventoryId),
        refetchInterval: 3000 // Real-time polling every 3 seconds
    });

    const commentMut = useMutation({
        mutationFn: (text) => inventoriesApi.addComment(inventoryId, { text }),
        onSuccess: () => { setComment(''); qc.invalidateQueries(['inv_comments', inventoryId]); }
    });

    const deleteMut = useMutation({
        mutationFn: (commentId) => inventoriesApi.deleteComment(inventoryId, commentId),
        onSuccess: () => qc.invalidateQueries(['inv_comments', inventoryId])
    });

    return (
        <div className="card p-6 max-w-3xl">
            <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2 dark:text-white">
                <MessageSquare size={18} /> {t('discussion')} ({comments?.length ?? 0})
            </h2>

            <div className="space-y-4 mb-6">
                {isLoading && <div className="text-sm text-slate-500">{t('loading')}</div>}
                {comments?.map(c => (
                    <div key={c.id} className="flex gap-3 animate-slide-in">
                        <img src={c.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName)}&size=32&background=4c6ef5&color=fff`}
                            className="w-8 h-8 rounded-full shrink-0" alt={c.authorName} />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium dark:text-slate-200">{c.authorName}</span>
                                <span className="text-xs text-slate-400">{format(new Date(c.createdAt), 'MMM d, HH:mm')}</span>
                                {(isAdmin || user?.id === c.authorId) && (
                                    <button onClick={() => deleteMut.mutate(c.id)}
                                        className="ml-auto btn-icon text-red-400 hover:text-red-600 dark:hover:text-red-400">
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 break-words">{c.text}</p>
                        </div>
                    </div>
                ))}
                {comments?.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">{t('noComments')}</p>
                )}
            </div>

            {isAuthenticated && (
                <div className="flex gap-2">
                    <input value={comment} onChange={e => setComment(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && comment.trim() && commentMut.mutate(comment)}
                        placeholder={t('writeDomment')}
                        className="input flex-1" />
                    <button onClick={() => comment.trim() && commentMut.mutate(comment)}
                        disabled={!comment.trim() || commentMut.isPending}
                        className="btn-primary">
                        <Send size={15} />
                    </button>
                </div>
            )}
        </div>
    );
}
