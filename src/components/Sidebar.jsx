import { useNavigate } from "react-router-dom";
import { menuByRole } from "../data/menuConfig";
import { useAuth } from "../context/AuthContext";
import SidebarItem from "./SidebarItem";

export default function Sidebar() {
  const { user, logout } = useAuth();

  const menus = menuByRole[user.role] || [];

  return (
    <aside className="w-72 bg-white border-r p-4">
      <h1 className="text-2xl font-bold mb-6">
        SPI
      </h1>

      <div className="space-y-2">
        {menus.map((menu) => (
          <SidebarItem key={menu.label} item={menu} />
        ))}
      </div>

      <button
        onClick={() => {
          logout();
          navigate("/");
        }}
        className="mt-8 w-full bg-red-500 text-white py-2 rounded-lg"
      >
        Logout
      </button>
    </aside>
  );
}
