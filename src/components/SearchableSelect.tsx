import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    allowCustom?: boolean;
    label?: string;
    icon?: React.ReactNode;
}

const SearchableSelect = ({
    options,
    value,
    onChange,
    placeholder = "Select an option...",
    allowCustom = false,
    label,
    icon
}: SearchableSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);
    const displayValue = selectedOption ? selectedOption.label : (allowCustom ? value : '');

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleCustomSubmit = () => {
        if (allowCustom && searchTerm.trim()) {
            onChange(searchTerm.trim());
            setIsOpen(false);
            setSearchTerm('');
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            {label && (
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            )}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full px-4 py-2 rounded-lg border transition-all cursor-pointer bg-white
                    ${isOpen ? 'border-delaval-blue ring-2 ring-delaval-blue/10 shadow-sm' : 'border-slate-300 hover:border-slate-400'}
                `}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
                    <span className={`text-sm truncate ${displayValue ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                        {displayValue || placeholder}
                    </span>
                </div>
                <ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-[100] w-full mt-2 bg-white rounded-xl border border-slate-200 shadow-2xl py-2 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                    <div className="px-3 pb-2 border-b border-slate-100 flex items-center gap-2">
                        <Search size={14} className="text-slate-400" />
                        <input
                            autoFocus
                            type="text"
                            className="w-full py-1 text-sm outline-none placeholder:text-slate-400"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCustomSubmit();
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="max-h-[240px] overflow-y-auto pt-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.value}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(opt.value);
                                    }}
                                    className={`px-4 py-2 text-sm flex items-center justify-between cursor-pointer transition-colors
                                        ${opt.value === value ? 'bg-blue-50 text-delaval-blue font-bold' : 'text-slate-700 hover:bg-slate-50'}
                                    `}
                                >
                                    {opt.label}
                                    {opt.value === value && <Check size={14} />}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-center">
                                {allowCustom && searchTerm.trim() ? (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCustomSubmit();
                                        }}
                                        className="text-xs font-bold text-delaval-blue bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 border border-blue-200 w-full"
                                    >
                                        Use custom: "{searchTerm}"
                                    </button>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">No matches found</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
