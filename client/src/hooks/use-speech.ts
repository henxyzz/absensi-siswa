import { useState, useEffect, useCallback } from "react";

export type SpeechLanguage = "id" | "en" | "zh";

const SPEECH_ENABLED_KEY = "speech-enabled";
const SPEECH_LANGUAGE_KEY = "speech-language";

interface UseSpeechOptions {
  defaultLanguage?: SpeechLanguage;
}

interface UseSpeechReturn {
  isSpeechEnabled: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  language: SpeechLanguage;
  toggleSpeech: () => void;
  setLanguage: (lang: SpeechLanguage) => void;
  speak: (text: string, lang?: SpeechLanguage) => void;
  cancel: () => void;
  announce: (text: string, lang?: SpeechLanguage) => void;
}

const languageCodeMap: Record<SpeechLanguage, string> = {
  id: "id-ID",
  en: "en-US",
  zh: "zh-CN",
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function hasSpeechSupport(): boolean {
  return isBrowser() && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function useSpeech(options: UseSpeechOptions = {}): UseSpeechReturn {
  const { defaultLanguage = "id" } = options;
  
  const [isSpeechEnabled, setIsSpeechEnabled] = useState<boolean>(() => {
    if (!isBrowser()) return false;
    try {
      const stored = localStorage.getItem(SPEECH_ENABLED_KEY);
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  
  const [language, setLanguageState] = useState<SpeechLanguage>(() => {
    if (!isBrowser()) return defaultLanguage;
    try {
      const stored = localStorage.getItem(SPEECH_LANGUAGE_KEY);
      return (stored as SpeechLanguage) || defaultLanguage;
    } catch {
      return defaultLanguage;
    }
  });

  useEffect(() => {
    setIsSupported(hasSpeechSupport());
  }, []);

  useEffect(() => {
    if (isBrowser()) {
      try {
        localStorage.setItem(SPEECH_ENABLED_KEY, String(isSpeechEnabled));
      } catch {
      }
    }
  }, [isSpeechEnabled]);

  useEffect(() => {
    if (isBrowser()) {
      try {
        localStorage.setItem(SPEECH_LANGUAGE_KEY, language);
      } catch {
      }
    }
  }, [language]);

  useEffect(() => {
    return () => {
      if (hasSpeechSupport()) {
        try {
          window.speechSynthesis.cancel();
        } catch {
        }
      }
    };
  }, []);

  const toggleSpeech = useCallback(() => {
    setIsSpeechEnabled((prev) => {
      if (prev && hasSpeechSupport()) {
        try {
          window.speechSynthesis.cancel();
        } catch {
        }
        setIsSpeaking(false);
      }
      return !prev;
    });
  }, []);

  const setLanguage = useCallback((lang: SpeechLanguage) => {
    setLanguageState(lang);
  }, []);

  const cancel = useCallback(() => {
    if (hasSpeechSupport()) {
      try {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } catch {
      }
    }
  }, []);

  const speak = useCallback(
    (text: string, lang?: SpeechLanguage) => {
      if (!isSpeechEnabled || !hasSpeechSupport()) {
        return;
      }

      try {
        window.speechSynthesis.cancel();

        const utterance = new window.SpeechSynthesisUtterance(text);
        utterance.lang = languageCodeMap[lang || language];
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      } catch {
      }
    },
    [isSpeechEnabled, language]
  );

  const announce = useCallback(
    (text: string, lang?: SpeechLanguage) => {
      if (!isSpeechEnabled) return;
      speak(text, lang);
    },
    [isSpeechEnabled, speak]
  );

  return {
    isSpeechEnabled,
    isSpeaking,
    isSupported,
    language,
    toggleSpeech,
    setLanguage,
    speak,
    cancel,
    announce,
  };
}
