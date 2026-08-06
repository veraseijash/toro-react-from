import { Navigate, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Content from './pages/Content';
import About from './pages/About';
import History from './pages/History';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import useAuth from './context/useAuth';

function LoginRoute() {
  const { session } = useAuth();
  return session ? <Navigate to="/" replace /> : <Login />;
}

function App() {
  return (
    <>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/content" element={<Content />} />
            <Route path="/nosotros" element={<About />} />
            <Route path="/historia" element={<History />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/login" element={<LoginRoute />} />
      </Routes>

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        closeOnClick
        pauseOnHover
      />
    </>
  );
}

export default App;
