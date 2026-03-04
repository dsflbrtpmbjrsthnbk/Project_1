import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { tagsApi } from '../../services/api';

export default function TagsInput({ value, onChange }) {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const containerRef = useRef(null);

    const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];

    useEffect(() => {
        if (inputValue.length > 0) {
            tagsApi.autocomplete(inputValue).then(data => {
                setSuggestions(data.filter(t => !tags.includes(t)));
                setShowSuggestions(true);
            });
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [inputValue, tags.join(',')]);

    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setShowSuggestions(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const addTag = (tag) => {
        const newTag = tag.trim().toLowerCase();
        if (!newTag || tags.includes(newTag)) return;
        onChange([...tags, newTag].join(', '));
        setInputValue('');
        setShowSuggestions(false);
    };

    const removeTag = (indexToRemove) => {
        onChange(tags.filter((_, i) => i !== indexToRemove).join(', '));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <div className="input flex flex-wrap gap-2 items-center min-h-[42px] py-1.5 focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-transparent cursor-text"
                onClick={() => { const input = containerRef.current?.querySelector('input'); input && input.focus(); }}>
                {tags.map((tag, index) => (
                    <span key={index} className="badge-gray flex items-center gap-1 text-sm py-1">
                        {tag}
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(index); }} className="hover:text-red-500 rounded-full cursor-pointer">
                            <X size={12} />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => inputValue && setShowSuggestions(true)}
                    className="flex-1 min-w-[120px] bg-transparent outline-none p-1 text-sm dark:text-white"
                    placeholder={tags.length === 0 ? "books, fiction, sci-fi..." : ""}
                />
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                    {suggestions.map((suggestion) => (
                        <button
                            key={suggestion}
                            type="button"
                            onClick={() => addTag(suggestion)}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                        >
                            #{suggestion}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
