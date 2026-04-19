/**
 * MFADialog - Multi-Factor Authentication Component
 *
 * Handles two-factor authentication flow including:
 * - TOTP code entry
 * - SMS verification
 * - Backup codes
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Smartphone,
  Key,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Copy,
  AlertTriangle,
} from 'lucide-react';

type MFAMethod = 'totp' | 'sms' | 'backup';

interface MFADialogProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string, method: MFAMethod) => Promise<boolean>;
  phoneLastFour?: string;
  showBackupOption?: boolean;
  title?: string;
  description?: string;
}

export function MFADialog({
  isOpen,
  onClose,
  onVerify,
  phoneLastFour = '1234',
  showBackupOption = true,
  title = 'Verification Required',
  description = 'Enter the 6-digit code from your authenticator app',
}: MFADialogProps) {
  const [method, setMethod] = useState<MFAMethod>('totp');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  // Cooldown timer for SMS resend
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setErrorMessage(null);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (digit && index === 5 && newCode.every(d => d)) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    pastedData.split('').forEach((digit, i) => {
      if (i < 6) newCode[i] = digit;
    });
    setCode(newCode);

    if (pastedData.length === 6) {
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (codeString: string) => {
    setStatus('verifying');
    setErrorMessage(null);

    try {
      const success = await onVerify(codeString, method);
      if (success) {
        setStatus('success');
        setTimeout(() => {
          onClose();
          setCode(['', '', '', '', '', '']);
          setStatus('idle');
        }, 1500);
      } else {
        setStatus('error');
        setErrorMessage('Invalid code. Please try again.');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage('Verification failed. Please try again.');
    }
  };

  const handleResendSMS = () => {
    setCooldown(30);
    // In real app, trigger SMS resend here
  };

  const resetDialog = () => {
    setCode(['', '', '', '', '', '']);
    setStatus('idle');
    setErrorMessage(null);
  };

  const switchMethod = (newMethod: MFAMethod) => {
    setMethod(newMethod);
    resetDialog();
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md backdrop-blur-xl bg-slate-800/95 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-gray-400 mt-1">
            {method === 'totp' && description}
            {method === 'sms' && `Enter the code sent to ***-***-${phoneLastFour}`}
            {method === 'backup' && 'Enter one of your backup codes'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {status === 'success' ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <p className="text-lg font-semibold text-emerald-400">Verified!</p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Code Input */}
                <div className="flex justify-center gap-2 mb-6">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={handlePaste}
                      disabled={status === 'verifying'}
                      className={`
                        w-12 h-14 text-center text-2xl font-bold rounded-lg
                        bg-slate-700/50 border-2 transition-all
                        focus:outline-none focus:border-purple-500
                        disabled:opacity-50
                        ${status === 'error' ? 'border-red-500 shake' : 'border-white/10'}
                      `}
                    />
                  ))}
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-2 text-red-400 text-sm mb-4"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    {errorMessage}
                  </motion.div>
                )}

                {/* Status */}
                {status === 'verifying' && (
                  <div className="flex items-center justify-center gap-2 text-purple-400 mb-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </div>
                )}

                {/* Method-specific options */}
                {method === 'sms' && (
                  <div className="text-center mb-4">
                    <button
                      onClick={handleResendSMS}
                      disabled={cooldown > 0}
                      className="text-sm text-purple-400 hover:text-purple-300 disabled:text-gray-500 transition-colors"
                    >
                      {cooldown > 0 ? (
                        <span className="flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" />
                          Resend in {cooldown}s
                        </span>
                      ) : (
                        "Didn't receive code? Resend"
                      )}
                    </button>
                  </div>
                )}

                {/* Method Switcher */}
                <div className="flex justify-center gap-4 pt-4 border-t border-white/10">
                  <button
                    onClick={() => switchMethod('totp')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      method === 'totp'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Key className="w-4 h-4" />
                    Authenticator
                  </button>
                  <button
                    onClick={() => switchMethod('sms')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      method === 'sms'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    SMS
                  </button>
                  {showBackupOption && (
                    <button
                      onClick={() => switchMethod('backup')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        method === 'backup'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Copy className="w-4 h-4" />
                      Backup
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/50 border-t border-white/10 text-center">
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>

      {/* Add shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}

/**
 * MFA Setup Component for enabling 2FA
 */
export function MFASetup({
  qrCodeUrl,
  secret,
  onVerify,
  onCancel,
}: {
  qrCodeUrl: string;
  secret: string;
  onVerify: (code: string) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="text-center mb-6">
        <Shield className="w-12 h-12 text-purple-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold">Setup Two-Factor Authentication</h2>
        <p className="text-sm text-gray-400 mt-1">
          Scan the QR code with your authenticator app
        </p>
      </div>

      {/* QR Code */}
      <div className="bg-white p-4 rounded-xl mx-auto w-fit mb-4">
        <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
      </div>

      {/* Manual Entry */}
      <div className="mb-6">
        <p className="text-sm text-gray-400 text-center mb-2">
          Or enter this code manually:
        </p>
        <div className="flex items-center justify-center gap-2">
          <code className="px-4 py-2 bg-slate-700 rounded-lg font-mono text-sm">
            {secret}
          </code>
          <button
            onClick={copySecret}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {copied ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <Copy className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Verification */}
      <MFADialog
        isOpen={true}
        onClose={onCancel}
        onVerify={async (code) => onVerify(code)}
        showBackupOption={false}
        title="Verify Setup"
        description="Enter the 6-digit code from your app to complete setup"
      />
    </div>
  );
}
