interface UserListProps {
    users: string[]; // List of user IDs or names
}

const UserList: React.FC<UserListProps> = ({ users }) => {
    return (
        <div className="absolute top-4 right-4 bg-white dark:bg-zinc-900 shadow-md rounded-lg p-4 z-50 border dark:border-zinc-700 max-w-[200px]">
            <h3 className="font-bold mb-2 text-sm text-gray-500 uppercase tracking-wider">Active Users</h3>
            <ul className="flex flex-col gap-2">
                {users.map((u, i) => (
                    <li key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm truncate">{u}</span> {/* In real app map ID to Name */}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default UserList;
