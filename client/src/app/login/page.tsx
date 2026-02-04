'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import api from '@/services/api';
import { useUserStore } from '@/store/userStore';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const login = useUserStore((state) => state.login);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (data: any) => {
        setIsLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/login', data);
            login(res.data.user, res.data.token);
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-50 dark:bg-black">
            <h1 className="text-4xl font-bold mb-8">Login to Synkboard</h1>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <AuthForm type="login" onSubmit={handleLogin} isLoading={isLoading} />
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                Don't have an account? <Link href="/register" className="text-blue-500 hover:underline">Sign up</Link>
            </p>
        </div>
    );
}
