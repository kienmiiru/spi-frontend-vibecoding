import { createContext, useContext, useState, useRef } from "react";
import { AlertTriangle, CircleCheck, Info, X } from "lucide-react";

const ConfirmContext = createContext(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({
    isOpen: false,
    title: "Konfirmasi Tindakan",
    message: "",
    confirmText: "Ya, Hapus",
    cancelText: "Batal",
    type: "danger" // 'danger' | 'warning' | 'info'
  });

  const resolveRef = useRef(null);

  const confirm = (options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      
      const config = typeof options === "string" 
        ? { message: options } 
        : options;

      setState({
        isOpen: true,
        title: config.title,
        message: config.message || "",
        confirmText: config.confirmText || (config.type === "danger" ? "Ya, Hapus" : "Ya"),
        cancelText: config.cancelText || "Batal",
        type: config.type || "danger"
      });
    });
  };

  const handleCancel = () => {
    if (resolveRef.current) {
      resolveRef.current(false);
    }
    setState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    if (resolveRef.current) {
      resolveRef.current(true);
    }
    setState((prev) => ({ ...prev, isOpen: false }));
  };

  // Color configurations based on dialog type
  const getTypeConfig = () => {
    switch (state.type) {
      case "danger":
        return {
          icon: <AlertTriangle className="w-6 h-6 text-rose-600" />,
          iconBg: "hidden bg-rose-50 ring-8 ring-rose-50/50",
          confirmBtn: "bg-c-error hover:bg-c-error-light text-white shadow-sm shadow-rose-200 focus:ring-rose-500",
          cancelBtn: "bg-c-success hover:bg-c-success-light text-white shadow-sm shadow-rose-200 focus:ring-rose-500",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          iconBg: "bg-amber-50 ring-8 ring-amber-50/50",
          confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-200 focus:ring-amber-500",
          cancelBtn: "",
        };
      case "info":
      default:
        return {
          icon: <CircleCheck className="w-24 h-24 text-c-red"/>,
          confirmBtn: "hidden",
          cancelBtn: "hidden",
        };
    }
  };

  const config = getTypeConfig();

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {/* Modern Premium Confirmation Modal */}
      {state.isOpen && (
        <div className="fixed font-poppins inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop with elegant blur */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={handleCancel}
          />

          {/* Modal Container */}
          <div className="relative bg-c-cream-100 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 transform transition-all duration-300 scale-100 overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            
            {/* Top Close Button */}
            <button
              onClick={handleCancel}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              {/* Animated/Glowing Icon */}
              <div className={`flex items-center justify-center w-12 h-12 rounded-full mb-5 ${config.iconBg} transition-all duration-300`}>
                {config.icon}
              </div>

              {/* Title & Message */}
              <h3 className="text-lg font-bold tracking-tight">
                {state.title}
              </h3>
              <p className="text-md mt-2 px-2 leading-relaxed">
                {state.message}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-7 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className={`w-full sm:w-auto min-w-[100px] px-4 py-2.5 border border-gray-200 text-xs font-semibold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-200 ${config.cancelBtn}`}
              >
                {state.cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`w-full sm:w-auto min-w-[100px] px-4 py-2.5 text-xs font-semibold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.confirmBtn}`}
              >
                {state.confirmText}
              </button>
            </div>

          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
