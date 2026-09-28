import React from 'react';

interface RequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName?: string;
  hospitalName?: string;
  doctorName?: string;
  bloodGroup?: string;
  units?: number;
}

export const RequisitionModal: React.FC<RequisitionModalProps> = ({
  isOpen,
  onClose,
  patientName = 'Nahidul Islam',
  hospitalName = 'Dhaka Medical College Hospital (DMCH) • ICU Bed 14A',
  doctorName = 'Dr. Ashfaqul Alam, MD (Registrar)',
  bloodGroup = 'O+',
  units = 2,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 text-2xl">description</span>
            <div>
              <h3 className="font-bold text-lg text-slate-900 leading-tight">Official Clinical Requisition</h3>
              <p className="text-xs text-slate-500 font-mono">DGHS Blood Safety Protocol v4.2 • Verified Slip</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Paper Clinical Order Simulation */}
        <div className="bg-amber-50/40 border-2 border-dashed border-amber-200/80 rounded-xl p-6 relative overflow-hidden flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-xl shadow-sm">
                +
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH</h4>
                <p className="text-xs text-slate-600">Department of Blood Transfusion & Critical Care</p>
                <p className="text-xs font-semibold text-red-700">{hospitalName}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                URGENT OT ORDER
              </span>
              <p className="text-[11px] text-slate-500 font-mono mt-1">SLIP #BD-DMCH-2025-98321</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/80 p-3 rounded-lg border border-amber-100 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">PATIENT NAME</span>
              <span className="font-bold text-slate-800 text-sm">{patientName}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">BLOOD GROUP</span>
              <span className="font-black text-red-600 text-sm">{bloodGroup}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">REQUIRED UNITS</span>
              <span className="font-bold text-slate-800 text-sm">{units} Bags (PRBC)</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">CROSS-MATCH STATUS</span>
              <span className="font-bold text-emerald-700 text-sm">Pre-Screened OK</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                ✓
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">{doctorName}</span>
                <span className="text-slate-500">BMDC Reg #A-48190 • Biometric Stamped</span>
              </div>
            </div>
            <div className="border border-red-400 rounded px-3 py-1 bg-red-50 text-center transform -rotate-2">
              <span className="text-[10px] text-red-800 font-extrabold block">DGHS VALIDATED</span>
              <span className="text-[9px] text-red-600 font-mono">SEAL 24/7 VERIFIED</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <span className="material-symbols-outlined text-sm">verified_user</span>
            Cryptographically signed and matched with hospital admissions database
          </span>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-sm"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
