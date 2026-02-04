import { useState } from 'react';

interface AuthFormProps {
    type: 'login' | 'register';
    onSubmit: (data: any) => void;
    isLoading?: boolean;
}

const AuthForm: React.FC<AuthFormProps> = ({ type, onSubmit, isLoading = false }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (type === 'register') {
            onSubmit({ name, email, password });
        } else {
            onSubmit({ email, password });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm mx-auto p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-center mb-4">{type === 'register' ? 'Create Account' : 'Welcome Back'}</h2>

            {type === 'register' && (
                <div className="flex flex-col">
                    <label className="text-sm font-medium mb-1">Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="p-2 border rounded border-gray-300 dark:border-zinc-700 dark:bg-zinc-800"
                        required
                    />
                </div>
            )}

            <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="p-2 border rounded border-gray-300 dark:border-zinc-700 dark:bg-zinc-800"
                    required
                />
            </div>

            <div className="flex flex-col">
                <label className="text-sm font-medium mb-1">Password</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="p-2 border rounded border-gray-300 dark:border-zinc-700 dark:bg-zinc-800"
                    required
                />
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
            >
                {isLoading ? 'Loading...' : (type === 'register' ? 'Sign Up' : 'Log In')}
            </button>
        </form>
    );
};

export default AuthForm;
