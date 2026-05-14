import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, ArrowLeftRight, Target,
  Wallet, BarChart2, LogOut
} from 'lucide-react';
import './Layout.css';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { 
    logout(); 
    navigate('/login'); 
  };

  const navItems = [
    { path: '/',         icon: <LayoutDashboard size={17}/>, label: 'Dashboard'    },
    { path: '/transactions', icon: <ArrowLeftRight  size={17}/>, label: 'Transactions' },
    { path: '/budgets',      icon: <Wallet          size={17}/>, label: 'Budgets'     },
    { path: '/goals',        icon: <Target          size={17}/>, label: 'Goals'        },
    { path: '/analytics',    icon: <BarChart2       size={17}/>, label: 'Analytics'    },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo" style={{ fontSize: '40px', marginBottom: '40px' }}>
  Fin<span>Track</span>
</div>
        

        <nav className="nav">
          <div className="nav-label">Menu</div>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">{user?.name?.charAt(0).toUpperCase()}</div>
            <div className="user-details">
              <div className="user-name">{user?.name}</div>
              
            </div>
          </div>
          
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={15}/> Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;