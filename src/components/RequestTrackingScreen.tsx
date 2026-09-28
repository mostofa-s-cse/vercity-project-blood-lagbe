import React, { useState } from 'react';
import { ScreenId, BloodRequest, RequestStatus } from '../types/blood';
import { INITIAL_BLOOD_REQUESTS } from '../data/mockData';
import { sound } from '../utils/audio';
import { useLanguage } from '../context/LanguageContext';

interface RequestTrackingScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onOpenRequisition: (demand: any) => void;
  onOpenOtpModal?: (mission: any) => void;
}

export const RequestTrackingScreen: React.FC<RequestTrackingScreenProps> = ({
  onNavigate,
  onOpenRequisition,
  onOpenOtpModal
}) => {
  const { language } = useLanguage();
  const [requests, setRequests] = useState<BloodRequest[]>(INITIAL_BLOOD_REQUESTS);
  const [activeStatusTab, setActiveStatusTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReq, setSelectedReq] = useState<BloodRequest | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleUpdateStatus = (id: string, newStatus: RequestStatus) => {
    sound.playTap();
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    showToast(
      language === 'bn'
        ? `রিকোয়েস্ট #${id} এর অবস্থা '${newStatus}' হিসেবে আপডেট হয়েছে।`
        : `Request #${id} status changed to ${newStatus.toUpperCase()}.`
    );
  };

  const filteredRequests = requests.filter(r => {
    const matchesSearch = 
      r.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.hospital.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = activeStatusTab === 'ALL' || r.status === activeStatusTab;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-emerald-400 text-xl">near_me</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2 cursor-pointer">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 bottom-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">
                {language === 'bn' ? 'রিকোয়েস্ট ট্র্যাকিং ড্যাশবোর্ড' : 'REQUEST TRACKING & LIFECYCLE'}
              </span>
              <span className="text-xs text-slate-300 flex items-center gap-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                {language === 'bn' ? '৪-ধাপের রিয়েল-টাইম ট্র্যাকিং' : '4-Stage Live Tracking'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-3xl">track_changes</span>
              <span>{language === 'bn' ? 'রক্তের রিকোয়েস্ট স্ট্যাটাস ও ট্র্যাকিং' : 'Blood Request Status & Tracking'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {language === 'bn'
                ? 'রক্তের প্রতিটি আবেদন ৪টি নির্দিষ্ট ধাপে ট্র্যাক করা যায়: অপেক্ষারত (Pending) ➜ ডোনার পাওয়া গেছে (Donor Found) ➜ সম্পন্ন (Completed) ➜ বাতিল (Cancelled)।'
                : 'Monitor patient requisitions across 4 standardized proposal stages: Pending, Donor Found, Donation Completed, and Cancelled.'}
            </p>
          </div>

          <button
            onClick={() => onNavigate('create-sos')}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-2 cursor-pointer transition-all self-start md:self-auto hover:scale-105"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span>{language === 'bn' ? 'নতুন রিকোয়েস্ট পোস্ট' : 'Post Blood Request'}</span>
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="mt-6 pt-5 border-t border-slate-700/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'ALL', label: language === 'bn' ? 'সকল রিকোয়েস্ট' : 'All Requests', count: requests.length },
            { id: 'pending', label: language === 'bn' ? '⏳ অপেক্ষারত (Pending)' : '⏳ Pending', count: requests.filter(r => r.status === 'pending').length },
            { id: 'donor_found', label: language === 'bn' ? '🤝 ডোনার পাওয়া গেছে (Donor Found)' : '🤝 Donor Found', count: requests.filter(r => r.status === 'donor_found').length },
            { id: 'completed', label: language === 'bn' ? '✅ সম্পন্ন (Completed)' : '✅ Completed', count: requests.filter(r => r.status === 'completed').length },
            { id: 'cancelled', label: language === 'bn' ? '❌ বাতিল (Cancelled)' : '❌ Cancelled', count: requests.filter(r => r.status === 'cancelled').length },
          ].map((tab) => {
            const isActive = activeStatusTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveStatusTab(tab.id);
                  sound.playTap();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isActive ? 'bg-white text-red-600' : 'bg-slate-800 text-slate-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <span className="material-symbols-outlined text-slate-400 text-xl pl-2">search</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={language === 'bn' ? 'রোগীর নাম, হাসপাতাল বা রিকোয়েস্ট আইডি দিয়ে খুঁজুন...' : 'Search by patient name, hospital, or request token...'}
          className="flex-1 text-xs font-medium outline-none bg-transparent"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 pr-2">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>

      {/* Requests Timeline Cards */}
      <div className="grid grid-cols-1 gap-5">
        {filteredRequests.map((req) => {
          return (
            <div 
              key={req.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col gap-5"
            >
              {/* Top Row: Patient, Blood, Urgency & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-600 text-white flex flex-col items-center justify-center font-black shadow-md shadow-red-600/25 shrink-0">
                    <span className="text-lg leading-none">{req.bloodGroup}</span>
                    <span className="text-[10px] text-red-100 font-bold mt-0.5">{req.bagsRequired} {language === 'bn' ? 'ব্যাগ' : 'Bags'}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-extrabold text-slate-500">{req.id}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-500 font-medium">{req.createdAt}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800">
                        {req.urgencyLabel}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900">{req.patientName}</h3>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">{req.condition}</p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="shrink-0 flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    req.status === 'pending' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                    req.status === 'donor_found' ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                    req.status === 'completed' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                    'bg-slate-200 text-slate-800 border border-slate-300'
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-current" />
                    <span>
                      {req.status === 'pending' ? (language === 'bn' ? 'অপেক্ষারত (Pending)' : 'Pending') :
                       req.status === 'donor_found' ? (language === 'bn' ? 'ডোনার পাওয়া গেছে (Donor Found)' : 'Donor Found') :
                       req.status === 'completed' ? (language === 'bn' ? 'রক্তদান সম্পন্ন (Completed)' : 'Completed') :
                       (language === 'bn' ? 'বাতিলকৃত (Cancelled)' : 'Cancelled')}
                    </span>
                  </span>
                </div>
              </div>

              {/* Four-Stage Linear Progress Indicator */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between text-xs font-extrabold mb-2">
                  <span className={req.status === 'pending' || req.status === 'donor_found' || req.status === 'completed' ? 'text-red-600' : 'text-slate-400'}>
                    ১. রিকোয়েস্ট জারি
                  </span>
                  <span className={req.status === 'donor_found' || req.status === 'completed' ? 'text-blue-600' : 'text-slate-400'}>
                    ২. ডোনার ম্যাচিং
                  </span>
                  <span className={req.status === 'completed' ? 'text-emerald-600' : 'text-slate-400'}>
                    ৩. ওটিপি নিশ্চিতকরণ
                  </span>
                  <span className={req.status === 'completed' ? 'text-emerald-700' : 'text-slate-400'}>
                    ৪. রক্তদান সফল
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      req.status === 'cancelled' ? 'bg-slate-400 w-full' :
                      req.status === 'pending' ? 'bg-amber-500 w-1/4' :
                      req.status === 'donor_found' ? 'bg-blue-600 w-3/4' :
                      'bg-emerald-500 w-full'
                    }`}
                  />
                </div>
              </div>

              {/* Hospital & Attendant Dossier */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-base">local_hospital</span>
                    <span className="font-bold text-slate-900">{req.hospital}</span>
                  </div>
                  <div className="text-slate-500 pl-6">
                    {req.wardBed} • {req.locationDetails}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-base">person</span>
                      <span>{language === 'bn' ? 'রোগীর স্বজন:' : 'Attendant:'} <strong>{req.attendantName}</strong></span>
                    </div>
                    <a
                      href={`tel:${req.attendantPhone}`}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-xs">call</span>
                      <span>{req.attendantPhone}</span>
                    </a>
                  </div>
                  {req.doctorName && (
                    <div className="text-slate-500 pl-6 text-[11px]">
                      {language === 'bn' ? 'চিকিৎসক:' : 'Doctor:'} {req.doctorName} ({req.bmdcReg})
                    </div>
                  )}
                </div>
              </div>

              {/* Assigned Donors Section if Donor Found */}
              {req.assignedDonors && req.assignedDonors.length > 0 && (
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200">
                  <h4 className="text-xs font-black uppercase text-blue-900 tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">sports_motorsports</span>
                    <span>{language === 'bn' ? 'নিযুক্ত রক্তদাতা (সরাসরি হাসপাতালে আসছেন):' : 'Assigned Donor (En Route to Hospital):'}</span>
                  </h4>
                  <div className="space-y-2">
                    {req.assignedDonors.map(donor => (
                      <div key={donor.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-blue-200/80">
                        <div>
                          <span className="font-extrabold text-slate-900 text-xs block">{donor.name}</span>
                          <span className="text-[11px] text-blue-700 font-semibold">{donor.status}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                            ETA: ~{donor.etaMinutes} min
                          </span>
                          <a
                            href={`tel:${donor.phone}`}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs"
                          >
                            <span className="material-symbols-outlined text-xs">call</span>
                            <span>{donor.phone}</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons Bar */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenRequisition(req)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">prescriptions</span>
                    <span>{language === 'bn' ? 'ডাক্তারের স্লিপ' : 'Doctor Slip'}</span>
                  </button>

                  <button
                    onClick={() => {
                      sound.playTap();
                      showToast(language === 'bn' ? 'রিকোয়েস্টের লিংক কপি করা হয়েছে।' : 'Request link copied to clipboard.');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">share</span>
                    <span>{language === 'bn' ? 'শেয়ার' : 'Share'}</span>
                  </button>
                </div>

                {/* State Transition Actions */}
                <div className="flex items-center gap-2">
                  {req.status === 'pending' && (
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'donor_found')}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                    >
                      {language === 'bn' ? 'ডোনার গ্রহণ করুন' : 'Accept Donor'}
                    </button>
                  )}

                  {req.status === 'donor_found' && (
                    <button
                      onClick={() => {
                        sound.playSuccessTone();
                        handleUpdateStatus(req.id, 'completed');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">verified</span>
                      <span>{language === 'bn' ? 'রক্তদান সম্পন্ন নিশ্চিত করুন' : 'Confirm Handshake Completed'}</span>
                    </button>
                  )}

                  {req.status !== 'cancelled' && req.status !== 'completed' && (
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'cancelled')}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-rose-700 text-xs font-bold cursor-pointer transition-all"
                    >
                      {language === 'bn' ? 'রিকোয়েস্ট বাতিল' : 'Cancel Request'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
