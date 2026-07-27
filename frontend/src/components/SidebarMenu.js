import { Link, useLocation } from "react-router-dom";
import { MENU_ITEMS } from "../permissions";
import { usePermissions } from "../hooks/usePermissions";

function SidebarMenu({ onNavigate }) {
  const location = useLocation();
  const { hasAccess } = usePermissions();

  const visibleItems = MENU_ITEMS.filter((item) => hasAccess(item.key));

  return (
    <nav className="sp-sidebar-nav">
      {visibleItems.map((item) => (
        <Link
          key={item.key}
          to={item.path}
          className={`nav-link${location.pathname === item.path ? " active" : ""}`}
          onClick={onNavigate}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export default SidebarMenu;
