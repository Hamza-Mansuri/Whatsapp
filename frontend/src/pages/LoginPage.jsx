import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function LoginPage() {
  const [authMethod, setAuthMethod] = useState('phone'); // 'phone' or 'email'
  
  // Email states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Phone states
  const [countryCode, setCountryCode] = useState('IN');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1 = Phone Input, 2 = OTP Verification
  const [phoneNumberNormalized, setPhoneNumberNormalized] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [name, setName] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { login, requestOtp, verifyOtp, user } = useAuth();
  const navigate = useNavigate();

  // If user is already authenticated, redirect to chat screen
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result && !result.success) {
      setError(result.message);
    }
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phoneNumber) {
      setError('Please enter a phone number');
      return;
    }

    setSubmitting(true);
    const result = await requestOtp(phoneNumber, countryCode);
    setSubmitting(false);

    if (result.success) {
      setPhoneNumberNormalized(result.data.phoneNumberNormalized);
      setStep(2);
    } else {
      setError(result.message);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp) {
      setError('Please enter the OTP');
      return;
    }

    if (isNewUser && !name) {
      setError('Please provide a name to complete registration');
      return;
    }

    setSubmitting(true);
    const result = await verifyOtp(phoneNumberNormalized, otp, isNewUser ? name : null, countryCode);
    setSubmitting(false);

    if (result.success) {
      if (result.data?.isNewUser) {
        setIsNewUser(true);
      }
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img
          src="https://res.cloudinary.com/wycpodzl/image/upload/v1786535793/copy_of_chatgpt_image_aug_12_2026_05_09_56_pm_ialo4q.png"
          alt="WhatsApp Logo"
          className="auth-logo"
        />
        <h1 className="auth-title">WhatsApp</h1>
        <p className="auth-subtitle">Sign in to your account</p>

        {error && <div className="auth-error" style={{ marginBottom: '16px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
          <button 
            type="button" 
            onClick={() => { setAuthMethod('phone'); setStep(1); setError(''); }}
            style={{ padding: '8px 16px', background: authMethod === 'phone' ? 'var(--primary-teal)' : '#f0f2f5', color: authMethod === 'phone' ? 'white' : 'black', border: 'none', borderRadius: '20px', cursor: 'pointer' }}
          >
            Phone
          </button>
          <button 
            type="button" 
            onClick={() => { setAuthMethod('email'); setError(''); }}
            style={{ padding: '8px 16px', background: authMethod === 'email' ? 'var(--primary-teal)' : '#f0f2f5', color: authMethod === 'email' ? 'white' : 'black', border: 'none', borderRadius: '20px', cursor: 'pointer' }}
          >
            Email
          </button>
        </div>

        {authMethod === 'email' && (
          <form className="auth-form" onSubmit={handleEmailSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <button type="submit" className="auth-btn" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {authMethod === 'phone' && step === 1 && (
          <form className="auth-form" onSubmit={handlePhoneSubmit}>
            <div className="form-group">
              <label className="form-label">Country</label>
              <select 
                value={countryCode} 
                onChange={(e) => setCountryCode(e.target.value)} 
                className="form-input" 
                style={{ width: '100%', cursor: 'pointer' }}
              >
                <option value="US">🇺🇸 United States</option>
                <option value="IN">🇮🇳 India</option>
                <option value="GB">🇬🇧 United Kingdom</option>
                <option value="AU">🇦🇺 Australia</option>
                <option value="CA">🇨🇦 Canada</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="phone">Phone number</label>
              <input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <button type="submit" className="auth-btn" disabled={submitting}>
              {submitting ? 'Sending...' : 'Continue'}
            </button>
          </form>
        )}

        {authMethod === 'phone' && step === 2 && (
          <form className="auth-form" onSubmit={handleOtpSubmit}>
             <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                We sent a verification code to:<br/>
                <strong>{phoneNumberNormalized}</strong>
             </p>
             <div className="form-group">
               <label className="form-label" htmlFor="otp">6-digit Code</label>
               <input
                 id="otp"
                 type="text"
                 placeholder="000000"
                 maxLength="6"
                 value={otp}
                 onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                 className="form-input"
                 style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
                 required
               />
             </div>
             
             {isNewUser && (
               <div className="form-group" style={{ marginTop: '10px' }}>
                 <label className="form-label" htmlFor="name">Your Name</label>
                 <input
                   id="name"
                   type="text"
                   placeholder="John Doe"
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   className="form-input"
                   required={isNewUser}
                 />
               </div>
             )}

             <button type="submit" className="auth-btn" disabled={submitting}>
               {submitting ? 'Verifying...' : (isNewUser ? 'Complete Registration' : 'Verify')}
             </button>
             
             <div style={{ marginTop: '16px', fontSize: '0.85rem' }}>
                <button 
                  type="button" 
                  onClick={() => setStep(1)} 
                  style={{ background: 'none', border: 'none', color: 'var(--primary-teal)', cursor: 'pointer', fontWeight: '600' }}
                >
                  Change Phone Number
                </button>
             </div>
          </form>
        )}

        {authMethod === 'email' && (
          <div className="auth-footer">
            Don't have an account? 
            <Link to="/register" className="auth-link">Sign Up</Link>
          </div>
        )}
      </div>
    </div>
  );
}
