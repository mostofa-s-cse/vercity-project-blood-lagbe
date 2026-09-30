import React from 'react';
import { DonorNotification, ScreenId } from '../types/blood';
import { sound } from '../utils/audio';
import { useLanguage } from '../context/LanguageContext';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: DonorNotification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onNavigate: (screen: ScreenId) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onClearAll,
  onNavigate
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">notifications_active</span>
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {t.notifications.title}
              </h3>
              <p className="text-[11px] text-slate-500">
                {t.notifications.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playTap();
                onClearAll();
              }}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              {t.notifications.clearAll}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">notifications_off</span>
              <p className="text-xs font-semibold">
                {t.notifications.empty}
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isUrgent = notif.type === 'urgent_request';
              return (
                <div
                  key={notif.id}
                  onClick={() => onMarkAsRead(notif.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    !notif.read
                      ? isUrgent
                        ? 'bg-red-50/70 border-red-200'
                        : 'bg-blue-50/70 border-blue-200'
                      : 'bg-slate-50/60 border-slate-200/80 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-extrabold text-xs text-slate-900 leading-snug">
                      {notif.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {notif.timestamp}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    {notif.message}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                    {notif.bloodGroup && (
                      <span className="px-2 py-0.5 rounded-md bg-red-600 text-white font-black text-[10px]">
                        {t.notifications.bloodNeeded(notif.bloodGroup)}
                      </span>
                    )}

                    <div className="flex items-center gap-2 ml-auto">
                      {isUrgent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sound.playEmergencyChime();
                            onClose();
                            onNavigate('request-tracking');
                          }}
                          className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] shadow-xs cursor-pointer"
                        >
                          {t.notifications.respondNow}
                        </button>
                      )}
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-red-600" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1 font-semibold text-[11px]">
            <span className="material-symbols-outlined text-sm text-emerald-600">sms</span>
            {t.notifications.smsGatewayLive}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl cursor-pointer"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
