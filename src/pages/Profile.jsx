import { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { userAPI, filesAPI, authAPI } from '../services/api';
import { formatFileSize } from '../utils/fileUtils';
import DatePicker from '../components/DatePicker';
import CustomSelect from '../components/CustomSelect';
import { startRegistration } from '@simplewebauthn/browser';

export default function Profile() {
    const [profile, setProfile] = useState({
        name: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dob: '',
        jobTitle: '',
        organization: '',
        location: '',
        bio: '',
        avatar: null,
        storagePlan: '10GB',
        backupPreference: 'automatic',
        syncPreference: 'real-time',
        securityLevel: 'standard'
    });
    const [loading, setLoading] = useState(false);
    const [storageUsed, setStorageUsed] = useState(0);
    const [totalFiles, setTotalFiles] = useState(0);
    const [errors, setErrors] = useState({});
    const [fingerprints, setFingerprints] = useState([]); // WebAuthn credentials
    const fileInputRef = useRef(null);
    const { showToast } = useToast();

    const storagePlan = 10 * 1024 * 1024 * 1024; // 10GB

    useEffect(() => {
        loadProfile();
        loadStorageData();
        loadFingerprints();
    }, []);

    const loadFingerprints = async () => {
        try {
            const data = await authAPI.getFingerprints();
            if (data.success) {
                setFingerprints(data.credentials || []);
            }
        } catch (error) {
            console.error('Failed to load fingerprints', error);
        }
    };

    const handleAddFingerprint = async () => {
        try {
            // 1. Get options from server
            const options = await authAPI.getRegistrationChallenge();

            // 2. Browser handles biometric interaction
            const attResp = await startRegistration(options);

            // 3. Send response to server
            const verification = await authAPI.verifyRegistration(attResp);

            if (verification.success && verification.verified) {
                showToast('Fingerprint added successfully!', 'success');
                loadFingerprints();
            } else {
                showToast('Verification failed. Try again.', 'error');
            }
        } catch (error) {
            console.error('WebAuthn Error:', error);
            if (error.name === 'InvalidStateError') {
                showToast('This fingerprint is already registered.', 'error');
            } else if (error.name === 'NotAllowedError') {
                showToast('Fingerprint request cancel or timed out.', 'error');
            } else if (error.name === 'NotSupportedError') {
                showToast('This browser/device does not support required crypto.', 'error');
            } else {
                showToast(`Failed: ${error.message || 'Device not compatible'}`, 'error');
            }
        }
    };

    const [deleteModal, setDeleteModal] = useState({ show: false, id: null });

    const handleDeleteFingerprint = async (id) => {
        setDeleteModal({ show: true, id });
    };

    const confirmDelete = async () => {
        try {
            await authAPI.deleteFingerprint(deleteModal.id);
            setFingerprints(prev => prev.filter(fp => fp.id !== deleteModal.id));
            showToast('Fingerprint removed', 'success');
            setDeleteModal({ show: false, id: null });
        } catch (error) {
            showToast('Failed to remove fingerprint', 'error');
        }
    };

    const loadStorageData = async () => {
        try {
            const data = await filesAPI.getFiles();
            const fileList = data.files || [];
            const total = fileList.reduce((sum, file) => sum + (file.size || 0), 0);
            setStorageUsed(total);
            setTotalFiles(fileList.length);
        } catch (error) {
            console.error('Failed to load storage data:', error);
        }
    };

    const loadProfile = async () => {
        try {
            setLoading(true);
            const data = await userAPI.getProfile();
            console.log('Profile loaded from DB:', data.user);

            if (data.success && data.user) {
                const localProfile = JSON.parse(localStorage.getItem('userExtendedProfile') || '{}');

                const getValue = (key, defaultValue = '') => {
                    const dbValue = data.user[key];
                    // Check if DB value exists (including empty strings)
                    if (dbValue !== undefined && dbValue !== null) {
                        return dbValue;
                    }
                    // Fall back to localStorage
                    const localValue = localProfile[key];
                    if (localValue !== undefined && localValue !== null) {
                        return localValue;
                    }
                    // Finally use default
                    return defaultValue;
                };

                // Split name into first and last if not already split
                const fullName = data.user.name || '';
                const nameParts = fullName.split(' ');
                const firstName = data.user.firstName || nameParts[0] || '';
                const lastName = data.user.lastName || nameParts.slice(1).join(' ') || '';

                const newProfile = {
                    name: fullName,
                    firstName: firstName,
                    lastName: lastName,
                    email: data.user.email || '',
                    phone: getValue('phone'),
                    dob: getValue('dob'),
                    jobTitle: getValue('jobTitle'),
                    organization: getValue('organization'),
                    location: getValue('location'),
                    bio: getValue('bio'),
                    avatar: data.user.avatar || localProfile.avatar || null,
                    storagePlan: getValue('storagePlan', '10GB'),
                    backupPreference: getValue('backupPreference', 'automatic'),
                    syncPreference: getValue('syncPreference', 'real-time'),
                    securityLevel: getValue('securityLevel', 'standard')
                };

                console.log('Loaded Profile:', newProfile);
                setProfile(newProfile);

                if (data.user.name) {
                    localStorage.setItem('userName', data.user.name);
                }
            }
        } catch (error) {
            console.error('Profile load error:', error);
            showToast(error.message || 'Failed to load profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    const validatePhone = (phone) => {
        const digitsOnly = phone.replace(/\D/g, '');
        if (digitsOnly.length !== 10) {
            return 'Mobile number must be exactly 10 digits';
        }
        return '';
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Special handling for phone number
        if (name === 'phone') {
            const digitsOnly = value.replace(/\D/g, '');
            if (digitsOnly.length <= 10) {
                setProfile(prev => ({ ...prev, [name]: digitsOnly }));
                if (errors.phone) setErrors({ ...errors, phone: '' });
            }
            return;
        }

        // Update first/last name and sync full name
        if (name === 'firstName' || name === 'lastName') {
            const updatedProfile = { ...profile, [name]: value };
            updatedProfile.name = `${updatedProfile.firstName} ${updatedProfile.lastName}`.trim();
            setProfile(updatedProfile);
        } else {
            setProfile(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showToast('Image size should be less than 5MB', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setProfile(prev => ({ ...prev, avatar: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate phone if provided
        if (profile.phone) {
            const phoneError = validatePhone(profile.phone);
            if (phoneError) {
                setErrors({ phone: phoneError });
                showToast(phoneError, 'error');
                return;
            }
        }

        setLoading(true);

        try {
            console.log('Saving profile...', profile);
            const data = await userAPI.updateProfile(profile);
            console.log('Save response:', data);

            if (data.success && data.user) {
                // Update local status with fresh data from server
                const updatedUser = data.user;

                // Keep the state in sync
                setProfile(prev => ({
                    ...prev,
                    ...updatedUser,
                    // Re-calculate full name if parts changed
                    name: updatedUser.name || `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim()
                }));

                if (updatedUser.name) {
                    localStorage.setItem('userName', updatedUser.name);
                }

                showToast('Profile updated successfully', 'success');
            } else {
                throw new Error(data.msg || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Save error:', error);
            showToast(error.message || 'Failed to update profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    const storagePercentage = Math.min((storageUsed / storagePlan) * 100, 100);

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6">
                <div className="flex flex-col gap-5">
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all group w-fit px-5 py-2.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-sm"
                    >
                        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="text-sm font-semibold tracking-wide">Back</span>
                    </button>
                    <div>
                        <h1 className="text-4xl font-bold text-[var(--text-primary)] tracking-tight">Profile Settings</h1>
                        <p className="text-[var(--text-muted)] mt-2 text-lg">Manage your account information and preferences</p>
                        <div className="mt-3 flex items-center gap-3 bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-200">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-xs text-emerald-700 font-mono tracking-wide">API CONNECTED</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleSubmit}
                    type="button"
                    disabled={loading}
                    className="btn-primary w-full md:w-auto px-8 py-3 text-base shadow-lg shadow-[var(--accent-primary)]/20 transition-all"
                >
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-visible">

                {/* Left Column: Avatar & Quick Stats (4 col span) */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Avatar Card */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-8 flex flex-col items-center text-center shadow-xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent-primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative cursor-pointer transition-transform duration-300 hover:scale-105" onClick={handleImageClick}>
                            <div className={`w-40 h-40 rounded-full overflow-hidden border-4 border-[var(--bg-secondary)] shadow-2xl ring-4 ${profile.avatar ? 'ring-[var(--accent-primary)]/20' : 'ring-[var(--border-color)]'}`}>
                                {profile.avatar ? (
                                    <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-[var(--bg-primary)] flex items-center justify-center text-5xl font-bold text-[var(--text-muted)]">
                                        {(profile.firstName || profile.name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                accept="image/*"
                                className="hidden"
                            />
                            <p className="mt-4 text-sm font-bold text-[var(--accent-primary)] group-hover:opacity-80 transition-colors">Change Profile Photo</p>
                        </div>

                        <h2 className="mt-4 text-2xl font-bold text-[var(--text-primary)] tracking-wide">{profile.name || 'User'}</h2>
                        <p className="text-sm text-[var(--accent-primary)] font-black tracking-widest uppercase mt-1">{profile.jobTitle || 'Cloud Explorer'}</p>
                        <p className="text-[var(--text-muted)] text-xs mt-2 font-black bg-[var(--bg-primary)] px-2 py-0.5 rounded border border-[var(--border-color)]">{profile.email}</p>
                    </div>

                    {/* Storage Stats */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-6 shadow-sm hover:bg-[var(--bg-primary)] transition-colors">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                <svg className="w-4 h-4 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                </svg>
                                Cloud Storage
                            </h3>
                            <span className="text-xs font-bold bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] px-2 py-1 rounded-md border border-[var(--accent-primary)]/20">{Math.round(storagePercentage)}% Used</span>
                        </div>
                        <div className="relative pt-1">
                             <div className="flex mb-2 items-center justify-between">
                                <div className="text-right">
                                    <span className="text-lg font-bold text-[var(--text-primary)] inline-block">
                                        {formatFileSize(storageUsed)}
                                    </span>
                                    <span className="text-xs text-[var(--text-muted)] font-bold inline-block ml-1">
                                        / {formatFileSize(storagePlan)}
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-inner">
                                <div
                                    style={{ width: `${storagePercentage}%` }}
                                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]"
                                ></div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-medium">
                                <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{totalFiles} files secured in vault</span>
                            </div>
                        </div>
                    </div>

                    {/* Account Info */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-6 space-y-4 shadow-sm hover:bg-[var(--bg-primary)] transition-colors">
                        <h3 className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-[var(--border-color)] pb-3">
                            <svg className="w-4 h-4 text-[var(--accent-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Account Details
                        </h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Plan', value: profile.storagePlan, color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                                { label: 'Backup', value: profile.backupPreference, color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                                { label: 'Sync', value: profile.syncPreference, color: 'text-indigo-600', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
                                { label: 'Security', value: profile.securityLevel, color: 'text-rose-600', bg: 'bg-rose-500/10', border: 'border-rose-500/20' }
                            ].map((item, index) => (
                                <div key={index} className="flex justify-between items-center group">
                                    <span className="text-sm text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors font-medium">{item.label}</span>
                                    <span className={`text-sm font-bold ${item.color} ${item.bg} px-3 py-1 rounded-lg capitalize border ${item.border} transition-all`}>
                                        {item.value || 'Standard'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Edit Forms */}
                <div className="lg:col-span-8 space-y-8 overflow-visible">

                    {/* Personal Information */}
                    <section className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-sm overflow-visible">
                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                            <svg className="w-5 h-5 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Personal Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-visible">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[var(--text-secondary)] ml-1">First Name</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={profile.firstName}
                                    onChange={handleInputChange}
                                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:bg-[var(--bg-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--accent-primary)]/10 transition-all"
                                    placeholder="John"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[var(--text-secondary)] ml-1">Last Name</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={profile.lastName}
                                    onChange={handleInputChange}
                                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:bg-[var(--bg-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--accent-primary)]/10 transition-all"
                                    placeholder="Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[var(--text-secondary)] ml-1">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={profile.email}
                                    onChange={handleInputChange}
                                    disabled
                                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] opacity-60 px-4 py-3 text-[var(--text-muted)] cursor-not-allowed font-medium"
                                />
                                <p className="text-xs text-[var(--text-muted)] ml-1 font-medium">Email cannot be changed</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[var(--text-secondary)] ml-1">Phone Number</label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={profile.phone}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                            setProfile(prev => ({ ...prev, phone: value }));
                                            if (errors.phone) setErrors({ ...errors, phone: '' });
                                        }}
                                        className={`w-full rounded-xl border bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:bg-[var(--bg-secondary)] focus:outline-none focus:ring-4 transition-all ${errors.phone
                                            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                                            : 'border-[var(--border-color)] focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)]/10'
                                            }`}
                                        placeholder="1234567890"
                                        maxLength={10}
                                    />
                                </div>
                                {errors.phone && (
                                    <p className="text-xs text-rose-600 ml-1 font-bold">{errors.phone}</p>
                                )}
                                <p className="text-xs text-[var(--text-muted)] ml-1 font-medium">Enter 10 digits only</p>
                            </div>
                            <div className="space-y-2 sm:col-span-2 relative z-50">
                                <label className="text-sm font-bold text-slate-700">Date of Birth</label>
                                <DatePicker
                                    value={profile.dob}
                                    onChange={(e) => setProfile(prev => ({ ...prev, dob: e.target.value }))}
                                    max={new Date().toISOString().split('T')[0]}
                                    placeholder="Select your date of birth"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Professional Information */}
                    <section className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-sm">
                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                            <svg className="w-5 h-5 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Professional Information
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[var(--text-secondary)]">Job Title</label>
                                <input
                                    type="text"
                                    name="jobTitle"
                                    value={profile.jobTitle}
                                    onChange={handleInputChange}
                                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:bg-[var(--bg-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--accent-primary)]/10 transition-all"
                                    placeholder="Software Engineer"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[var(--text-secondary)]">Organization</label>
                                <input
                                    type="text"
                                    name="organization"
                                    value={profile.organization}
                                    onChange={handleInputChange}
                                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:bg-[var(--bg-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--accent-primary)]/10 transition-all"
                                    placeholder="Company Name"
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <label className="text-sm font-bold text-[var(--text-secondary)]">Location</label>
                                <input
                                    type="text"
                                    name="location"
                                    value={profile.location}
                                    onChange={handleInputChange}
                                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:bg-[var(--bg-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--accent-primary)]/10 transition-all"
                                    placeholder="City, Country"
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <label className="text-sm font-bold text-[var(--text-secondary)]">Bio</label>
                                <textarea
                                    name="bio"
                                    value={profile.bio}
                                    onChange={handleInputChange}
                                    rows={4}
                                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:bg-[var(--bg-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--accent-primary)]/10 transition-all resize-none"
                                    placeholder="Tell us about yourself..."
                                />
                            </div>
                        </div>
                    </section>

                    {/* Biometric Security */}
                    <section className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.131A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.848.578-4.156" />
                                </svg>
                                Biometric Security
                            </h3>
                            <button
                                type="button"
                                onClick={handleAddFingerprint}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Fingerprint
                            </button>
                        </div>

                        <div className="space-y-4">
                            {fingerprints.length === 0 ? (
                                <div className="text-center p-6 border border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-primary)]">
                                    <p className="text-[var(--text-secondary)] text-sm font-bold">No fingerprints added yet.</p>
                                    <p className="text-[var(--text-muted)] text-xs mt-1 font-medium">Add a fingerprint to login without a password.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {fingerprints.map((fp) => (
                                        <div key={fp.id} className="flex items-center justify-between p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl hover:bg-[var(--bg-secondary)] transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-sm">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.131A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.848.578-4.156" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[var(--text-primary)]">Device Passkey</p>
                                                    <p className="text-xs text-[var(--text-muted)] font-mono">{fp.id.substring(0, 8)}...</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteFingerprint(fp.id)}
                                                className="text-slate-400 hover:text-rose-600 transition-colors p-2 rounded-lg hover:bg-rose-50"
                                                title="Remove fingerprint"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Cloud Preferences */}
                    <section className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-sm">
                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                            <svg className="w-5 h-5 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                            </svg>
                            Cloud Preferences
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[var(--text-secondary)]">Storage Plan</label>
                                <CustomSelect
                                    value={profile.storagePlan}
                                    onChange={(e) => setProfile(prev => ({ ...prev, storagePlan: e.target.value }))}
                                    options={[
                                        { value: '10GB', label: '10GB - Free Tier' },
                                        { value: '100GB', label: '100GB - Personal' },
                                        { value: '1TB', label: '1TB - Professional' },
                                        { value: '5TB', label: '5TB - Enterprise' },
                                    ]}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[var(--text-secondary)]">Backup Preference</label>
                                <CustomSelect
                                    value={profile.backupPreference}
                                    onChange={(e) => setProfile(prev => ({ ...prev, backupPreference: e.target.value }))}
                                    options={[
                                        { value: 'automatic', label: 'Automatic Backup' },
                                        { value: 'manual', label: 'Manual Backup' },
                                        { value: 'scheduled', label: 'Scheduled Backup' },
                                    ]}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[var(--text-secondary)]">Sync Preference</label>
                                <CustomSelect
                                    value={profile.syncPreference}
                                    onChange={(e) => setProfile(prev => ({ ...prev, syncPreference: e.target.value }))}
                                    options={[
                                        { value: 'real-time', label: 'Real-time Sync' },
                                        { value: 'on-demand', label: 'On-demand Sync' },
                                        { value: 'scheduled', label: 'Scheduled Sync' },
                                    ]}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[var(--text-secondary)]">Security Level</label>
                                <CustomSelect
                                    value={profile.securityLevel}
                                    onChange={(e) => setProfile(prev => ({ ...prev, securityLevel: e.target.value }))}
                                    options={[
                                        { value: 'standard', label: 'Standard (AES-256)' },
                                        { value: 'enhanced', label: 'Enhanced (AES-256 + 2FA)' },
                                        { value: 'maximum', label: 'Maximum (AES-256 + 2FA + Biometric)' },
                                    ]}
                                />
                            </div>
                        </div>
                    </section>

                </div>
            </form>

            {/* Delete Fingerprint Modal */}
            {deleteModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-primary)]/40 backdrop-blur-sm animate-fadeIn">
                    <div className="relative w-full max-w-md bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] shadow-2xl animate-scaleIn overflow-hidden">
                        <div className="p-8">
                            {/* Icon */}
                            <div className="mx-auto w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-6 shadow-inner">
                                <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>

                            {/* Content */}
                            <h3 className="text-2xl font-bold text-slate-900 text-center mb-3">
                                Remove Fingerprint?
                            </h3>
                            <p className="text-slate-500 text-center mb-8 font-medium">
                                This will permanently remove this biometric authentication method. You'll need to re-register if you want to use it again.
                            </p>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteModal({ show: false, id: null })}
                                    className="flex-1 px-6 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold transition-all duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all duration-200 shadow-lg shadow-rose-100"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
