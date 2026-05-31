import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationAPI } from '../api/services';
import { unwrapApiList } from '../utils/apiResponse';
import AppLayout from '../components/layout/AppLayout';

const TYPE_ICONS = {
  COVENTURE_APPLICATION_RECEIVED:      '📋',
  COVENTURE_APPLICATION_STATUS_CHANGED:'📣',
  DOMAIN_SOLD:                         '◇',
  SOFTWARE_PURCHASED:                  '⟁',
  SOFTWARE_MARKED_COMPLETE:            '✓',
  PROFILE_VIEWED:                      '👁',
  NEW_LISTING_IN_INDUSTRY:             '🆕',
  LISTING_LIKED:                       '❤️',
  DOMAIN_VERIFIED:                     '✓',
  TECHNOLOGY_VERIFIED:                 '✓',
};

const TYPE_COLORS = {
  COVENTURE_APPLICATION_RECEIVED:      '#c8a96e',
  COVENTURE_APPLICATION_STATUS_CHANGED:'#6ec896',
  DOMAIN_SOLD:                         '#6ec896',
  SOFTWARE_PURCHASED:                  '#6ec896',
  SOFTWARE_MARKED_COMPLETE:            '#6ec896',
  PROFILE_VIEWED:                      '#a06ec8',
  NEW_LISTING_IN_INDUSTRY:             '#6eadc8',
  LISTING_LIKED:                       '#c86e6e',
  DOMAIN_VERIFIED:                     '#6ec896',
  TECHNOLOGY_VERIFIED:                 '#6ec896',
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState('all');

  useEffect(() => {
    notificationAPI.getAll()
      .then((response) => setNotifications(unwrapApiList(response)))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  const handleMarkAllRead = async () => {
    await notificationAPI.markAllRead();
    setNotifications(n => n.map(x => ({ ...x, read: true })));
  };

  const handleClick = async (n) => {
    if (!n.read) {
      await notificationAPI.markOneRead(n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
    if (n.link) navigate(n.link);
  };

  const unread = notifications.filter(n => !n.read);
  const filtered = filter === 'unread' ? unread : notifications;

  return (
    <AppLayout>
      <div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-900 m-0">Notifications</h1>
            <p className="text-gray-600 mt-1">{unread.length} unread notification{unread.length !== 1 ? 's' : ''}</p>
          </div>
          {unread.length > 0 && (
            <button className="btn-glow btn-glow-sm" onClick={handleMarkAllRead}>
              ✓ Mark all as read
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-6">
          <button className={`btn-glow btn-glow-sm ${filter === 'all' ? 'bg-gray-900 text-white border-gray-900' : ''}`} onClick={() => setFilter('all')}>
            All ({notifications.length})
          </button>
          <button className={`btn-glow btn-glow-sm ${filter === 'unread' ? 'bg-gray-900 text-white border-gray-900' : ''}`} onClick={() => setFilter('unread')}>
            Unread ({unread.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔔</div>
            <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">{filter === 'unread' ? 'All caught up!' : 'No notifications yet'}</h3>
            <p className="text-gray-600">{filter === 'unread' ? 'No unread notifications.' : 'Activity will show up here.'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(n => {
              const color = TYPE_COLORS[n.type] || '#c8a96e';
              return (
                <div key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex items-start gap-4 p-4 rounded-[10px] border transition-all duration-150 ${
                    n.read
                      ? 'bg-white border-gray-200'
                      : 'bg-blue-50/80 border-blue-200'
                  } ${n.link ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}`}>

                  {/* Icon */}
                  <div className="w-[38px] h-[38px] rounded-[10px] flex-shrink-0 flex items-center justify-center text-lg"
                    style={{
                      background: `${color}18`,
                      border: `1px solid ${color}33`
                    }}>
                    {TYPE_ICONS[n.type] || '🔔'}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 flex-wrap">
                      <span className={`text-sm ${n.read ? 'font-medium text-gray-600' : 'font-bold text-gray-900'}`}>
                        {n.title || n.message}
                      </span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    {n.title && n.message && n.message !== n.title && (
                    <p className={`mt-1 text-xs leading-relaxed ${n.read ? 'text-gray-500' : 'text-gray-600'}`}>
                      {n.message}
                    </p>
                    )}
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: color }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}