import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { sound } from '../utils/audio';
import {
  useCloseRequisitionMutation,
  useDiscardBatchMutation,
  useGetBatchesQuery,
  useGetRequisitionsQuery,
  useIssueRequisitionMutation,
  useReceiveBatchMutation,
} from '../store/api';
import { apiErrorCode } from '../store/errors';
import { BLOOD_GROUPS } from '../lib/validation.ts';

const INPUT = 'w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500';
const LABEL = 'block text-xs font-bold text-slate-700 mb-1';

interface PanelProps {
  hospitalId: string;
  showToast: (message: string) => void;
  /** Stock changed on the server (a batch or requisition moved bags): the screen reloads the counts. */
  onStockChanged: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Receive bags with an expiry date, see the batches still held, discard expired ones. Hospital staff only. */
export function BatchesPanel({ hospitalId, showToast, onStockChanged }: PanelProps) {
  const { t } = useLanguage();
  const { currentData, isError } = useGetBatchesQuery(hospitalId);
  const [receiveBatch, { isLoading: receiving }] = useReceiveBatchMutation();
  const [discardBatch, { isLoading: discarding }] = useDiscardBatchMutation();
  const [group, setGroup] = useState<string>('O+');
  const [units, setUnits] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  if (isError) return null;

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = Number(units);
    if (!Number.isInteger(count) || count < 1 || !expiresAt) return;
    try {
      await receiveBatch({ hospitalId, bloodGroup: group, units: count, expiresAt }).unwrap();
      sound.playSuccessTone();
      showToast(t.hospitals.toastBatchReceived(count, group));
      setUnits('');
      setExpiresAt('');
      onStockChanged();
    } catch {
      showToast(t.hospitals.toastBatchFailed);
    }
  };

  const handleDiscard = async (id: string) => {
    try {
      await discardBatch({ hospitalId, id }).unwrap();
      showToast(t.hospitals.toastBatchDiscarded);
      onStockChanged();
    } catch {
      showToast(t.hospitals.toastBatchFailed);
    }
  };

  const batches = currentData?.batches ?? [];
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col gap-4">
      <div>
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-red-600">inventory</span>
          <span>{t.hospitals.batchesTitle}</span>
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">{t.hospitals.batchesSubtitle}</p>
      </div>

