import React, { useState } from 'react';

/**
 * Session Start Screen — user declares their focus task.
 * Landscape layout: centered card with hero + form side-by-side.
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
        <div className="flex items-center justify-center h-full p-8 animate-fade-in">
            <div className="w-full max-w-3xl flex flex-col md:flex-row gap-10 items-start">
                {/* Left: Hero / Branding */}
                <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-4 pt-4">
                    <span className="text-6xl">🧠</span>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-50">
                        Ready to Focus?
                    </h1>
                    <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400 max-w-sm">
                        Tell CognitionX what you're working on.
                        We'll keep you on track and reward your focus with credits.
                    </p>

                    {/* Quick suggestions */}
                    <div className="mt-2">
                        <p className="text-xs mb-2 text-gray-400 dark:text-gray-500">Quick pick:</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setTask(s)}
                                    className="px-3 py-1.5 rounded-full text-xs cursor-pointer transition-all
                                               bg-gray-100 dark:bg-white/[0.04] text-gray-500 dark:text-gray-400
                                               border border-gray-200 dark:border-white/[0.08]
                                               hover:border-violet-400 dark:hover:border-violet-500
                                               hover:text-gray-700 dark:hover:text-gray-200"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Task Input Form */}
                <form
                    onSubmit={handleSubmit}
                    className="flex-1 flex flex-col gap-5 w-full max-w-md
                               bg-white dark:bg-white/[0.03] rounded-2xl p-6
                               border border-gray-200 dark:border-white/[0.06]
                               shadow-sm dark:shadow-none"
                >
                    <div>
                        <label
                            htmlFor="task-input"
                            className="block text-xs font-semibold uppercase tracking-widest mb-2
                                       text-gray-400 dark:text-gray-500"
                        >
                            What are you working on?
                        </label>
                        <textarea
                            id="task-input"
                            value={task}
                            onChange={(e) => setTask(e.target.value.slice(0, 200))}
                            placeholder="e.g. Studying for my calculus midterm..."
                            rows={4}
                            className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-all
                                       bg-gray-50 dark:bg-white/[0.04]
                                       text-gray-900 dark:text-gray-100
                                       border border-gray-200 dark:border-white/[0.08]
                                       focus:border-violet-400 dark:focus:border-violet-500
                                       placeholder:text-gray-400 dark:placeholder:text-gray-600"
                            maxLength={200}
                        />
                        <div className="flex justify-end mt-1">
                            <span className="text-xs text-gray-400 dark:text-gray-600">
                                {task.length}/200
                            </span>
                        </div>
                    </div>

                    {/* Start Button */}
                    <button
                        type="submit"
                        disabled={!task.trim() || isLoading}
                        className="w-full py-3.5 rounded-xl font-bold text-sm text-white cursor-pointer
                                   transition-all disabled:opacity-40 disabled:cursor-not-allowed
                                   bg-violet-600 hover:bg-violet-700
                                   shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30
                                   disabled:shadow-none disabled:bg-gray-300 dark:disabled:bg-gray-800"
                    >
                        {isLoading ? '⏳ Starting...' : '🚀 Start Focus Session'}
                    </button>
                </form>
            </div>
        </div>
    );
}
