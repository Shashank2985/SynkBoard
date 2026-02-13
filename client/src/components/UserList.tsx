import { UserPresence } from '@/types/sync.types';

interface UserListProps {
    users: UserPresence[];
}

const UserList: React.FC<UserListProps> = ({ users }) => {
    return (
        <div className="absolute top-4 right-4 bg-white dark:bg-zinc-900 shadow-md rounded-lg p-4 z-50 border dark:border-zinc-700 max-w-[250px]">
            <h3 className="font-bold mb-2 text-sm text-gray-500 uppercase tracking-wider">
                Active Users ({users.length})
            </h3>
            <ul className="flex flex-col gap-2">
                {users.map((user) => (
                    <li key={user.socketId} className="flex items-center gap-2">
                        <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: user.userColor || '#4ECDC4' }}
                        ></div>
                        <span className="text-sm truncate flex-1">{user.userName || 'Anonymous'}</span>
                        {user.activeElement && (
                            <span className="text-xs text-gray-400" title="Editing">✏️</span>
                        )}
                    </li>
                ))}
                {users.length === 0 && (
                    <li className="text-sm text-gray-400 italic">No other users</li>
                )}
            </ul>
        </div>
    );
};

export default UserList;
