import { FaPen, FaEraser, FaTrash, FaSave, FaSquare, FaCircle, FaFont, FaPlay } from 'react-icons/fa';
import { BsTriangle } from 'react-icons/bs';

export type ToolType = 'pen' | 'eraser' | 'rect' | 'circle' | 'triangle' | 'text';

interface ToolbarProps {
    currentTool: ToolType;
    setTool: (tool: ToolType) => void;
    clearCanvas: () => void;
    color: string;
    setColor: (color: string) => void;
    lineWidth: number;
    setLineWidth: (width: number) => void;
    onSave: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ currentTool, setTool, clearCanvas, color, setColor, lineWidth, setLineWidth, onSave }) => {
    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-zinc-900 shadow-xl rounded-full px-6 py-3 flex items-center gap-4 z-50 border dark:border-zinc-700">
            {/* Draw Tools */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setTool('pen')}
                    className={`p-2 rounded-full transition-colors ${currentTool === 'pen' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                    title="Pen"
                >
                    <FaPen />
                </button>
                <button
                    onClick={() => setTool('eraser')}
                    className={`p-2 rounded-full transition-colors ${currentTool === 'eraser' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                    title="Eraser"
                >
                    <FaEraser />
                </button>
            </div>

            <div className="w-px h-6 bg-gray-300 dark:bg-zinc-700"></div>

            {/* Shapes */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setTool('rect')}
                    className={`p-2 rounded-full transition-colors ${currentTool === 'rect' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                    title="Rectangle"
                >
                    <FaSquare />
                </button>
                <button
                    onClick={() => setTool('circle')}
                    className={`p-2 rounded-full transition-colors ${currentTool === 'circle' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                    title="Circle"
                >
                    <FaCircle />
                </button>
                <button
                    onClick={() => setTool('triangle')}
                    className={`p-2 rounded-full transition-colors ${currentTool === 'triangle' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                    title="Triangle"
                >
                    <BsTriangle />
                </button>
                <button
                    onClick={() => setTool('text')}
                    className={`p-2 rounded-full transition-colors ${currentTool === 'text' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                    title="Text"
                >
                    <FaFont />
                </button>
            </div>

            <div className="w-px h-6 bg-gray-300 dark:bg-zinc-700"></div>

            {/* Settings */}
            <div className="flex items-center gap-3">
                <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    title="Color Picker"
                />

                <input
                    type="range"
                    min="1"
                    max="50"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(parseInt(e.target.value))}
                    className="w-24 cursor-pointer"
                    title="Brush Size"
                />
            </div>

            <div className="w-px h-6 bg-gray-300 dark:bg-zinc-700"></div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button
                    onClick={clearCanvas}
                    className="p-2 rounded-full hover:bg-red-100 text-red-500 hover:text-red-700 dark:hover:bg-red-900 transition-colors"
                    title="Clear Canvas"
                >
                    <FaTrash />
                </button>

                <button
                    onClick={onSave}
                    className="p-2 rounded-full hover:bg-green-100 text-green-500 hover:text-green-700 dark:hover:bg-green-900 transition-colors"
                    title="Save Canvas"
                >
                    <FaSave />
                </button>
            </div>
        </div>
    );
};

export default Toolbar;
