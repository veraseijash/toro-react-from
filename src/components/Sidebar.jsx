import { useEffect, useRef, useState } from 'react';
import { Tooltip } from 'bootstrap';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import toroLogo from '../assets/images/toro.svg';
import useAuth from '../context/useAuth';
import { useSocket } from '../context/SocketContext';
import {
  countUnreadByRecipientUserId,
  findUnreadByUserId,
} from '../services/messagesServices';

const menuItems = [
  { to: '/', label: 'Inicio', icon: 'ico-home6', end: true },
  { to: '/historia', label: 'Historia', icon: 'ico-clipboard-clock' },
  {
    id: 'cuenta',
    label: 'Mi cuenta',
    icon: 'ico-user4',
    children: [
      { to: '/login', label: 'Iniciar sesión' },
      { to: '/content', label: 'Mi contenido' },
    ],
  },
];

function UnreadConversation({ message, onSelect }) {
  const [photoError, setPhotoError] = useState(false);
  const sender = message.sender;
  const senderPhotoUrl = sender?.url_photo
    ? `http://localhost:3000/images/${sender.url_photo.replace(/^\/+/, '')}`
    : null;

  return (
    <li
      className="sidebar-conversation-item"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(message)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(message);
        }
      }}
    >
      {senderPhotoUrl && !photoError ? (
        <img
          className="sidebar-avatar"
          src={senderPhotoUrl}
          alt={`Foto de ${sender?.name || 'usuario'}`}
          onError={() => setPhotoError(true)}
        />
      ) : (
        <span className="sidebar-avatar ico ico-user4" aria-label="Usuario sin foto"></span>
      )}
      <div className="sidebar-conversation-text">
        <strong>{sender?.name || 'Usuario desconocido'}</strong>
        <span>{message.content || 'Sin contenido'}</span>
      </div>
      {message.unreadCount > 1 && (
        <span className="sidebar-conversation-count" aria-label={`${message.unreadCount} mensajes no leídos`}>
          {message.unreadCount}
        </span>
      )}
    </li>
  );
}

const groupMessagesBySender = (messages) => {
  const groupedMessages = new Map();

  messages.forEach((message) => {
    const senderId = message.sender?.id ?? message.senderUserId;
    const current = groupedMessages.get(senderId);

    if (!current) {
      groupedMessages.set(senderId, { ...message, unreadCount: 1 });
      return;
    }

    const isNewer = new Date(message.createdAt).getTime() > new Date(current.createdAt).getTime();
    groupedMessages.set(senderId, {
      ...(isNewer ? message : current),
      unreadCount: current.unreadCount + 1,
    });
  });

  return Array.from(groupedMessages.values());
};

