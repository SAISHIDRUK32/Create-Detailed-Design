import { Shield, ShieldCheck, ShieldAlert, Star } from 'lucide-react';
import { User } from '../data/mockData';

interface UserBadgeProps {
  user: User;
  showRating?: boolean;
}

export function UserBadge({ user, showRating = true }: UserBadgeProps) {
  const getVerificationIcon = () => {
    switch (user.verification_status) {
      case 'verified':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'pending':
        return <Shield className="w-4 h-4 text-yellow-400" />;
      case 'unverified':
        return <ShieldAlert className="w-4 h-4 text-gray-400" />;
    }
  };

  const getVerificationLabel = () => {
    switch (user.verification_status) {
      case 'verified':
        return 'Verified Seller';
      case 'pending':
        return 'Verification Pending';
      case 'unverified':
        return 'Not Verified';
    }
  };

  const getVerificationColor = () => {
    switch (user.verification_status) {
      case 'verified':
        return 'border-emerald-500/50 bg-emerald-500/10';
      case 'pending':
        return 'border-yellow-500/50 bg-yellow-500/10';
      case 'unverified':
        return 'border-gray-500/50 bg-gray-500/10';
    }
  };

  return (
    <div className={`backdrop-blur-xl rounded-xl p-4 border ${getVerificationColor()}`}>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-bold">{user.name.charAt(0)}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white truncate">{user.name}</h4>
          
          <div className="flex items-center gap-2 mt-1">
            {getVerificationIcon()}
            <span className="text-xs text-gray-400">{getVerificationLabel()}</span>
          </div>

          {showRating && (
            <div className="flex items-center gap-1 mt-2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{user.rating.toFixed(1)}</span>
              <span className="text-xs text-gray-400 ml-1">rating</span>
            </div>
          )}
        </div>
      </div>

      {user.verification_status === 'verified' && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-xs text-gray-400">
            Identity verified • Trusted by 500+ buyers
          </p>
        </div>
      )}
    </div>
  );
}
