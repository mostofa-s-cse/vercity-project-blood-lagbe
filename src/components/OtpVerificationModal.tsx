import React, { useState } from 'react';
import { sound } from '../utils/audio';

interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  expectedOtp?: string;
  donorName?: string;
  patientName?: string;
  onSuccess: () => void;
}

export const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  isOpen,
  onClose,
  expectedOtp = '4921',
  donorName = 'Tanvir Ahmed',
  patientName = 'Nahidul Islam',
  onSuccess
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, val: string) => {
    if (val.length > 1) {
      val = val.slice(-1);
    }
    const newDigits = [...digits];
    newDigits[index] = val;
    setDigits(newDigits);
    setErrorMsg(null);

    // Auto focus next input
    if (val && index < 3) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleVerify = () => {
    const entered = digits.join('');
    if (entered.length < 4) {
      setErrorMsg('Please enter all 4 digits of the handshake code.');
      return;
    }

    if (entered === expectedOtp) {
      sound.playSuccessTone();
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setDigits(['', '', '', '']);
        onSuccess();
        onClose();
      }, 1500);
    } else {
      setErrorMsg(`Incorrect code. For demo, the secret OTP is ${expectedOtp}.`);
    }
  };

  const fillAuto = () => {
    setDigits(expectedOtp.split(''));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-slate-200">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-2xl">verified_user</span>
            <div>
              <h3 className="font-bold text-lg text-slate-900 leading-tight">Recipient Handshake OTP</h3>
              <p className="text-xs text-slate-500">Secure Anti-Broker Closure Token</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl font-bold animate-bounce">
              ✓
            </div>
            <h4 className="font-extrabold text-xl text-slate-900">Handshake Verified!</h4>
            <p className="text-sm text-slate-600 max-w-xs">
              Blood donation officially credited to {donorName}. 1 unit securely received for {patientName}.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-600 leading-relaxed">
              To eliminate financial extortion and black market blood selling, the patient attendant provides their confidential OTP to the volunteer donor upon bedside bag verification.
            </p>

            <div className="bg-slate-50 p-4 rounded-xl flex flex-col items-center gap-3 border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Enter 4-Digit Handshake Code
              </span>
              <div className="flex items-center gap-3">
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-input-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    className="w-12 h-14 text-center font-bold text-2xl bg-white border-2 border-slate-200 focus:border-red-600 rounded-xl outline-none shadow-sm text-slate-900"
                  />
                ))}
              </div>
              <button 
                onClick={fillAuto}
                type="button"
                className="text-xs text-red-600 hover:underline font-semibold"
              >
                Auto-fill Attendant's OTP ({expectedOtp})
              </button>
            </div>

            {errorMsg && (
              <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg font-medium flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerify}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                Confirm Blood Handover
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
