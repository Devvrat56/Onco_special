import React, { useState } from 'react';
import './App.css';
import { Mail, Lock, User, LogIn, UserPlus, Github, Chrome } from 'lucide-react';
import Dashboard from './components/Dashboard';

const AuthForm = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);

  const toggleAuth = () => {
    setIsLogin(!isLogin);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate login
    onLogin();
  };

  return (
    <div className="auth-card animate-fade-in">
      <div className="auth-header">
        <h1>{isLogin ? 'Welcome Back' : 'Get Started'}</h1>
        <p>{isLogin ? 'Sign in to access your dashboard' : 'Create an account to join Carelinq'}</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {!isLogin && (
          <div className="input-group animate-slide-in">
            <label htmlFor="name">Full Name</label>
            <div className="input-wrapper">
              <User aria-hidden="true" />
              <input 
                type="text" 
                id="name" 
                placeholder="John Doe" 
                required 
                aria-required="true"
              />
            </div>
          </div>
        )}

        <div className="input-group">
          <label htmlFor="email">Email Address</label>
          <div className="input-wrapper">
            <Mail aria-hidden="true" />
            <input 
              type="email" 
              id="email" 
              placeholder="example@mail.com" 
              required 
              aria-required="true"
            />
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="password">Password</label>
          <div className="input-wrapper">
            <Lock aria-hidden="true" />
            <input 
              type="password" 
              id="password" 
              placeholder="••••••••" 
              required 
              aria-required="true"
            />
          </div>
        </div>

        {isLogin && (
          <div style={{ textAlign: 'right', marginTop: '-12px' }}>
            <span className="toggle-link" style={{ fontSize: '0.85rem' }}>Forgot Password?</span>
          </div>
        )}

        <button type="submit" className="auth-button">
          {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
          {isLogin ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <div className="divider">Or continue with</div>

      <div className="social-group">
        <button className="social-button">
          <Chrome size={18} color="#4285F4" />
          Google
        </button>
        <button className="social-button">
          <Github size={18} />
          GitHub
        </button>
      </div>

      <div className="auth-footer">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <span 
          className="toggle-link" 
          onClick={toggleAuth}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleAuth()}
          role="button"
          tabIndex="0"
          aria-label={isLogin ? "Switch to Sign Up" : "Switch to Log In"}
        >
          {isLogin ? 'Sign Up' : 'Log In'}
        </span>
      </div>
    </div>
  );
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <div className="app-container">
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>
      
      {isLoggedIn ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <div className="auth-container">
          <AuthForm onLogin={handleLogin} />
        </div>
      )}
    </div>
  );
}

export default App;
