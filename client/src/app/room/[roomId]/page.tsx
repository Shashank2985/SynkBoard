'use client';

import { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { getSocket } from '@/services/socket';
import dynamic from 'next/dynamic';

const Canvas = dynamic(() => import('@/components/Canvas'), {
    ssr: false,
    loading: () => <p className="text-center mt-20">Loading Canvas...</p>
});

import Toolbar from '@/components/Toolbar';
import Link from 'next/link';

// Note: Canvas component now handles user list and presence internally
export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
    const { roomId } = use(params);
    const { user, isAuthenticated } = useUserStore();
    const router = useRouter();
    
    const [tool, setTool] = useState<'pen' | 'eraser' | 'rect' | 'circle' | 'triangle' | 'text'>('pen');
    const [color, setColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(5);
    const saveCanvasRef = useRef<(() => Promise<void>) | null>(null);
    const socket = getSocket();

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
    }, [isAuthenticated, router]);

    const handleClear = () => {
        socket.emit('clear-canvas', roomId);
    };

    if (!user) return null;

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-white">
            {/* Back to Dashboard */}
            <div className="absolute top-4 left-4 z-50">
                <Link href="/dashboard" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-black text-sm font-bold">
                    Exit Room
                </Link>
            </div>

            <div className="absolute top-4 left-24 z-50 bg-white/80 p-2 rounded text-sm text-black">
                Room: {roomId}
            </div>

            <Toolbar
                currentTool={tool}
                setTool={setTool}
                clearCanvas={handleClear}
                color={color}
                setColor={setColor}
                lineWidth={lineWidth}
                setLineWidth={setLineWidth}
                onSave={() => saveCanvasRef.current?.()}
            />

            {/* Canvas handles state sync, users, and presence */}
            <Canvas
                roomId={roomId}
                tool={tool}
                color={color}
                lineWidth={lineWidth}
                onSaveRef={saveCanvasRef}
            />
        </div>
    );
}
