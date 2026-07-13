import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function SidebarItem({ item }) {
  const [open, setOpen] = useState(true);

  const Icon = item.icon;

  if (item.children) {
    return (
      <div className="w-full">
        <div className="flex items-center w-full">
          <NavLink
            to={item.path || '#'}
            className={({ isActive }) =>
                  `w-full flex items-center justify-between px-3 py-2 rounded-xl text-white transition-colors duration-150 ${
                    isActive
                      ? "bg-c-red font-medium"
                      : "bg-c-maroon hover:bg-c-red/40"
                  }`
                }
          >
            <div className="flex items-center gap-2">
              {Icon && <Icon size={18} className="text-white" />}
              <span>{item.label}</span>
            </div>
            <ChevronRight
                onClick={(e) => {e.preventDefault(); e.stopPropagation(); setOpen(!open)}}
                size={18}
                className={`transition-transform duration-200 text-white ${open ? "rotate-90" : ""}`}
              />
          </NavLink>
        </div>

        {open && (
          <div className="ml-4 mt-1 space-y-1 pl-2">
            {item.children.map((child) => {
              const SubIcon = child.icon
              return <NavLink
                key={child.path}
                to={child.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white transition-colors duration-150 ${
                    isActive
                      ? "bg-c-red font-medium"
                      : "bg-c-maroon hover:bg-c-red/40"
                  }`
                }
              >
                {SubIcon && <SubIcon size={18} className="text-white" />}
                <span>{child.label}</span>
              </NavLink>
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-xl text-white transition-colors duration-150 ${
          isActive
            ? "bg-c-red font-medium"
            : "bg-c-maroon hover:bg-c-red/40"
        }`
      }
    >
      {Icon && <Icon size={18} className="text-white" />}
      <span>{item.label}</span>
    </NavLink>
  );
}