      <form onSubmit={handleReceive} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div>
          <label className={LABEL}>{t.hospitals.batchGroupLabel}</label>
          <select value={group} onChange={(e) => setGroup(e.target.value)} className={INPUT}>
            {BLOOD_GROUPS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>{t.hospitals.batchUnitsLabel}</label>
          <input type="number" min={1} max={9999} required value={units} onChange={(e) => setUnits(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>{t.hospitals.batchExpiryLabel}</label>
          <input type="date" min={today()} required value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={INPUT} />
        </div>
        <button
          type="submit"
          disabled={receiving}
          className="py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer disabled:opacity-60"
        >
          {t.hospitals.batchReceive}
        </button>
      </form>

      {batches.length === 0 ? (
        <p className="text-xs text-slate-500">{t.hospitals.batchesEmpty}</p>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-2xl">
          {batches.map((batch) => {
            const expired = batch.expiresAt < today();
            return (
              <li key={batch.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
                <span className="font-black text-slate-900 w-10">{batch.bloodGroup}</span>
                <span className="font-semibold text-slate-700 flex-1">
                  {batch.units} {t.hospitals.units}
                </span>
                <span className={`px-2 py-0.5 rounded-full font-bold ${expired ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {expired ? t.hospitals.batchExpired : t.hospitals.batchExpiresOn(batch.expiresAt)}
                </span>
                <button
                  onClick={() => handleDiscard(batch.id)}
                  disabled={discarding}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer disabled:opacity-60"
                >
                  {t.hospitals.batchDiscard}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Issue requisitions and close them: fulfilling takes the bags out of stock. Hospital staff only. */
export function RequisitionsPanel({ hospitalId, showToast, onStockChanged }: PanelProps) {
  const { t } = useLanguage();
  const { currentData, isError } = useGetRequisitionsQuery(hospitalId);
  const [issueRequisition, { isLoading: issuing }] = useIssueRequisitionMutation();
  const [closeRequisition, { isLoading: closing }] = useCloseRequisitionMutation();
  const [patientName, setPatientName] = useState('');
  const [bloodGroup, setBloodGroup] = useState<string>('O+');
  const [bags, setBags] = useState('1');
  const [doctorName, setDoctorName] = useState('');
  const [bmdcNumber, setBmdcNumber] = useState('');
  const [ward, setWard] = useState('');

  if (isError) return null;

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await issueRequisition({
        hospitalId,
        patientName: patientName.trim(),
        bloodGroup,
        bags: Number(bags),
        doctorName: doctorName.trim(),
        bmdcNumber: bmdcNumber.trim(),
        ward: ward.trim() || undefined,
      }).unwrap();
      sound.playSuccessTone();
      showToast(t.hospitals.toastReqIssued);
      setPatientName('');
      setBags('1');
      setDoctorName('');
      setBmdcNumber('');
      setWard('');
    } catch {
      showToast(t.hospitals.toastReqFailed);
    }
  };

  const handleClose = async (id: string, status: 'fulfilled' | 'cancelled') => {
    try {
      await closeRequisition({ hospitalId, id, status }).unwrap();
      showToast(status === 'fulfilled' ? t.hospitals.toastReqFulfilled : t.hospitals.toastReqCancelled);
      if (status === 'fulfilled') onStockChanged();
    } catch (error) {
      showToast(apiErrorCode(error) === 'not_enough_stock' ? t.hospitals.toastReqNotEnough : t.hospitals.toastReqFailed);
    }
  };

  const requisitions = currentData?.requisitions ?? [];
  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleIssue} className="p-5 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <h4 className="sm:col-span-3 font-extrabold text-slate-900 text-sm">{t.hospitals.reqFormTitle}</h4>
        <div>
          <label className={LABEL}>{t.hospitals.reqPatientLabel}</label>
          <input required minLength={2} maxLength={80} value={patientName} onChange={(e) => setPatientName(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>{t.hospitals.reqGroupLabel}</label>
          <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className={INPUT}>
            {BLOOD_GROUPS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>{t.hospitals.reqBagsLabel}</label>
          <input type="number" min={1} max={20} required value={bags} onChange={(e) => setBags(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>{t.hospitals.reqDoctorLabel}</label>
          <input required minLength={2} maxLength={80} value={doctorName} onChange={(e) => setDoctorName(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>{t.hospitals.reqBmdcLabel}</label>
          <input required minLength={3} maxLength={20} value={bmdcNumber} onChange={(e) => setBmdcNumber(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>{t.hospitals.reqWardLabel}</label>
          <input maxLength={60} value={ward} onChange={(e) => setWard(e.target.value)} className={INPUT} />
        </div>
        <button
          type="submit"
          disabled={issuing}
          className="sm:col-span-3 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer disabled:opacity-60"
        >
          {t.hospitals.reqIssue}
        </button>
      </form>

      <div>
        <h4 className="font-extrabold text-slate-900 text-sm mb-2">{t.hospitals.reqListTitle}</h4>
        {requisitions.length === 0 ? (
          <p className="text-xs text-slate-500">{t.hospitals.reqEmpty}</p>
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-2xl">
            {requisitions.map((req) => (
              <li key={req.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs">
                <span className="font-black text-slate-900 w-10">{req.bloodGroup}</span>
                <span className="font-semibold text-slate-700 flex-1 min-w-40">
                  {req.patientName} · {req.bags} {t.hospitals.units} · {req.doctorName} ({req.bmdcNumber}){req.ward ? ` · ${req.ward}` : ''}
                </span>
                <span className="px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">{t.hospitals.reqStatus[req.status]}</span>
                {req.status === 'issued' && (
                  <span className="flex gap-1.5">
                    <button
                      onClick={() => handleClose(req.id, 'fulfilled')}
                      disabled={closing}
                      className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer disabled:opacity-60"
                    >
                      {t.hospitals.reqFulfil}
                    </button>
                    <button
                      onClick={() => handleClose(req.id, 'cancelled')}
                      disabled={closing}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer disabled:opacity-60"
                    >
                      {t.hospitals.reqCancel}
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
