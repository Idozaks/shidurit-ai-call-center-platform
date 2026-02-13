import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SEND_SAMPLE_RATE = 16000;
const RECEIVE_SAMPLE_RATE = 24000;
const MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

function float32ToInt16(float32Array) {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16;
}

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default function VoiceChat({ tenant, themeColor, onTranscript }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const playbackContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const setupCompleteRef = useRef(false);

  const playAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;
    setIsAiSpeaking(true);

    while (audioQueueRef.current.length > 0) {
      const pcmData = audioQueueRef.current.shift();
      if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
        playbackContextRef.current = new AudioContext({ sampleRate: RECEIVE_SAMPLE_RATE });
      }
      const ctx = playbackContextRef.current;
      const int16 = new Int16Array(pcmData);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }
      const buffer = ctx.createBuffer(1, float32.length, RECEIVE_SAMPLE_RATE);
      buffer.getChannelData(0).set(float32);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      
      await new Promise(resolve => {
        source.onended = resolve;
        source.start();
      });
    }

    isPlayingRef.current = false;
    setIsAiSpeaking(false);
  }, []);

  const startVoiceChat = useCallback(async () => {
    setIsConnecting(true);
    setupCompleteRef.current = false;
    
    try {
      const response = await fetch('/api/getGeminiToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: tenant?.system_prompt || '',
          persona_name: tenant?.ai_persona_name || 'נועה',
          company_name: tenant?.company_name || '',
        })
      });
      if (!response.ok) throw new Error('Failed to get token');
      const { apiKey, model } = await response.json();

      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected, sending setup");
        const setupMsg = {
          setup: {
            model: `models/${model}`,
            generation_config: {
              response_modalities: ["AUDIO"],
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name: tenant?.ai_voice || "Kore"
                  }
                }
              }
            },
            system_instruction: {
              parts: [{
                text: `אתה ${tenant?.ai_persona_name || 'נועה'}, נציג/ת שירות לקוחות של ${tenant?.company_name || 'העסק'}. ${tenant?.system_prompt || ''} דבר בעברית בצורה ידידותית ומקצועית. היה תמציתי וענייני.`
              }]
            },
            realtime_input_config: {
              automatic_activity_detection: {
                disabled: false,
                start_of_speech_sensitivity: "START_SENSITIVITY_HIGH",
                end_of_speech_sensitivity: "END_SENSITIVITY_HIGH",
              }
            },
            input_audio_transcription: {},
            output_audio_transcription: {},
          }
        };
        ws.send(JSON.stringify(setupMsg));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.setupComplete) {
          console.log("Setup complete!");
          setupCompleteRef.current = true;
          setIsConnected(true);
          setIsConnecting(false);
          startMicCapture();
          return;
        }

        if (data.serverContent) {
          const sc = data.serverContent;
          
          if (sc.modelTurn && sc.modelTurn.parts) {
            for (const part of sc.modelTurn.parts) {
              if (part.inlineData && part.inlineData.mimeType?.includes('audio')) {
                const pcmBuffer = base64ToArrayBuffer(part.inlineData.data);
                audioQueueRef.current.push(pcmBuffer);
                playAudioQueue();
              }
              if (part.text) {
                onTranscript?.('assistant', part.text);
              }
            }
          }

          if (sc.interrupted) {
            audioQueueRef.current = [];
            isPlayingRef.current = false;
            setIsAiSpeaking(false);
          }
        }

        if (data.serverContent?.outputTranscription?.text) {
          onTranscript?.('assistant_transcript', data.serverContent.outputTranscription.text);
        }

        if (data.serverContent?.inputTranscription?.text) {
          onTranscript?.('user_transcript', data.serverContent.inputTranscription.text);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setIsConnecting(false);
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        setIsConnected(false);
        setIsConnecting(false);
        cleanupAudio();
      };
    } catch (err) {
      console.error("Failed to start voice chat:", err);
      setIsConnecting(false);
    }
  }, [tenant, playAudioQueue, onTranscript]);

  const startMicCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SEND_SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: SEND_SAMPLE_RATE });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !setupCompleteRef.current || isMuted) return;
        
        const float32 = e.inputBuffer.getChannelData(0);
        const int16 = float32ToInt16(float32);
        const base64 = arrayBufferToBase64(int16.buffer);

        const msg = {
          realtimeInput: {
            mediaChunks: [{
              mimeType: "audio/pcm;rate=16000",
              data: base64
            }]
          }
        };
        wsRef.current.send(JSON.stringify(msg));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
    } catch (err) {
      console.error("Mic capture error:", err);
    }
  }, [isMuted]);

  const cleanupAudio = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') {
      playbackContextRef.current.close();
      playbackContextRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  const stopVoiceChat = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    cleanupAudio();
    setIsConnected(false);
    setIsAiSpeaking(false);
  }, [cleanupAudio]);

  useEffect(() => {
    return () => {
      stopVoiceChat();
    };
  }, [stopVoiceChat]);

  return (
    <div className="flex flex-col items-center gap-4">
      <AnimatePresence mode="wait">
        {isAiSpeaking && (
          <motion.div
            key="speaking"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border shadow-sm"
          >
            <div className="flex gap-1 items-end h-5">
              {[0, 1, 2, 3, 4].map(i => (
                <motion.div
                  key={i}
                  className="w-1 rounded-full"
                  style={{ backgroundColor: themeColor }}
                  animate={{ height: [8, 20, 8] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </div>
            <span className="text-sm text-slate-600">{tenant?.ai_persona_name || 'נועה'} מדברת...</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        {!isConnected ? (
          <Button
            onClick={startVoiceChat}
            disabled={isConnecting}
            className="h-16 w-16 rounded-full shadow-lg"
            style={{ backgroundColor: themeColor }}
          >
            {isConnecting ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : (
              <Phone className="w-7 h-7" />
            )}
          </Button>
        ) : (
          <>
            <Button
              onClick={() => setIsMuted(!isMuted)}
              variant="outline"
              className="h-14 w-14 rounded-full"
            >
              {isMuted ? <MicOff className="w-6 h-6 text-red-500" /> : <Mic className="w-6 h-6" />}
            </Button>
            <Button
              onClick={stopVoiceChat}
              className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </>
        )}
      </div>

      {!isConnected && !isConnecting && (
        <p className="text-sm text-slate-500">לחץ להתחלת שיחה קולית</p>
      )}
      {isConnecting && (
        <p className="text-sm text-slate-500">מתחבר...</p>
      )}
      {isConnected && (
        <p className="text-sm text-green-600">מחובר - דבר עכשיו</p>
      )}
    </div>
  );
}