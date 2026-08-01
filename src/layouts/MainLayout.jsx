import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

function MainLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-content">
        <div className="container-fluid py-4 px-4 px-lg-5">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default MainLayout;