function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { session, closeSession } = useAuth();
  const { socket } = useSocket();
  const [openGroups, setOpenGroups] = useState({});
  const [photoError, setPhotoError] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadConversations, setUnreadConversations] = useState([]);
  const [isConversationsOpen, setIsConversationsOpen] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const messagesButtonRef = useRef(null);
  const conversationsPanelRef = useRef(null);
  const messagesTooltipRef = useRef(null);
  const photoUrl = session?.user?.url_photo
    ? `http://localhost:3000/images/${session.user.url_photo.replace(/^\/+/, '')}`
    : null;

  useEffect(() => {
    let isMounted = true;
    const userId = session?.user?.id;

    if (!userId) {
      setUnreadMessages(0);
      return () => {
        isMounted = false;
      };
    }

    const loadUnreadMessages = async () => {
      try {
        const response = await countUnreadByRecipientUserId(userId);
        const count = typeof response === 'number'
          ? response
          : response?.count ?? response?.total ?? 0;

        if (isMounted) setUnreadMessages(Number(count) || 0);
      } catch {
        if (isMounted) setUnreadMessages(0);
      }
    };

    loadUnreadMessages();
    const unreadMessagesInterval = window.setInterval(loadUnreadMessages, 60_000);

    return () => {
      isMounted = false;
      window.clearInterval(unreadMessagesInterval);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!socket || !userId) return undefined;

    const updateUnreadMessages = (message) => {
      const recipientUserId = message?.recipientUserId ?? message?.recipient?.id;
      if (String(recipientUserId) !== String(userId)) return;

      setUnreadMessages((currentCount) => currentCount + 1);
    };

    socket.on('newMessage', updateUnreadMessages);
    return () => socket.off('newMessage', updateUnreadMessages);
  }, [socket, session?.user?.id]);

  useEffect(() => {
    if (!messagesButtonRef.current) return undefined;

    messagesTooltipRef.current = new Tooltip(messagesButtonRef.current);

    return () => {
      messagesTooltipRef.current?.dispose();
      messagesTooltipRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isConversationsOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      const clickedButton = messagesButtonRef.current?.contains(event.target);
      const clickedPanel = conversationsPanelRef.current?.contains(event.target);
      if (!clickedButton && !clickedPanel) setIsConversationsOpen(false);
    };

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsConversationsOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isConversationsOpen]);

  const closeSidebar = () => {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) sidebarToggle.checked = false;
  };

  const toggleGroup = (groupId, isOpen) => {
    setOpenGroups((groups) => ({ ...groups, [groupId]: !isOpen }));
  };

  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    closeSession();
    navigate('/login', { replace: true });
  };

  const toggleConversations = async (event) => {
    messagesTooltipRef.current?.hide();
    event.currentTarget.blur();
    const shouldOpen = !isConversationsOpen;
    setIsConversationsOpen(shouldOpen);

    if (!shouldOpen || !session?.user?.id) return;

    setIsLoadingConversations(true);
    try {
      const response = await findUnreadByUserId(session.user.id);
      const messages = Array.isArray(response)
        ? response
        : response?.messages ?? response?.data ?? [];
      setUnreadConversations(Array.isArray(messages) ? groupMessagesBySender(messages) : []);
    } catch {
      setUnreadConversations([]);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const openConversation = (message) => {
    const selectedUserId = message.sender?.id ?? message.senderUserId;
    if (selectedUserId == null) return;

    setIsConversationsOpen(false);
    closeSidebar();
    navigate('/chats', { state: { selectedUserId } });
  };

  return (
    <>
      <input className="sidebar-toggle" id="sidebar-toggle" type="checkbox" />

      <label className="sidebar-open" htmlFor="sidebar-toggle" aria-label="Abrir menú">
        <span />
        <span />
        <span />
      </label>

      <label className="sidebar-overlay" htmlFor="sidebar-toggle" aria-label="Cerrar menú" />

      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo-wrap">
            <img className="sidebar-logo" src={toroLogo} alt="Toro" />
          </div>
          <div>
            <strong>TORO</strong>
            <span>Laboratorio clínico</span>
          </div>
        </div>

        <div className="sidebar-section-title">MENÚ PRINCIPAL</div>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          {menuItems.map((item) => {
            if (!item.children) {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={closeSidebar}
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                >
                  <span className={`ico ${item.icon}`} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );
            }

            const hasActiveChild = item.children.some((child) => pathname === child.to);
            const isOpen = openGroups[item.id] ?? hasActiveChild;

            return (
              <div className={`sidebar-group${isOpen ? ' open' : ''}`} key={item.id}>
                <button
                  type="button"
                  className={`sidebar-link sidebar-group-toggle${hasActiveChild ? ' active' : ''}`}
                  onClick={() => toggleGroup(item.id, isOpen)}
                  aria-expanded={isOpen}
                  aria-controls={`sidebar-group-${item.id}`}
                >
                  <span className={`ico ${item.icon}`} aria-hidden="true" />
                  <span>{item.label}</span>
                  <span className="sidebar-arrow" aria-hidden="true">›</span>
                </button>

                <div className="sidebar-submenu" id={`sidebar-group-${item.id}`}>
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      onClick={closeSidebar}
                      className={({ isActive }) => `sidebar-sublink${isActive ? ' active' : ''}`}
                    >
                      <span className="sidebar-submenu-dot" aria-hidden="true" />
                      <span>{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-profile">
          <button
            type="button"
            className="sidebar-messages-button"
            aria-label={`${unreadMessages} mensajes no leídos`}
            data-bs-toggle="tooltip"
            data-bs-placement="right"
            title="Conversaciones"
            ref={messagesButtonRef}
            aria-expanded={isConversationsOpen}
            aria-controls="sidebar-conversations"
            onClick={toggleConversations}
          >
            <span className="ico ico-comment-stroke" aria-hidden="true"></span>
            <span className="sidebar-messages-count">{unreadMessages}</span>
          </button>
          {photoUrl && !photoError ? (
            <img
              className="sidebar-avatar"
              src={photoUrl}
              alt="Foto de perfil"
              onError={() => setPhotoError(true)}
            />
          ) : (
            <span className="ico ico-user4" aria-label="Usuario sin foto"></span>
          )}
          <div className="sidebar-profile-text">
            <strong>{session?.user?.name || 'Usuario Toro'}</strong>
            <span>{session?.user?.position || 'Sin cargo'}</span>
          </div>
          <div className="dropdown dropup sidebar-profile-dropdown">
            <button
              type="button"
              className="sidebar-more"
              onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
              aria-label="Abrir menú de usuario"
            >
              •••
            </button>
            <ul
              className={`dropdown-menu dropdown-menu-end sidebar-profile-menu${isProfileMenuOpen ? ' show' : ''}`}
              role="menu"
            >
              <li>
                <button className="dropdown-item" type="button">
                  Mi perfil
                </button>
              </li>
              <li>
                <button className="dropdown-item" type="button" onClick={() => navigate('/chats')}>
                  Conversación
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button className="dropdown-item" type="button" onClick={handleLogout}>
                  Cerrar sesión
                </button>
              </li>
            </ul>
          </div>
        </div>

        {isConversationsOpen && (
          <section
            className="sidebar-conversations-panel"
            id="sidebar-conversations"
            aria-label="Conversaciones no leídas"
            ref={conversationsPanelRef}
          >
            <strong className="sidebar-conversations-title">Conversaciones</strong>
            {isLoadingConversations ? (
              <p className="sidebar-conversations-status ps-4">Cargando...</p>
            ) : unreadConversations.length > 0 ? (
              <ul className="sidebar-conversations-list">
                {unreadConversations.map((message) => (
                  <UnreadConversation key={message.id} message={message} onSelect={openConversation} />
                ))}
              </ul>
            ) : (
              <p className="sidebar-conversations-status ps-4">No hay conversaciones sin leer.</p>
            )}
          </section>
        )}
      </aside>
    </>
  );
}

export default Sidebar;
