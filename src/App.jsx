import { Navigate, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Content from './pages/Content';
import About from './pages/About';
import History from './pages/History';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Chats from './pages/Chats';
import SettingExams from './pages/SettingExams';
import OrderExams from './pages/OrderExams';
import RoutinesExams from './pages/RoutinesExams';
import ListAntibiotics from './pages/ListAntibiotics';
import ListGerms from './pages/ListGerms';
import ListParasiticforms from './pages/ListParasiticforms';
import GroupWorksheet from './pages/GroupWorksheet';
import SpecialTests from './pages/SpecialTests';
import PaymentMethods from './pages/PaymentMethods';
import RegisteredUsers from './pages/RegisteredUsers';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionRoute from './components/PermissionRoute';
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
            <Route element={<PermissionRoute permission="history" />}>
              <Route path="/historia" element={<History />} />
            </Route>
            <Route element={<PermissionRoute permission="setting-exams" />}>
              <Route path="/configuracion/examenes" element={<SettingExams />} />
              <Route path="/configuracion/ordenar" element={<OrderExams />} />
            </Route>
            <Route path="/chats" element={<Chats />} />
            <Route element={<PermissionRoute permission="routines-exams" />}>
              <Route path="/configuracion/routines" element={<RoutinesExams />} />
            </Route>
            <Route element={<PermissionRoute permission="antibiotics-exams" />}>
              <Route path="/configuracion/antibiotics" element={<ListAntibiotics />} />
            </Route>
            <Route element={<PermissionRoute permission="germs-exams" />}>
              <Route path="/configuracion/germs" element={<ListGerms />} />
            </Route>
            <Route element={<PermissionRoute permission="parasiticforms-exams" />}>
              <Route path="/configuracion/parasiticforms" element={<ListParasiticforms />} />
            </Route>
            <Route element={<PermissionRoute permission="special-tests" />}>
              <Route path="/configuracion/special-tests" element={<SpecialTests />} />
            </Route>
            <Route element={<PermissionRoute permission="payment-methods" />}>
              <Route path="/configuracion/payment-methods" element={<PaymentMethods />} />
            </Route>
            <Route element={<PermissionRoute permission="registered-users" />}>
              <Route path="/configuracion/registered-users" element={<RegisteredUsers />} />
            </Route>
            <Route element={<PermissionRoute permission="group-worksheet" />}>
              <Route path="/configuracion/group-worksheet" element={<GroupWorksheet />} />
            </Route>
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
