import { useCallback, useEffect, useRef, useState } from "react";

type RecognitionResultLike = {
  readonly isFinal: boolean;
  readonly 0: { transcript: string };
};

type RecognitionEventLike = {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    readonly [index: number]: RecognitionResultLike;
  };
};

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type RecognitionConstructor = new () => RecognitionLike;

function recognitionConstructor(): RecognitionConstructor | undefined {
  const speechWindow = window as Window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

export default function useSpeech(language: string) {
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const speechRecognitionSupported = Boolean(recognitionConstructor());
  const speechSynthesisSupported = "speechSynthesis" in window;

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const startListening = useCallback(
    (onTranscript?: (text: string, final: boolean) => void) => {
      const Constructor = recognitionConstructor();
      if (!Constructor) return;
      stopListening();
      const recognition = new Constructor();
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let combined = "";
        let final = false;
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          combined += event.results[index][0].transcript;
          final ||= event.results[index].isFinal;
        }
        const nextTranscript = combined.trim();
        setTranscript(nextTranscript);
        onTranscript?.(nextTranscript, final);
      };
      recognition.onend = () => setListening(false);
      recognition.onerror = () => setListening(false);
      recognition.start();
      recognitionRef.current = recognition;
      setTranscript("");
      setListening(true);
    },
    [language, stopListening],
  );

  const stopSpeaking = useCallback(() => {
    if (speechSynthesisSupported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [speechSynthesisSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!speechSynthesisSupported || !text.trim()) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 0.95;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [language, speechSynthesisSupported],
  );

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    },
    [],
  );

  return {
    listening,
    speaking,
    transcript,
    speechRecognitionSupported,
    speechSynthesisSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
