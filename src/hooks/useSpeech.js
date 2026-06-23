import { useRef, useCallback, useState } from 'react';

const TTS_PREF_KEY = 'crescendo-tts-pref';

function getTTSPref() {
  try {
    return JSON.parse(localStorage.getItem(TTS_PREF_KEY)) || {};
  } catch { return {}; }
}

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef(null);

  const speak = useCallback((text, options = {}) => {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const pref = getTTSPref();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? pref.rate ?? 0.9;
      utterance.pitch = options.pitch ?? 1;
      utterance.volume = options.volume ?? 1;
      if (options.voice) {
        utterance.voice = options.voice;
      } else if (pref.voiceName) {
        const match = window.speechSynthesis.getVoices()
          .find(v => v.name === pref.voiceName && v.lang === pref.lang);
        if (match) utterance.voice = match;
      }
      if (options.lang) {
        utterance.lang = options.lang;
      } else if (pref.lang) {
        utterance.lang = pref.lang;
      }
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => { setIsSpeaking(false); setIsPaused(false); resolve(); };
      utterance.onerror = () => { setIsSpeaking(false); setIsPaused(false); resolve(); };
      utterance.onpause = () => setIsPaused(true);
      utterance.onresume = () => setIsPaused(false);
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, []);

  const getVoices = useCallback(() => {
    return window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
  }, []);

  const getDefaultVoice = useCallback(() => {
    const voices = getVoices();
    return voices.find(v => v.lang === 'en-GB' && v.name.includes('Female'))
      || voices.find(v => v.lang === 'en-GB')
      || voices[0];
  }, [getVoices]);

  return { speak, stop, pause, resume, isSpeaking, isPaused, getVoices, getDefaultVoice };
}
