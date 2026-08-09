import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import useAuth from '../context/useAuth';
import { useSocket } from '../context/SocketContext';
import { findByUsersAndDays, updateMessage } from '../services/messagesServices';
import { getVisibleUsersWithUnreadMessageCount } from '../services/userService';

const HISTORY_DAYS = 30;

const asArray = (response, keys) => {
  if (Array.isArray(response)) return response;
  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
    if (Array.isArray(response?.data?.[key])) return response.data[key];
  }
  return Array.isArray(response?.data) ? response.data : [];
};

const userIdOf = (user) => user?.id ?? user?.userId;

const sameId = (left, right) => String(left) === String(right);

const messageDate = (message) => message?.createdAt ?? message?.sentAt ?? message?.date;

const formatListDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const isToday = date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
  const time = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date).toLowerCase();

  if (isToday) return time;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${date.getFullYear()} ${time}`;
};

const formatMessageTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
};

const dateKey = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const formatConversationDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (dateKey(date) === dateKey(now)) return 'HOY';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${date.getFullYear()}`;
};

const photoUrl = (user) => user?.url_photo
  ? `http://localhost:3000/images/${user.url_photo.replace(/^\/+/, '')}`
  : null;

function Avatar({ user, className = '' }) {
  const [hasError, setHasError] = useState(false);
  const source = photoUrl(user);

  if (source && !hasError) {
    return <img className={`chat-avatar ${className}`} src={source} alt={`Foto de ${user?.name || 'usuario'}`} onError={() => setHasError(true)} />;
  }

  return <span className={`chat-avatar chat-avatar-placeholder ico ico-user4 ${className}`} aria-hidden="true" />;
}

