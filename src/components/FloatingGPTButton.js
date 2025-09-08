import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useChatStore } from '../stores/chatStore';
const FloatingGPTButton = ({ onOpen }) => {
    const running = useChatStore(s => s.streamRunning);
    return (_jsxs("button", { onClick: onOpen, "aria-label": "Open GPT Assistant", className: "fixed z-50 bottom-6 right-6 rounded-full bg-primary text-white shadow-lg w-14 h-14 flex items-center justify-center text-lg font-bold hover:scale-105 transition relative", children: ["GPT", running && _jsx("span", { className: "absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent animate-ping", "aria-hidden": "true" }), running && _jsx("span", { className: "absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent", "aria-hidden": "true" })] }));
};
export default FloatingGPTButton;
