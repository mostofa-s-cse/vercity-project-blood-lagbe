import React, { useState } from 'react';
import { ScreenId, Donor, BloodGroup } from '../types/blood';
import { sound } from '../utils/audio';
import { useLanguage } from '../context/LanguageContext';

interface DonorRegistrationScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onRegisterDonor: (newDonor: Donor) => void;
}

export const DonorRegistrationScreen: React.FC<DonorRegistrationScreenProps> = ({
  onNavigate,
  onRegisterDonor
}) => {
  const { language } = useLanguage();

  // Form states
  const [name, setName] = useState('');
  const [age, setAge] = useState('24');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');
  const [phone, setPhone] = useState('017');
  const [email, setEmail] = useState('');
  const [division, setDivision] = useState('Dhaka Central');
  const [location, setLocation] = useState('');
  const [nearestHospital, setNearestHospital] = useState('Dhaka Medical College Hospital');
  const [weightKg, setWeightKg] = useState('65');
  const [lastDonationMonths, setLastDonationMonths] = useState('4');
  const [vehicle, setVehicle] = useState('Personal Motorcycle');
  const [isAvailable, setIsAvailable] = useState(true);

  // Medical questionnaire checklist
  const [weightEligible, setWeightEligible] = useState(true);
  const [noChronicIllness, setNoChronicIllness] = useState(true);
  const [noRecentFever, setNoRecentFever] = useState(true);
  const [voluntaryPledge, setVoluntaryPledge] = useState(true);

  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !location) return;
    if (!voluntaryPledge) {
      alert(language === 'bn' ? 'দয়া করে স্বেচ্ছাসেবী ও অবৈতনিক রক্তদানের অঙ্গীকার গ্রহণ করুন।' : 'Please accept the 100% voluntary donation pledge.');
      return;
    }

    sound.playSuccessTone();

    const createdDonor: Donor = {
      id: `DON-${Date.now().toString().slice(-4)}`,
      name,
      age: parseInt(age) || 24,
      gender,
      bloodGroup,
      rhType: bloodGroup.includes('-') ? 'NEG' : 'POS',
      location,
      division,
      distanceKm: 1.5,
      nearestHospital,
      donationCount: 1,
      rating: 5.0,
      badge: 'Community Hero',
      daysElapsedSinceDonation: (parseInt(lastDonationMonths) || 4) * 30,
      isAvailable,
      isOnDuty: isAvailable,
      isBdrcsVerified: true,
      hbLevel: 13.8,
      weightKg: parseInt(weightKg) || 65,
      bloodPressure: '120/80',
      serologyClear: true,
      commuteEtaMin: 12,
      vehicle,
      languages: ['Bangla', 'English'],
      phone: phone.startsWith('+880') ? phone : `+880 ${phone.trim()}`,
      avatarUrl: gender === 'Female' 
        ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    };

    onRegisterDonor(createdDonor);
    setIsSubmitted(true);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-6">
      {/* Registration Header */}
      <div className="bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-80 h-80 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">
                {language === 'bn' ? 'স্বেচ্ছাসেবী রক্তদাতা নিবন্ধন' : 'DONOR REGISTRATION'}
              </span>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">verified</span>
                {language === 'bn' ? '১০০% অবৈতনিক রক্তদান নেটওয়ার্ক' : '100% Voluntary Life Network'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              {language === 'bn' ? 'ব্লাড লাগবে? রক্তদাতা হিসেবে নিবন্ধন করুন' : 'Join the Life-Saving Donor Network'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {language === 'bn'
                ? 'আপনার রক্তদানের মাধ্যমে যেকোনো মুমূর্ষু রোগী, থ্যালাসেমিয়া আক্রান্ত শিশু বা প্রসূতি মায়ের জীবন বাঁচতে পারে।'
                : 'Register as an on-call voluntary blood donor. Get geofenced alerts when critical patients nearby match your blood group.'}
            </p>
          </div>

          <button
            onClick={() => onNavigate('donor-directory')}
            className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 self-start md:self-auto cursor-pointer"
          >
            {language === 'bn' ? 'বর্তমান ডোনারদের দেখুন' : 'Browse Existing Donors'}
          </button>
        </div>
      </div>

      {isSubmitted ? (
        /* Success Screen */
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-lg text-center flex flex-col items-center gap-4 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">verified</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            {language === 'bn' ? 'অভিনন্দন! আপনার ডোনার প্রোফাইল সফলভাবে তৈরি হয়েছে' : 'Congratulations! You are now a Registered Donor'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg leading-relaxed">
            {language === 'bn'
              ? `${name}, আপনার ${bloodGroup} গ্রুপের রক্তদাতা প্রোফাইল সক্রিয় করা হয়েছে। নিকটবর্তী হাসপাতালে রক্তের প্রয়োজন হলে আপনার ফোনে জরুরি বিজ্ঞপ্তি পৌঁছাবে।`
              : `${name}, your ${bloodGroup} profile is now active on the national registry. Nearby hospitals and families can now reach out for verified emergencies.`}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            <button
              onClick={() => onNavigate('donor-passport')}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-red-600/30 cursor-pointer transition-all"
            >
              {language === 'bn' ? 'ডোনার পাসপোর্ট দেখুন' : 'View Donor Passport'}
            </button>
            <button
              onClick={() => onNavigate('donor-directory')}
              className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer transition-all"
            >
              {language === 'bn' ? 'ডোনার ডিরেক্টরি খুলুন' : 'Open Donor Directory'}
            </button>
          </div>
        </div>
      ) : (
        /* Registration Form */
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Fields */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col gap-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-red-600">person</span>
                <span>{language === 'bn' ? '১. ব্যক্তিগত তথ্য ও রক্তের গ্রুপ' : '1. Personal Info & Blood Group'}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'bn' ? 'জরুরি পরিস্থিতিতে দ্রুত যোগাযোগের জন্য সঠিক তথ্য দিন।' : 'Provide accurate contact details for emergency cross-matching.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'পূর্ণ নাম *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tanvir Ahmed"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'মোবাইল নম্বর (সক্রিয়) *' : 'Mobile Number *'}
                </label>
                <input
                  type="tel"
                  required
                  placeholder="01712-489021"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'রক্তের গ্রুপ *' : 'Blood Group *'}
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-black text-red-600 outline-none cursor-pointer"
                >
                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                    <option key={bg} value={bg}>{bg} ({bg.includes('-') ? 'Rare Rh-Neg' : 'Rh-Pos'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'bn' ? 'বয়স ও লিঙ্গ' : 'Age & Gender'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="18"
                    max="65"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none"
                    placeholder="Age"
                  />
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full px-2 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none"
                  >
                    <option value="Male">{language === 'bn' ? 'পুরুষ' : 'Male'}</option>
                    <option value="Female">{language === 'bn' ? 'মহিলা' : 'Female'}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-red-600">location_on</span>
                <span>{language === 'bn' ? '২. ঠিকানা ও এলাকা' : '2. Location & Hospital Radius'}</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                {language === 'bn' ? 'নিকটবর্তী হাসপাতালের সাথে জিওফেন্সিংয়ের জন্য আপনার এলাকা নির্ধারণ করুন।' : 'Geo-tagging ensures you are summoned only for realistic hospital transit times.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'বিভাগ / জোন' : 'Division / Hub'}
                  </label>
                  <select
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold outline-none cursor-pointer"
                  >
                    <option value="Dhaka Central">Dhaka Central (DMCH, BSMMU, Mitford)</option>
                    <option value="Dhaka North">Dhaka North (Uttara, Kurmitola, Mirpur)</option>
                    <option value="Chattogram Port">Chattogram (CMCH Hub)</option>
                    <option value="Sylhet Sadar">Sylhet (Osmani Medical Zone)</option>
                    <option value="Rajshahi Division">Rajshahi (RMCH Zone)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'নির্দিষ্ট এলাকা / থানা *' : 'Specific Area / Thana *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dhanmondi 27 / Shahbagh / Mirpur 10"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'নিকটবর্তী হাসপাতাল' : 'Nearest Preferred Hospital'}
                  </label>
                  <input
                    type="text"
                    value={nearestHospital}
                    onChange={(e) => setNearestHospital(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'যাতায়াত মাধ্যম' : 'Transit Vehicle'}
                  </label>
                  <select
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium outline-none cursor-pointer"
                  >
                    <option value="Personal Motorcycle">Personal Motorcycle (Fast Transit)</option>
                    <option value="Personal Ride / Car">Personal Ride / Car</option>
                    <option value="Bicycle / On Foot">Bicycle / On Foot</option>
                    <option value="Uber / Public Transit">Uber / Public Transit</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Medical Screening Checklist */}
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-red-600">health_and_safety</span>
                <span>{language === 'bn' ? '৩. স্বাস্থ্য ও রক্তদানের যোগ্যতা' : '3. Medical Eligibility Checklist'}</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                {language === 'bn' ? 'নিরাপদ রক্তদানের জন্য নিচের শর্তাবলী নিশ্চিত করুন।' : 'Confirm strict safety protocols to ensure patient and donor wellbeing.'}
              </p>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={weightEligible}
                    onChange={(e) => setWeightEligible(e.target.checked)}
                    className="mt-0.5 text-red-600 rounded"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">
                      {language === 'bn' ? 'ওজন ৪৫ কেজির বেশি এবং বয়স ১৮-৬৫ এর মধ্যে' : 'Weight is at least 45kg and age 18-65'}
                    </span>
                    <span className="text-slate-500">
                      {language === 'bn' ? 'শারীরিক সুস্থতা রক্তদানের জন্য অপরিহার্য।' : 'Minimum physiological threshold for safe whole blood extraction.'}
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noChronicIllness}
                    onChange={(e) => setNoChronicIllness(e.target.checked)}
                    className="mt-0.5 text-red-600 rounded"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">
                      {language === 'bn' ? 'গত ৩ মাসে কোনো বড় অসুখ বা অ্যান্টিবায়োটিক সেবন করেননি' : 'No major illness or antibiotics in the last 3 months'}
                    </span>
                    <span className="text-slate-500">
                      {language === 'bn' ? 'হেপাটাইটিস, এইডস বা ম্যালেরিয়া মুক্ত।' : 'Serology clear with normal hemoglobin.'}
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-red-50/60 border border-red-200 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={voluntaryPledge}
                    onChange={(e) => setVoluntaryPledge(e.target.checked)}
                    className="mt-0.5 text-red-600 rounded"
                  />
                  <div className="text-xs text-red-900">
                    <span className="font-extrabold block">
                      {language === 'bn' ? '১০০% অবৈতনিক স্বেচ্ছাসেবী রক্তদানের অঙ্গীকার *' : '100% Voluntary Non-Commercial Pledge *'}
                    </span>
                    <span>
                      {language === 'bn'
                        ? 'আমি স্বেচ্ছায় ও কোনো আর্থিক বিনিময় ছাড়া শুধুমাত্র মানবসেবায় রক্ত দিতে অঙ্গীকারবদ্ধ।'
                        : 'I solemnly pledge to donate blood purely on a voluntary, non-commercial basis under DGHS safety laws.'}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-red-600/30 cursor-pointer transition-all active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">how_to_reg</span>
              <span>{language === 'bn' ? 'রক্তদাতা হিসেবে নিবন্ধন সম্পন্ন করুন' : 'Complete Registration'}</span>
            </button>
          </div>

          {/* Right Live Preview Card */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs sticky top-28">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-3">
                {language === 'bn' ? 'লাইভ প্রিভিউ কার্ড' : 'LIVE PASSPORT PREVIEW'}
              </span>

              {/* Donor Card Preview */}
              <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-full bg-red-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-red-600/30">
                    {bloodGroup}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                    {language === 'bn' ? 'প্রস্তুত ডোনার' : 'ACTIVE'}
                  </span>
                </div>

                <h4 className="font-black text-slate-900 text-base">{name || (language === 'bn' ? 'আপনার নাম' : 'Your Name')}</h4>
                <p className="text-xs text-slate-500 font-medium">
                  {location || (language === 'bn' ? 'আপনার এলাকা' : 'Your Area')}, {division}
                </p>

                <div className="mt-4 pt-3 border-t border-red-100 space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{language === 'bn' ? 'ফোন:' : 'Phone:'}</span>
                    <span className="font-mono font-bold">{phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{language === 'bn' ? 'যানবাহন:' : 'Transit:'}</span>
                    <span className="font-semibold">{vehicle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{language === 'bn' ? 'হাসপাতাল:' : 'Hospital:'}</span>
                    <span className="font-semibold truncate max-w-[140px]">{nearestHospital}</span>
                  </div>
                </div>

                <div className="mt-4 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-[11px] text-emerald-800 font-semibold">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  <span>BDRCS Verified Safe Donor</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-500 leading-relaxed">
                <span className="font-bold text-slate-700 block mb-0.5">{language === 'bn' ? 'গোপনীয়তা গ্যারান্টি:' : 'Privacy Assurance:'}</span>
                {language === 'bn'
                  ? 'আপনার ফোন নম্বর শুধুমাত্র ডিজিএইচএস ভেরিফাইড রোগী বা হাসপাতালের জরুরি প্রয়োজনে দেখানো হবে।'
                  : 'Your phone number is shared only during active verified emergencies under strict anti-spam guidelines.'}
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