function Chats() {
  const location = useLocation();
  const { session } = useAuth();
  const { socket, connected } = useSocket();
  const sessionUser = session?.user;
  const sessionUserId = sessionUser?.id;
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [newMessagesMarkerId, setNewMessagesMarkerId] = useState(null);
  const messagesEndRef = useRef(null);
  const consumedNavigationRef = useRef(null);

  const selectedUserId = userIdOf(selectedUser);

  useEffect(() => {
    if (!sessionUserId) return undefined;
    let active = true;

    const loadUsers = async () => {
      setLoadingUsers(true);
      setError('');
      try {
        const response = await getVisibleUsersWithUnreadMessageCount(sessionUserId);
        if (active) setUsers(asArray(response, ['users', 'items', 'results']));
      } catch {
        if (active) setError('No fue posible cargar las conversaciones.');
      } finally {
        if (active) setLoadingUsers(false);
      }
    };

    loadUsers();
    return () => { active = false; };
  }, [sessionUserId]);

  useEffect(() => {
    const requestedUserId = location.state?.selectedUserId;
    if (requestedUserId == null || loadingUsers || consumedNavigationRef.current === location.key) return;

    const requestedUser = users.find((user) => sameId(userIdOf(user), requestedUserId));
    if (requestedUser) setSelectedUser(requestedUser);
    consumedNavigationRef.current = location.key;
  }, [location.key, location.state, loadingUsers, users]);

  useEffect(() => {
    if (!selectedUserId || !sessionUserId) {
      setMessages([]);
      setNewMessagesMarkerId(null);
      return undefined;
    }
    let active = true;

    const loadMessages = async () => {
      setLoadingMessages(true);
      setError('');
      setNewMessagesMarkerId(null);
      try {
        const response = await findByUsersAndDays(sessionUserId, selectedUserId, HISTORY_DAYS);
        const history = asArray(response, ['messages', 'items', 'results']);
        const unreadMessages = history.filter((message) => {
          const recipientUserId = message.recipientUserId ?? message.recipient?.id;
          return Number(message.isRead) === 0
            && message.id != null
            && sameId(recipientUserId, sessionUserId);
        });
        const readAt = new Date().toISOString();

        const readUpdates = await Promise.allSettled(
          unreadMessages.map((message) => updateMessage(message.id, { isRead: 1, readAt })),
        );
        const updatedMessageIds = new Set(
          unreadMessages
            .filter((_, index) => readUpdates[index].status === 'fulfilled')
            .map((message) => message.id),
        );
        const updatedHistory = history.map((message) => (
          updatedMessageIds.has(message.id) ? { ...message, isRead: 1, readAt } : message
        ));

        if (active) {
          setMessages([...updatedHistory].sort((a, b) => new Date(messageDate(a)) - new Date(messageDate(b))));
          setUsers((current) => current.map((user) => (
            sameId(userIdOf(user), selectedUserId) ? { ...user, messageCount: 0 } : user
          )));
        }
      } catch {
        if (active) setError('No fue posible cargar el historial de mensajes.');
      } finally {
        if (active) setLoadingMessages(false);
      }
    };

    loadMessages();
    return () => { active = false; };
  }, [selectedUserId, sessionUserId]);

  useEffect(() => {
    if (!socket || !sessionUserId) return undefined;

    const receiveMessage = async (message) => {
      const senderId = message?.senderUserId ?? message?.sender?.id;
      const recipientId = message?.recipientUserId ?? message?.recipient?.id;
      const belongsToSelectedChat = selectedUserId && (
        (sameId(senderId, sessionUserId) && sameId(recipientId, selectedUserId))
        || (sameId(senderId, selectedUserId) && sameId(recipientId, sessionUserId))
      );
      const incomingForSession = sameId(senderId, selectedUserId)
        && sameId(recipientId, sessionUserId);

      if (belongsToSelectedChat) {
        const markerId = message.id ?? `received-${Date.now()}`;
        const receivedMessage = incomingForSession
          ? { ...message, _chatMarkerId: markerId }
          : message;
        if (incomingForSession) setNewMessagesMarkerId(markerId);
        setMessages((current) => current.some((item) => item.id != null && sameId(item.id, message.id))
          ? current
          : [...current, receivedMessage]);

        if (incomingForSession && message.id != null && Number(message.isRead) === 0) {
          const readAt = new Date().toISOString();
          try {
            await updateMessage(message.id, { isRead: 1, readAt });
            setMessages((current) => current.map((item) => (
              sameId(item.id, message.id) ? { ...item, isRead: 1, readAt } : item
            )));
          } catch {
            // El mensaje permanece visible aunque no sea posible confirmar su lectura.
          }
        }
      }

      setUsers((current) => current.map((user) => {
        if (!sameId(userIdOf(user), senderId)) return user;
        return {
          ...user,
          lastMessageAt: messageDate(message),
          messageCount: belongsToSelectedChat ? 0 : Number(user.messageCount || 0) + 1,
        };
      }));
    };

    socket.on('newMessage', receiveMessage);
    return () => socket.off('newMessage', receiveMessage);
  }, [socket, sessionUserId, selectedUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingMessages]);

  const sortedUsers = useMemo(() => [...users].sort((a, b) => {
    const right = new Date(b.lastMessageAt || 0).getTime();
    const left = new Date(a.lastMessageAt || 0).getTime();
    return right - left;
  }), [users]);

  const sendMessage = (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !socket || !selectedUserId || !sessionUserId) return;

    const outgoingMessage = {
      senderUserId: sessionUserId,
      recipientUserId: selectedUserId,
      content,
    };
    setNewMessagesMarkerId(null);
    socket.emit('sendMessage', outgoingMessage);
    setMessages((current) => [...current, {
      ...outgoingMessage,
      id: `pending-${Date.now()}`,
      createdAt: new Date().toISOString(),
      pending: true,
    }]);
    setDraft('');
  };

  return (
    <section className="chats-page" aria-label="Conversaciones">
      <aside className="chats-list-panel">
        <header className="chats-panel-header">
          <span className="ico ico-comment-stroke" aria-hidden="true" />
          <div><strong>Chats</strong><span>{users.length} contactos</span></div>
        </header>

        <div className="chats-user-list" role="list">
          {loadingUsers && <p className="chats-state">Cargando contactos...</p>}
          {!loadingUsers && error && users.length === 0 && <p className="chats-state chats-error">{error}</p>}
          {!loadingUsers && !error && users.length === 0 && <p className="chats-state">No hay contactos visibles.</p>}
          {sortedUsers.map((user) => {
            const id = userIdOf(user);
            const isSelected = sameId(id, selectedUserId);
            const messageCount = Number(user.messageCount || 0);
            return (
              <button
                type="button"
                className={`chats-user-item${isSelected ? ' card-primary' : ''}`}
                key={id}
                onClick={() => setSelectedUser(user)}
                role="listitem"
                aria-pressed={isSelected}
              >
                <Avatar user={user} />
                <span className="chats-user-copy">
                  <strong>{user.name || user.user_name || 'Usuario'}</strong>
                  <span>{user.position || 'Sin cargo'}</span>
                </span>
                <span className="chats-user-meta">
                  <time dateTime={user.lastMessageAt || undefined}>{formatListDate(user.lastMessageAt)}</time>
                  {messageCount > 0 && <span className="chats-unread-count">{messageCount}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="chat-conversation-panel">
        {selectedUser ? (
          <>
            <header className="chat-conversation-header">
              <Avatar user={selectedUser} className="chat-avatar-small" />
              <div><span>Conversación con</span><strong>{selectedUser.name || selectedUser.user_name || 'Usuario'}</strong></div>
              <span className={`chat-connection${connected ? ' connected' : ''}`}>{connected ? 'En línea' : 'Sin conexión'}</span>
            </header>

            <div className="chat-messages" aria-live="polite">
              {loadingMessages && <p className="chats-state">Cargando conversación...</p>}
              {!loadingMessages && messages.length === 0 && <p className="chats-state">Aún no hay mensajes en esta conversación.</p>}
              {messages.map((message, index) => {
                const own = sameId(message.senderUserId ?? message.sender?.id, sessionUserId);
                const createdAt = messageDate(message);
                const previousCreatedAt = index > 0 ? messageDate(messages[index - 1]) : null;
                const showDateSeparator = dateKey(createdAt) !== dateKey(previousCreatedAt);
                const showNewMessagesMarker = newMessagesMarkerId != null
                  && sameId(message._chatMarkerId ?? message.id, newMessagesMarkerId);
                return (
                  <div className="chat-message-entry" key={message.id ?? `${createdAt}-${index}`}>
                    {showDateSeparator && (
                      <div className="chat-date-separator">
                        <time dateTime={createdAt || undefined}>{formatConversationDate(createdAt)}</time>
                      </div>
                    )}
                    {showNewMessagesMarker && (
                      <div className="chat-new-messages-separator" role="separator">
                        <span>Nuevo mensajes</span>
                      </div>
                    )}
                    <div className={`chat-message-row ${own ? 'own' : 'received'}`}>
                      {!own && <Avatar user={selectedUser} className="chat-avatar-small" />}
                      <div>
                        <div className={`chat-message-bubble${message.pending ? ' pending' : ''}`}>{message.content}</div>
                        <time dateTime={createdAt || undefined}>{formatMessageTime(createdAt)}</time>
                      </div>
                      {own && <Avatar user={sessionUser} className="chat-avatar-small" />}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-composer" onSubmit={sendMessage}>
              <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escribe un mensaje..." aria-label="Mensaje" />
              <button type="submit" disabled={!draft.trim() || !connected}>Enviar</button>
            </form>
          </>
        ) : (
          <div className="chat-empty-state">
            <span className="ico ico-comment-stroke" aria-hidden="true" />
            <strong>Selecciona una conversación</strong>
            <p>Elige un contacto de la lista para ver sus mensajes.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default Chats;
