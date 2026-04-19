/**
 * CreateAuction Page - Start a New Live Auction
 *
 * Multi-step auction creation wizard:
 * 1. Item Details (title, description, category)
 * 2. Images Upload
 * 3. Pricing (starting price, reserve, buy now)
 * 4. Duration & Scheduling
 * 5. Review & Launch
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Gavel,
  Package,
  Image as ImageIcon,
  DollarSign,
  Clock,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  X,
  Plus,
  Info,
  Zap,
  Shield,
  Calendar,
  Loader2,
  Sparkles,
  Video,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAuctions } from '../context/AuctionContext';

interface AuctionFormData {
  // Step 1: Item Details
  title: string;
  description: string;
  category: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';

  // Step 2: Images
  images: string[];

  // Step 3: Pricing
  startingPrice: number;
  reservePrice: number;
  buyNowPrice: number;
  minIncrement: number;

  // Step 4: Duration
  duration: '1h' | '3h' | '6h' | '12h' | '1d' | '3d' | '7d';
  startTime: 'now' | 'scheduled';
  scheduledDate?: string;
  scheduledTime?: string;
  enableAntiSnipe: boolean;

  // Step 4b: Live Stream
  isLiveStream: boolean;

  // Step 5: Additional
  shippingOptions: 'seller_ships' | 'local_pickup' | 'both';
  returnPolicy: 'no_returns' | '7_days' | '14_days' | '30_days';
}

const categories = [
  'Watches', 'Art', 'Books', 'Musical Instruments', 'Fashion',
  'Jewelry', 'Electronics', 'Collectibles', 'Antiques', 'Sports',
  'Vehicles', 'Real Estate', 'Other',
];

const conditions = [
  { value: 'new', label: 'New', description: 'Brand new, unused, unopened' },
  { value: 'like_new', label: 'Like New', description: 'Opened but never used' },
  { value: 'good', label: 'Good', description: 'Minor signs of use' },
  { value: 'fair', label: 'Fair', description: 'Visible wear, fully functional' },
  { value: 'poor', label: 'Poor', description: 'Heavy wear, may need repairs' },
];

const durations = [
  { value: '1h', label: '1 Hour', description: 'Flash auction' },
  { value: '3h', label: '3 Hours', description: 'Quick sale' },
  { value: '6h', label: '6 Hours', description: 'Half day' },
  { value: '12h', label: '12 Hours', description: 'Extended' },
  { value: '1d', label: '1 Day', description: 'Standard' },
  { value: '3d', label: '3 Days', description: 'Popular choice' },
  { value: '7d', label: '7 Days', description: 'Maximum exposure' },
];

export function CreateAuction() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { createAuction } = useAuctions();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdAuctionId, setCreatedAuctionId] = useState<string | null>(null);

  const [formData, setFormData] = useState<AuctionFormData>({
    title: '',
    description: '',
    category: '',
    condition: 'good',
    images: [],
    startingPrice: 100,
    reservePrice: 0,
    buyNowPrice: 0,
    minIncrement: 10,
    duration: '1d',
    startTime: 'now',
    enableAntiSnipe: true,
    isLiveStream: false,
    shippingOptions: 'seller_ships',
    returnPolicy: '14_days',
  });

  const updateField = <K extends keyof AuctionFormData>(
    field: K,
    value: AuctionFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const steps = [
    { num: 1, label: 'Details', icon: Package },
    { num: 2, label: 'Images', icon: ImageIcon },
    { num: 3, label: 'Pricing', icon: DollarSign },
    { num: 4, label: 'Duration', icon: Clock },
    { num: 5, label: 'Review', icon: CheckCircle },
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.title && formData.description && formData.category;
      case 2:
        return formData.images.length > 0;
      case 3:
        return formData.startingPrice > 0;
      case 4:
        return formData.duration;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      alert('You must be logged in to create an auction');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the auction using AuctionContext (async for Firebase support)
      const newAuction = await createAuction({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        condition: formData.condition,
        images: formData.images,
        startingPrice: formData.startingPrice,
        reservePrice: formData.reservePrice,
        buyNowPrice: formData.buyNowPrice,
        minIncrement: formData.minIncrement,
        duration: formData.duration,
        startTime: formData.startTime,
        enableAntiSnipe: formData.enableAntiSnipe,
        isLiveStream: formData.isLiveStream,
      });

      setCreatedAuctionId(newAuction.id);
      setIsSuccess(true);
    } catch (error) {
      console.error('Error creating auction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to create auction: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Demo image URLs for preview
  const addDemoImage = () => {
    const demoImages = [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800',
      'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=800',
      'https://images.unsplash.com/photo-1491553895911-0055uj82328c?w=800',
    ];
    const randomImage = demoImages[Math.floor(Math.random() * demoImages.length)];
    if (formData.images.length < 6) {
      updateField('images', [...formData.images, randomImage]);
    }
  };

  const removeImage = (index: number) => {
    updateField('images', formData.images.filter((_, i) => i !== index));
  };

  // Handle file uploads from system
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      if (formData.images.length >= 6) break;

      const file = files[i];
      const reader = new FileReader();

      reader.onload = (event) => {
        const result = event.target?.result as string;
        updateField('images', [...formData.images, result]);
      };

      reader.readAsDataURL(file);
    }

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Gavel className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Sign in to Create Auctions</h2>
          <p className="text-gray-400 mb-6">
            You need to be logged in to start selling on AURA Auction.
          </p>
          <button
            onClick={() => navigate('/login', { state: { from: '/create-auction' } })}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Auction Created!</h2>
          <p className="text-gray-400 mb-8">
            Your auction "{formData.title}" is now live and accepting bids.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate(formData.isLiveStream ? `/live/${createdAuctionId}` : `/auction/${createdAuctionId}`)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold"
            >
              {formData.isLiveStream ? 'Go Live Now' : 'View Auction'}
            </button>
            <button
              onClick={() => {
                setIsSuccess(false);
                setCurrentStep(1);
                setFormData({
                  title: '',
                  description: '',
                  category: '',
                  condition: 'good',
                  images: [],
                  startingPrice: 100,
                  reservePrice: 0,
                  buyNowPrice: 0,
                  minIncrement: 10,
                  duration: '1d',
                  startTime: 'now',
                  enableAntiSnipe: true,
                  isLiveStream: false,
                  shippingOptions: 'seller_ships',
                  returnPolicy: '14_days',
                });
              }}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold"
            >
              Create Another
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {/* Header */}
      <div className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-16 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Cancel</span>
            </button>
            <h1 className="text-lg font-semibold">Create Auction</h1>
            <div className="w-20" />
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between py-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.num;
              const isCompleted = currentStep > step.num;

              return (
                <div key={step.num} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        isCompleted
                          ? 'bg-purple-500 border-purple-500'
                          : isActive
                          ? 'border-purple-500 text-purple-400'
                          : 'border-gray-600 text-gray-500'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`text-xs mt-1 ${isActive ? 'text-purple-400' : 'text-gray-500'}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-12 sm:w-20 h-0.5 mx-2 ${
                        isCompleted ? 'bg-purple-500' : 'bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Item Details */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold mb-2">Item Details</h2>
                <p className="text-gray-400">Tell us about what you're selling</p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="e.g., Vintage Rolex Submariner 1960s"
                  maxLength={100}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                />
                <p className="text-xs text-gray-500 mt-1">{formData.title.length}/100 characters</p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category *
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => updateField('category', cat)}
                      className={`px-3 py-2 rounded-lg text-sm transition-all ${
                        formData.category === cat
                          ? 'bg-purple-500 text-white'
                          : 'bg-slate-800/50 border border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Condition *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {conditions.map(cond => (
                    <button
                      key={cond.value}
                      onClick={() => updateField('condition', cond.value as AuctionFormData['condition'])}
                      className={`p-4 rounded-xl text-left transition-all ${
                        formData.condition === cond.value
                          ? 'bg-purple-500/20 border-2 border-purple-500'
                          : 'bg-slate-800/50 border border-white/10 hover:border-white/20'
                      }`}
                    >
                      <p className="font-medium">{cond.label}</p>
                      <p className="text-sm text-gray-400">{cond.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Describe your item in detail. Include brand, model, measurements, history, any flaws, etc."
                  rows={5}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 resize-none"
                />
              </div>
            </motion.div>
          )}

          {/* Step 2: Images */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold mb-2">Add Photos</h2>
                <p className="text-gray-400">Add up to 6 photos of your item</p>
              </div>

              {/* Upload Area */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {formData.images.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                    <img src={img} alt={`Item ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {index === 0 && (
                      <span className="absolute bottom-2 left-2 px-2 py-1 bg-purple-500 rounded text-xs">
                        Cover
                      </span>
                    )}
                  </div>
                ))}

                {formData.images.length < 6 && (
                  <label className="relative aspect-square rounded-xl border-2 border-dashed border-white/20 hover:border-purple-500/50 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-purple-400 transition-all cursor-pointer">
                    <Plus className="w-8 h-8" />
                    <span className="text-sm text-center">Upload Photo</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-400">Photo Tips</p>
                  <ul className="text-gray-300 mt-1 space-y-1">
                    <li>• Use good lighting and clear backgrounds</li>
                    <li>• Show multiple angles and any flaws</li>
                    <li>• First photo will be the cover image</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Pricing */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold mb-2">Set Your Price</h2>
                <p className="text-gray-400">Configure pricing and bid increments</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                {/* Starting Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Starting Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={formData.startingPrice || ''}
                      onChange={(e) => updateField('startingPrice', e.target.value ? Number(e.target.value) : 0)}
                      onBlur={(e) => {
                        if (!e.target.value) updateField('startingPrice', 100);
                      }}
                      min={1}
                      step={1}
                      placeholder="100"
                      className="w-full pl-8 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Bidding starts at this price</p>
                </div>

                {/* Minimum Increment */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Minimum Bid Increment
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={formData.minIncrement || ''}
                      onChange={(e) => updateField('minIncrement', e.target.value ? Number(e.target.value) : 0)}
                      onBlur={(e) => {
                        if (!e.target.value) updateField('minIncrement', 10);
                      }}
                      min={1}
                      step={1}
                      placeholder="10"
                      className="w-full pl-8 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Each bid must increase by at least this amount</p>
                </div>

                {/* Reserve Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Reserve Price (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={formData.reservePrice || ''}
                      onChange={(e) => updateField('reservePrice', e.target.value ? Number(e.target.value) : 0)}
                      min={0}
                      step={1}
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Item won't sell below this price (hidden from bidders)</p>
                </div>

                {/* Buy Now Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Buy Now Price (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={formData.buyNowPrice}
                      onChange={(e) => updateField('buyNowPrice', Number(e.target.value))}
                      min={0}
                      className="w-full pl-8 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Allow instant purchase at this price</p>
                </div>
              </div>

              {/* Pricing Preview */}
              <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                <h3 className="font-medium mb-3">Pricing Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Starting Bid</span>
                    <span className="font-medium">${formData.startingPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Min Increment</span>
                    <span className="font-medium">+${formData.minIncrement.toLocaleString()}</span>
                  </div>
                  {formData.reservePrice > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reserve</span>
                      <span className="font-medium text-yellow-400">${formData.reservePrice.toLocaleString()}</span>
                    </div>
                  )}
                  {formData.buyNowPrice > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Buy Now</span>
                      <span className="font-medium text-emerald-400">${formData.buyNowPrice.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Duration */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold mb-2">Auction Duration</h2>
                <p className="text-gray-400">Choose when and how long your auction runs</p>
              </div>

              {/* Duration Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Duration *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {durations.map(dur => (
                    <button
                      key={dur.value}
                      onClick={() => updateField('duration', dur.value as AuctionFormData['duration'])}
                      className={`p-4 rounded-xl text-center transition-all ${
                        formData.duration === dur.value
                          ? 'bg-purple-500/20 border-2 border-purple-500'
                          : 'bg-slate-800/50 border border-white/10 hover:border-white/20'
                      }`}
                    >
                      <p className="font-bold text-lg">{dur.label}</p>
                      <p className="text-xs text-gray-400">{dur.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Start Time
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => updateField('startTime', 'now')}
                    className={`p-4 rounded-xl flex items-center gap-3 transition-all ${
                      formData.startTime === 'now'
                        ? 'bg-purple-500/20 border-2 border-purple-500'
                        : 'bg-slate-800/50 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    <Zap className="w-6 h-6 text-purple-400" />
                    <div className="text-left">
                      <p className="font-medium">Start Immediately</p>
                      <p className="text-xs text-gray-400">Go live right now</p>
                    </div>
                  </button>
                  <button
                    onClick={() => updateField('startTime', 'scheduled')}
                    className={`p-4 rounded-xl flex items-center gap-3 transition-all ${
                      formData.startTime === 'scheduled'
                        ? 'bg-purple-500/20 border-2 border-purple-500'
                        : 'bg-slate-800/50 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    <Calendar className="w-6 h-6 text-purple-400" />
                    <div className="text-left">
                      <p className="font-medium">Schedule</p>
                      <p className="text-xs text-gray-400">Pick a date & time</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Go Live with Camera */}
              <div className="p-4 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-xl border border-red-500/30">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <Video className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <p className="font-medium">Go Live with Camera</p>
                      <p className="text-sm text-gray-400">
                        Broadcast live from your camera while the auction runs
                      </p>
                    </div>
                  </div>
                  <div
                    onClick={() => updateField('isLiveStream', !formData.isLiveStream)}
                    className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${
                      formData.isLiveStream ? 'bg-red-600' : 'bg-slate-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white mt-0.5 transition-transform ${
                        formData.isLiveStream ? 'ml-6' : 'ml-0.5'
                      }`}
                    />
                  </div>
                </label>
                {formData.isLiveStream && (
                  <div className="mt-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg flex items-start gap-2">
                    <Info className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-300">
                      Your camera will activate when the auction starts. Viewers can watch you present the item live and bid in real time.
                    </p>
                  </div>
                )}
              </div>

              {/* Anti-Snipe */}
              <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-purple-400" />
                    <div>
                      <p className="font-medium">Enable Anti-Snipe Protection</p>
                      <p className="text-sm text-gray-400">
                        Extends auction by 2 minutes if bid placed in last 60 seconds
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-12 h-6 rounded-full transition-colors ${
                      formData.enableAntiSnipe ? 'bg-purple-600' : 'bg-slate-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white mt-0.5 transition-transform ${
                        formData.enableAntiSnipe ? 'ml-6' : 'ml-0.5'
                      }`}
                    />
                  </div>
                </label>
              </div>
            </motion.div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold mb-2">Review & Launch</h2>
                <p className="text-gray-400">Review your auction before going live</p>
              </div>

              {/* Preview Card */}
              <div className="bg-slate-800/50 rounded-2xl border border-white/10 overflow-hidden">
                {formData.images[0] && (
                  <div className="aspect-video relative">
                    <img
                      src={formData.images[0]}
                      alt={formData.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4 px-3 py-1 bg-emerald-500 rounded-full text-sm font-medium flex items-center gap-1">
                      <Sparkles className="w-4 h-4" />
                      New Listing
                    </div>
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{formData.title}</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">
                      {formData.category}
                    </span>
                    <span className="px-2 py-1 bg-slate-700 rounded text-sm capitalize">
                      {formData.condition.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm line-clamp-3 mb-4">{formData.description}</p>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    <div>
                      <p className="text-sm text-gray-400">Starting Price</p>
                      <p className="text-2xl font-bold text-purple-400">
                        ${formData.startingPrice.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Duration</p>
                      <p className="text-lg font-medium">
                        {durations.find(d => d.value === formData.duration)?.label}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features List */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm">{formData.images.length} photos uploaded</span>
                </div>
                {formData.reservePrice > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm">Reserve price set</span>
                  </div>
                )}
                {formData.enableAntiSnipe && (
                  <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <Shield className="w-5 h-5 text-purple-400" />
                    <span className="text-sm">Anti-snipe protection</span>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm">Max-Heap powered bidding</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex items-center gap-2 px-6 py-3 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 rounded-xl font-semibold transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Gavel className="w-5 h-5" />
                  Launch Auction
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
