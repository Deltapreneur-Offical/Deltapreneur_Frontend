import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { notificationAPI } from '../api/services';
import { unwrapApiList } from '../utils/apiResponse';
import AppLayout from '../components/layout/AppLayout';
import { Trash2, AlertTriangle } from 'lucide-react';

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

function timeAgo(dateStr, t) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return t('meetingsPageJustNow', { defaultValue: 'just now' });
  if (diff < 3600)  return t('meetingsPageMinutesAgo', { count: Math.floor(diff / 60), defaultValue: '{{count}}m ago' });
  if (diff < 86400) return t('meetingsPageHoursAgo', { count: Math.floor(diff / 3600), defaultValue: '{{count}}h ago' });
  return t('meetingsPageDaysAgo', { count: Math.floor(diff / 86400), defaultValue: '{{count}}d ago' });
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState('all');

  // Selection and Delete state
  const [selectedIds, setSelectedIds]     = useState([]);
  const [deleteModal, setDeleteModal]     = useState({ open: false, type: null }); // 'selected' | 'all'
  const [deleting, setDeleting]           = useState(false);
  const [toastMessage, setToastMessage]   = useState('');

  const selectAllCheckboxRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const response = await notificationAPI.getAll();
      setNotifications(unwrapApiList(response));
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4000);
  };

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

  // Selection handlers
  const handleToggleSelectOne = (e, id) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = (e) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      const visibleIds = filtered.map(n => n.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    } else {
      const visibleIdsSet = new Set(filtered.map(n => n.id));
      setSelectedIds(prev => prev.filter(id => !visibleIdsSet.has(id)));
    }
  };

  // Checkbox indeterminate calculation
  const visibleSelectedCount = filtered.filter(n => selectedIds.includes(n.id)).length;
  const isAllVisibleSelected = filtered.length > 0 && visibleSelectedCount === filtered.length;
  const isSomeVisibleSelected = visibleSelectedCount > 0 && !isAllVisibleSelected;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isSomeVisibleSelected;
    }
  }, [isSomeVisibleSelected]);

  // Confirmation dialog actions
  const handleOpenDeleteSelectedModal = () => {
    if (selectedIds.length === 0) return;
    setDeleteModal({ open: true, type: 'selected' });
  };

  const handleOpenDeleteAllModal = () => {
    if (notifications.length === 0) return;
    setDeleteModal({ open: true, type: 'all' });
  };

  const handleCloseDeleteModal = () => {
    setDeleteModal({ open: false, type: null });
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      if (deleteModal.type === 'selected') {
        await notificationAPI.deleteMultiple(selectedIds);
        showToast(t('notificationsDeleteSelectedSuccess', { defaultValue: 'Selected notifications deleted successfully.' }));
      } else if (deleteModal.type === 'all') {
        await notificationAPI.deleteAll();
        showToast(t('notificationsDeleteAllSuccess', { defaultValue: 'All notifications deleted successfully.' }));
      }
      setSelectedIds([]);
      handleCloseDeleteModal();
      await fetchNotifications();
    } catch (err) {
      console.error('Failed to delete notifications:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="relative">
        {/* Success Toast */}
        {toastMessage && (
          <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <span className="text-green-400 font-bold">✓</span>
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-900 m-0">{t('notifications')}</h1>
            <p className="text-gray-600 mt-1">{t('notificationsPageUnread', { count: unread.length })}</p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {unread.length > 0 && (
              <button className="btn-glow btn-glow-sm" onClick={handleMarkAllRead}>
                ✓ {t('markAllRead')}
              </button>
            )}

            <button
              className="px-3.5 py-1.5 rounded-lg border text-sm font-semibold transition-all duration-150 border-red-200 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              disabled={selectedIds.length === 0}
              onClick={handleOpenDeleteSelectedModal}
            >
              <Trash2 size={15} />
              <span>{t('notificationsDeleteSelected', { defaultValue: 'Delete Selected' })}</span>
              {selectedIds.length > 0 && (
                <span className="ml-1 bg-red-200 text-red-800 text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {selectedIds.length}
                </span>
              )}
            </button>

            <button
              className="px-3.5 py-1.5 rounded-lg border text-sm font-semibold transition-all duration-150 border-red-300 text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              disabled={notifications.length === 0}
              onClick={handleOpenDeleteAllModal}
            >
              <Trash2 size={15} />
              <span>{t('notificationsDeleteAll', { defaultValue: 'Delete All' })}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex gap-2">
            <button className={`btn-glow btn-glow-sm ${filter === 'all' ? 'bg-gray-900 text-white border-gray-900' : ''}`} onClick={() => setFilter('all')}>
              {t('notificationsPageFilterAll', { count: notifications.length })}
            </button>
            <button className={`btn-glow btn-glow-sm ${filter === 'unread' ? 'bg-gray-900 text-white border-gray-900' : ''}`} onClick={() => setFilter('unread')}>
              {t('notificationsPageFilterUnread', { count: unread.length })}
            </button>
          </div>

          {filtered.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-gray-700 font-semibold cursor-pointer select-none px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
              <input
                ref={selectAllCheckboxRef}
                type="checkbox"
                checked={isAllVisibleSelected}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
              />
              <span>{t('notificationsSelectAll', { defaultValue: 'Select All' })}</span>
            </label>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-gray-400 border-t-gray-800 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔔</div>
            <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">
              {filter === 'unread' ? t('notificationsPageAllCaughtUp') : t('noNotificationsYet')}
            </h3>
            <p className="text-gray-600">
              {filter === 'unread' ? t('notificationsPageNoUnread') : t('notificationsPageActivityHint')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(n => {
              const color = TYPE_COLORS[n.type] || '#c8a96e';
              const isSelected = selectedIds.includes(n.id);
              return (
                <div key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex items-start gap-3 p-4 rounded-[10px] border transition-all duration-150 ${
                    isSelected
                      ? 'bg-purple-50/90 border-purple-300 ring-1 ring-purple-200'
                      : n.read
                      ? 'bg-white border-gray-200'
                      : 'bg-blue-50/80 border-blue-200'
                  } ${n.link ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}`}>

                  <div className="pt-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleToggleSelectOne(e, n.id)}
                      className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                    />
                  </div>

                  <div className="w-[38px] h-[38px] rounded-[10px] flex-shrink-0 flex items-center justify-center text-lg"
                    style={{
                      background: `${color}18`,
                      border: `1px solid ${color}33`
                    }}>
                    {TYPE_ICONS[n.type] || '🔔'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 flex-wrap">
                      <span className={`text-sm ${n.read ? 'font-medium text-gray-600' : 'font-bold text-gray-900'}`}>
                        {n.title || n.message}
                      </span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {timeAgo(n.createdAt, t)}
                      </span>
                    </div>
                    {n.title && n.message && n.message !== n.title && (
                    <p className={`mt-1 text-xs leading-relaxed ${n.read ? 'text-gray-500' : 'text-gray-600'}`}>
                      {n.message}
                    </p>
                    )}
                  </div>

                  {!n.read && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: color }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Confirmation Modal */}
        {deleteModal.open && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <h3 className="font-bold text-xl text-gray-900 m-0">Delete Notifications</h3>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                Are you sure you want to delete? Once deleted, this action cannot be reverted.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
