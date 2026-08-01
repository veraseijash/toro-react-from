import { Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import About from './pages/About';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

function App() {
  return (
    <>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/nosotros" element={<About />} />
        </Route>

        <Route path="/login" element={<Login />} />

        <Route path="*" element={<NotFound />} />
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