import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown } from "lucide-react";

export default function SidebarItem({ item }) {
  const [open, setOpen] = useState(false);

  const Icon = item.icon;

  if (item.children) {
    return (
      <div>
        <div className="flex items-center">
          <NavLink
            to={item.path || '#'}
            className={({ isActive }) =>
                  `w-full flex items-center justify-between px-3 py-2 rounded-lg ${
                    isActive
                      ? "bg-gray-200"
                      : "hover:bg-gray-100"
                  }`
                }
          >
            <div className="flex items-center gap-2">
              {Icon && <Icon size={18} />}
              <span>{item.label}</span>
            </div>
            <ChevronDown
                onClick={(e) => {e.preventDefault(); e.stopPropagation(); setOpen(!open)}}
                size={18}
                className={`transition ${open ? "rotate-180" : ""}`}
              />
          </NavLink>
        </div>

        {open && (
          <div className="ml-6 mt-2 space-y-1">
            {item.children.map((child) => (
              <NavLink
                key={child.path}
                to={child.path}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm ${
                    isActive
                      ? "bg-gray-200"
                      : "hover:bg-gray-100"
                  }`
                }
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-lg ${
          isActive
            ? "bg-gray-200"
            : "hover:bg-gray-100"
        }`
      }
    >
      {Icon && <Icon size={18} />}
      <span>{item.label}</span>
    </NavLink>
  );
}
