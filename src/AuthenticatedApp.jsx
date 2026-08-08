import App from './App';
import { SocketProvider } from './context/SocketContext';
import useAuth from './context/useAuth';

function AuthenticatedApp() {
  const { session } = useAuth();

  return (
    <SocketProvider userId={session?.user?.id || 0}>
      <App />
    </SocketProvider>
  );
}

export default AuthenticatedApp;
