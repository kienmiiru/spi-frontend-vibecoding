import { useNavigate } from "react-router-dom";
import { menuByRole } from "../data/menuConfig";
import { useAuth } from "../context/AuthContext";
import SidebarItem from "./SidebarItem";
import spiLogo from "../assets/spi_logo.png";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menus = menuByRole[user?.role] || [];

  return (
    <aside className="w-64 bg-c-maroon text-white flex flex-col justify-between h-screen sticky top-0 font-poppins">
      <div className="flex flex-col flex-1 overflow-hidden p-4">
        <div className="flex items-center justify-center mb-6 py-2">
          <img src={spiLogo} alt="SPI Logo" className="h-14 object-contain" />
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto pr-1 text-sm">
          {menus.map((menu) => (
            <SidebarItem key={menu.label} item={menu} />
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-c-maroon-600">
        <div className="bg-c-cream text-black p-4 flex flex-col gap-1 shadow-sm">
          <div className="font-semibold text-sm truncate">{user?.username}</div>
          <div className="text-xs font-medium opacity-80">{user?.role}</div>
        </div>

        <button
          onClick={() => {
            logout();
            navigate("/");
          }}
          className="w-full bg-c-red hover:bg-c-red-600 text-white py-2 font-medium cursor-pointer transition-colors duration-200 text-sm shadow-sm"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
