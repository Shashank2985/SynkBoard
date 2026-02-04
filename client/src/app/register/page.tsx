'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import api from '@/services/api';
import Link from 'next/link';

export default function RegisterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRegister = async (data: any) => {
        setIsLoading(true);
        setError('');
        try {
            await api.post('/auth/register', data);
            router.push('/login');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-50 dark:bg-black">
            <h1 className="text-4xl font-bold mb-8">Join Synkboard</h1>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <AuthForm type="register" onSubmit={handleRegister} isLoading={isLoading} />
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                Already have an account? <Link href="/login" className="text-blue-500 hover:underline">Log in</Link>
            </p>
        </div>
    );
}
