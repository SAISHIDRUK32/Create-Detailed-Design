/**
 * DisputeForm - Dispute Filing and Management Component
 *
 * Allows users to file disputes, upload evidence, and track
 * dispute resolution status.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Upload,
  X,
  MessageSquare,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Paperclip,
} from 'lucide-react';

export type DisputeType =
  | 'item_not_received'
  | 'item_not_as_described'
  | 'damaged_item'
  | 'counterfeit'
  | 'seller_fraud'
  | 'other';

export type DisputeStatus =
  | 'filed'
  | 'under_review'
  | 'evidence_requested'
  | 'mediation'
  | 'resolved_buyer'
  | 'resolved_seller'
  | 'closed';

export interface DisputeMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'buyer' | 'seller' | 'admin';
  content: string;
  attachments?: string[];
  timestamp: Date;
}

export interface Dispute {
  id: string;
  auctionId: string;
  auctionTitle: string;
  filedBy: string;
  type: DisputeType;
  status: DisputeStatus;
  description: string;
  refundAmount?: number;
  messages: DisputeMessage[];
  createdAt: Date;
  resolvedAt?: Date;
}

interface DisputeFormProps {
  auctionId: string;
  auctionTitle: string;
  purchaseAmount: number;
  onSubmit?: (dispute: Omit<Dispute, 'id' | 'messages' | 'createdAt' | 'status'>) => void;
  onCancel?: () => void;
}

const disputeTypes: Array<{ value: DisputeType; label: string; description: string }> = [
  { value: 'item_not_received', label: 'Item Not Received', description: 'I paid but never received the item' },
  { value: 'item_not_as_described', label: 'Not As Described', description: 'Item significantly differs from listing' },
  { value: 'damaged_item', label: 'Damaged Item', description: 'Item arrived damaged or broken' },
  { value: 'counterfeit', label: 'Counterfeit Item', description: 'Item is fake or not authentic' },
  { value: 'seller_fraud', label: 'Seller Fraud', description: 'Seller engaged in fraudulent behavior' },
  { value: 'other', label: 'Other', description: 'Other issue not listed above' },
];

export function DisputeForm({
  auctionId,
  auctionTitle,
  purchaseAmount,
  onSubmit,
  onCancel,
}: DisputeFormProps) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<DisputeType | null>(null);
  const [description, setDescription] = useState('');
  const [refundAmount, setRefundAmount] = useState(purchaseAmount);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!type || !description) return;

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    onSubmit?.({
      auctionId,
      auctionTitle,
      filedBy: 'current-user',
      type,
      description,
      refundAmount,
    });

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <div className="backdrop-blur-xl bg-slate-800/90 rounded-2xl border border-white/10 overflow-hidden max-w-lg w-full">
      {/* Header */}
      <div className="p-6 border-b border-white/10 bg-gradient-to-r from-red-500/10 to-orange-500/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/20">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">File a Dispute</h2>
            <p className="text-sm text-gray-400">{auctionTitle}</p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isSubmitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-12 text-center"
          >
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-emerald-400">Dispute Filed</h3>
            <p className="text-sm text-gray-400 mt-2">
              Your dispute has been submitted. Our team will review it within 24-48 hours.
            </p>
            <p className="text-xs text-gray-500 mt-4">
              Reference ID: DSP-{Date.now().toString(36).toUpperCase()}
            </p>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Progress Steps */}
            <div className="px-6 pt-4">
              <div className="flex items-center justify-between">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                        step >= s
                          ? 'bg-purple-500 border-purple-500 text-white'
                          : 'border-gray-600 text-gray-500'
                      }`}
                    >
                      {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                    </div>
                    {s < 3 && (
                      <div
                        className={`w-16 h-0.5 mx-2 ${
                          step > s ? 'bg-purple-500' : 'bg-gray-600'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>Type</span>
                <span>Details</span>
                <span>Review</span>
              </div>
            </div>

            {/* Step Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3"
                  >
                    <h3 className="font-medium mb-4">What's the issue?</h3>
                    {disputeTypes.map((dt) => (
                      <button
                        key={dt.value}
                        onClick={() => setType(dt.value)}
                        className={`w-full p-4 rounded-lg border text-left transition-all ${
                          type === dt.value
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-white/10 hover:border-white/20 bg-slate-700/50'
                        }`}
                      >
                        <p className="font-medium">{dt.label}</p>
                        <p className="text-sm text-gray-400">{dt.description}</p>
                      </button>
                    ))}
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Describe the issue in detail
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500/50 resize-none"
                        placeholder="Please provide as much detail as possible..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Requested Refund Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          $
                        </span>
                        <input
                          type="number"
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(Math.min(purchaseAmount, Number(e.target.value)))}
                          max={purchaseAmount}
                          className="w-full pl-8 pr-4 py-3 bg-slate-700/50 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500/50"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Maximum: ${purchaseAmount.toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Supporting Evidence (optional)
                      </label>
                      <div className="border-2 border-dashed border-white/10 rounded-lg p-4 text-center hover:border-white/20 transition-colors">
                        <input
                          type="file"
                          multiple
                          onChange={handleFileChange}
                          className="hidden"
                          id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            PNG, JPG, PDF up to 10MB
                          </p>
                        </label>
                      </div>

                      {attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {attachments.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <span className="text-sm truncate max-w-[200px]">
                                  {file.name}
                                </span>
                              </div>
                              <button
                                onClick={() => removeAttachment(index)}
                                className="p-1 hover:bg-white/10 rounded"
                              >
                                <X className="w-4 h-4 text-gray-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <h3 className="font-medium mb-4">Review Your Dispute</h3>

                    <div className="space-y-3 p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Auction</span>
                        <span className="font-medium">{auctionTitle}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Issue Type</span>
                        <span className="font-medium">
                          {disputeTypes.find((d) => d.value === type)?.label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Refund Requested</span>
                        <span className="font-medium text-purple-400">
                          ${refundAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Attachments</span>
                        <span className="font-medium">{attachments.length} file(s)</span>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-yellow-400">Before submitting</p>
                          <p className="text-gray-300 mt-1">
                            Please ensure you've contacted the seller first. Filing a dispute
                            will temporarily hold any pending payouts.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="p-6 border-t border-white/10 flex gap-3">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Back
                </button>
              )}
              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 && !type}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      File Dispute
                    </>
                  )}
                </button>
              )}
              {onCancel && step === 1 && (
                <button
                  onClick={onCancel}
                  className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Dispute status badge
 */
export function DisputeStatusBadge({ status }: { status: DisputeStatus }) {
  const statusConfig: Record<DisputeStatus, { label: string; color: string; bg: string }> = {
    filed: { label: 'Filed', color: 'text-blue-400', bg: 'bg-blue-500/20' },
    under_review: { label: 'Under Review', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    evidence_requested: { label: 'Evidence Needed', color: 'text-orange-400', bg: 'bg-orange-500/20' },
    mediation: { label: 'In Mediation', color: 'text-purple-400', bg: 'bg-purple-500/20' },
    resolved_buyer: { label: 'Resolved (Buyer)', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    resolved_seller: { label: 'Resolved (Seller)', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    closed: { label: 'Closed', color: 'text-gray-400', bg: 'bg-gray-500/20' },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
}
