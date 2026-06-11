import { useState } from 'react'
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, updateProfile,
} from 'firebase/auth'
import { auth } from '../firebase'

export default function Auth() {
  const [tab, setTab] = useState('login')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // {text, type}

  // form state
  const [lEmail, setLEmail] = useState('')
  const [lPass, setLPass] = useState('')
  const [sName, setSName] = useState('')
  const [sEmail, setSEmail] = useState('')
  const [sPass, setSPass] = useState('')
  const [sPass2, setSPass2] = useState('')
  const [rEmail, setREmail] = useState('')

  const switchTab = (t) => { setTab(t); setMsg(null) }

  async function doLogin() {
    setMsg(null)
    if (!lEmail || !lPass) return setMsg({ text: 'Enter email and password', type: 'err' })
    setBusy(true)
    try {
      await signInWithEmailAndPassword(auth, lEmail.trim(), lPass)
    } catch (e) {
      const m = e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password'
        ? 'Wrong email or password' : e.message
      setMsg({ text: m, type: 'err' })
    }
    setBusy(false)
  }

  async function doSignup() {
    setMsg(null)
    if (!sName || !sEmail || !sPass) return setMsg({ text: 'Fill all fields', type: 'err' })
    if (sPass !== sPass2) return setMsg({ text: 'Passwords do not match', type: 'err' })
    if (sPass.length < 8) return setMsg({ text: 'Password must be at least 8 characters', type: 'err' })
    setBusy(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, sEmail.trim(), sPass)
      await updateProfile(cred.user, { displayName: sName })
      // onAuthStateChanged in App will pick this up and load the app
    } catch (e) {
      setMsg({ text: e.message, type: 'err' })
    }
    setBusy(false)
  }

  async function doReset() {
    setMsg(null)
    if (!rEmail) return setMsg({ text: 'Enter your email', type: 'err' })
    setBusy(true)
    try {
      await sendPasswordResetEmail(auth, rEmail.trim())
      setMsg({ text: 'Reset link sent to ' + rEmail + '. Check your inbox.', type: 'ok' })
    } catch (e) {
      setMsg({ text: e.message, type: 'err' })
    }
    setBusy(false)
  }

  const onKey = (fn) => (e) => { if (e.key === 'Enter') fn() }

  return (
    <div className="auth-wrap">
      <div className="auth-card fadein">
        <div className="auth-logo">
          <div className="auth-emoji">🍺</div>
          <h1>Siruvani Bar &amp; Kitchen</h1>
          <p>Management ERP · Tirupur</p>
        </div>

        <div className="auth-tabs">
          <button className={'atab' + (tab === 'login' ? ' on' : '')} onClick={() => switchTab('login')}>Sign in</button>
          <button className={'atab' + (tab === 'signup' ? ' on' : '')} onClick={() => switchTab('signup')}>Sign up</button>
          <button className={'atab' + (tab === 'reset' ? ' on' : '')} onClick={() => switchTab('reset')}>Forgot</button>
        </div>

        <div className="auth-panel">
          {msg && <div className={'auth-msg ' + msg.type}>{msg.text}</div>}

          {tab === 'login' && (
            <>
              <div className="aff"><label>Email</label>
                <input type="email" value={lEmail} onChange={(e) => setLEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" onKeyDown={onKey(doLogin)} /></div>
              <div className="aff"><label>Password</label>
                <input type="password" value={lPass} onChange={(e) => setLPass(e.target.value)} placeholder="••••••••" autoComplete="current-password" onKeyDown={onKey(doLogin)} /></div>
              <button className="auth-btn" disabled={busy} onClick={doLogin}>{busy ? 'Signing in…' : 'Sign in'}</button>
            </>
          )}

          {tab === 'signup' && (
            <>
              <div className="aff"><label>Full name</label>
                <input type="text" value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Your name" /></div>
              <div className="aff"><label>Email</label>
                <input type="email" value={sEmail} onChange={(e) => setSEmail(e.target.value)} placeholder="you@email.com" /></div>
              <div className="aff"><label>Password (min 8 characters)</label>
                <input type="password" value={sPass} onChange={(e) => setSPass(e.target.value)} placeholder="••••••••" /></div>
              <div className="aff"><label>Confirm password</label>
                <input type="password" value={sPass2} onChange={(e) => setSPass2(e.target.value)} placeholder="••••••••" onKeyDown={onKey(doSignup)} /></div>
              <button className="auth-btn" disabled={busy} onClick={doSignup}>{busy ? 'Creating…' : 'Create account'}</button>
            </>
          )}

          {tab === 'reset' && (
            <>
              <p className="auth-hint">Enter your email and we'll send a password reset link.</p>
              <div className="aff"><label>Email</label>
                <input type="email" value={rEmail} onChange={(e) => setREmail(e.target.value)} placeholder="you@email.com" onKeyDown={onKey(doReset)} /></div>
              <button className="auth-btn" disabled={busy} onClick={doReset}>{busy ? 'Sending…' : 'Send reset link'}</button>
            </>
          )}
        </div>

        <div className="auth-foot">🔒 Private system — authorised access only</div>
      </div>
    </div>
  )
}
