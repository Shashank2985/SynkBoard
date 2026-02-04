'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import api from '@/services/api';

export default function Dashboard() {
    const router = useRouter();
    const { user, logout } = useUserStore();
    const [joinRoomId, setJoinRoomId] = useState('');

    const handleCreateRoom = async () => {
        try {
            const res = await api.post('/rooms/create', { userId: user?.id });
            router.push(`/room/${res.data.roomId}`);
        } catch (error) {
            console.error("Failed to create room", error);
            alert("Failed to create room");
        }
    };

    const handleJoinRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/rooms/join', { roomId: joinRoomId, userId: user?.id });
            router.push(`/room/${joinRoomId}`);
        } catch (error) {
            console.error("Failed to join room", error);
            alert("Failed to join room. Check ID.");
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center p-24 bg-zinc-50 dark:bg-black text-black dark:text-white">
            <header className="w-full max-w-5xl flex justify-between items-center mb-12">
                <h1 className="text-3xl font-bold">Welcome, {user?.name}</h1>
                <button
                    onClick={() => { logout(); router.push('/login'); }}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded text-white"
                >
                    Logout
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                {/* Create Room Card */}
                <div className="p-8 border rounded-lg shadow-lg bg-white dark:bg-zinc-900 flex flex-col items-center text-center">
                    <h2 className="text-2xl font-bold mb-4">Start a New Session</h2>
                    <p className="mb-6 text-zinc-600 dark:text-zinc-400">Create a blank canvas and invite collaborators.</p>
                    <button
                        onClick={handleCreateRoom}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg w-full"
                    >
                        Create Room
                    </button>
                </div>

                {/* Join Room Card */}
                <div className="p-8 border rounded-lg shadow-lg bg-white dark:bg-zinc-900 flex flex-col items-center text-center">
                    <h2 className="text-2xl font-bold mb-4">Join Existing Room</h2>
                    <p className="mb-6 text-zinc-600 dark:text-zinc-400">Enter a Room ID to jump into a session.</p>
                    <form onSubmit={handleJoinRoom} className="w-full flex flex-col gap-4">
                        <input
                            type="text"
                            placeholder="Enter Room ID"
                            value={joinRoomId}
                            onChange={(e) => setJoinRoomId(e.target.value)}
                            className="p-3 border rounded dark:bg-zinc-800 dark:border-zinc-700 w-full"
                            required
                        />
                        <button
                            type="submit"
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg w-full"
                        >
                            Join Room
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
