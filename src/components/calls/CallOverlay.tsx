'use client';

import React from 'react';
import { useCall } from '@/context/CallContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X } from 'lucide-react';

export const CallOverlay = () => {
  const { isRinging, isCalling, activeCall, acceptCall, rejectCall, endCall } = useCall();

  if (!isRinging && !isCalling && !activeCall) return null;

  return (
    <AnimatePresence>
      {(isRinging || isCalling) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-6 right-6 z-[9999] w-80 bg-[#1f2c33] border border-[#374045] rounded-2xl shadow-2xl overflow-hidden p-6 text-white"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Avatar Placeholder */}
            <div className="w-20 h-20 bg-[#374045] rounded-full flex items-center justify-center border-2 border-[#bc9dff]/30">
              <span className="text-2xl font-bold text-[#bc9dff]">
                {activeCall?.caller?.name?.[0] || '?'}
              </span>
            </div>

            <div>
              <h3 className="text-lg font-semibold">{activeCall?.caller?.name || 'Incoming Call'}</h3>
              <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
                {isRinging ? 'Requesting Audio Call...' : 'Calling...'}
              </p>
            </div>

            <div className="flex items-center gap-4 mt-4">
              {isRinging ? (
                <>
                  <button
                    onClick={rejectCall}
                    className="p-4 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-lg"
                  >
                    <X size={24} />
                  </button>
                  <button
                    onClick={acceptCall}
                    className="p-4 bg-emerald-500/20 text-emerald-500 rounded-full hover:bg-emerald-500 hover:text-white transition-all shadow-lg animate-pulse"
                  >
                    <Phone size={24} />
                  </button>
                </>
              ) : (
                <button
                  onClick={endCall}
                  className="p-4 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg"
                >
                  <PhoneOff size={24} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
