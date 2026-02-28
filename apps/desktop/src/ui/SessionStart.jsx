import React, { useState } from 'react';

/**
 * Session Start Screen — user declares their focus task.
 * @param {{ onStart: (task: string) => void }} props
 */
export default function SessionStart({ onStart }) {
    const [task, setTask] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!task.trim() || task.trim().length === 0) return;

        setIsLoading(true);
        await onStart(task.trim());
        setIsLoading(false);
    };

    const suggestions = [
        'Studying for midterm exam',
        'Working on CS assignment',
        'Reading research paper',
        'Writing essay for English class',
        'Coding a side project',
    ];

    return (
        <div className="p-6 flex flex-col h-full animate-fade-in">
            {/* Hero */}
            <div className="flex flex-col items-center text-center mt-8 mb-8">
                <span className="text-5xl mb-4">🧠</span>
                <h1 className="text-2xl font-extrabold mb-2" style={{ color: 'var(--cx-text-primary)' }}>
                    Ready to Focus?
                </h1>
                <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--cx-text-secondary)' }}>
                    Tell CognitionX what you're working on.
                    We'll keep you on track and reward your focus.
                </p>
            </div>

            {/* Task Input Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
                <div>
                    <label
                        htmlFor="task-input"
                        className="block text-xs font-medium mb-2"
                        style={{ color: 'var(--cx-text-muted)' }}
                    >
                        WHAT ARE YOU WORKING ON?
                    </label>
                    <textarea
                        id="task-input"
                        value={task}
                        onChange={(e) => setTask(e.target.value.slice(0, 200))}
                        placeholder="e.g. Studying for my calculus midterm..."
                        rows={3}
                        className="w-full rounded-lg px-4 py-3 text-sm resize-none outline-none transition-all"
                        style={{
                            background: 'var(--cx-bg-secondary)',
                            color: 'var(--cx-text-primary)',
                            border: '1px solid var(--cx-border)',
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--cx-accent)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--cx-border)'}
                        maxLength={200}
                    />
                    <div className="flex justify-end mt-1">
                        <span className="text-xs" style={{ color: 'var(--cx-text-muted)' }}>
                            {task.length}/200
                        </span>
                    </div>
                </div>

                {/* Quick suggestions */}
                <div>
                    <p className="text-xs mb-2" style={{ color: 'var(--cx-text-muted)' }}>Quick pick:</p>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setTask(s)}
                                className="px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer"
                                style={{
                                    background: 'var(--cx-bg-card)',
                                    color: 'var(--cx-text-secondary)',
                                    border: '1px solid var(--cx-border)',
                                }}
                                onMouseOver={(e) => {
                                    e.target.style.borderColor = 'var(--cx-accent)';
                                    e.target.style.color = 'var(--cx-text-primary)';
                                }}
                                onMouseOut={(e) => {
                                    e.target.style.borderColor = 'var(--cx-border)';
                                    e.target.style.color = 'var(--cx-text-secondary)';
                                }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Start Button */}
                <div className="mt-auto pb-2">
                    <button
                        type="submit"
                        disabled={!task.trim() || isLoading}
                        className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                            background: task.trim() ? 'var(--cx-accent)' : 'var(--cx-bg-elevated)',
                            boxShadow: task.trim() ? '0 0 20px var(--cx-glow)' : 'none',
                        }}
                        onMouseOver={(e) => {
                            if (task.trim()) e.target.style.background = 'var(--cx-accent-hover)';
                        }}
                        onMouseOut={(e) => {
                            if (task.trim()) e.target.style.background = 'var(--cx-accent)';
                        }}
                    >
                        {isLoading ? '⏳ Starting...' : '🚀 Start Focus Session'}
                    </button>
                </div>
            </form>
        </div>
    );
}
