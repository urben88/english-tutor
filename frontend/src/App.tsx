import { useEffect, useMemo, useRef, useState } from "react";
import { ConversationalAssistantView, supportsWebGL } from "../../3d/conversational-assistant/src/react";
import type { ConversationalAssistant, ElementConfig } from "../../3d/conversational-assistant/src/types";
import assistantConfig from "../../3d/conversational-assistant/config/element.config.json";
import assistantModelUrl from "../../3d/conversational-assistant/assets/models/conversational-assistant.glb?url";
import { createApi, type TutorApi } from "./api/client";
import type { Id, StudyItem } from "./api/types";
import { createBrowserMic, type Mic } from "./audio/mic";
import { createBrowserPlayer, type Player } from "./audio/player";
import { createBrowserRecorder, type Recorder } from "./audio/recorder";
import { Button } from "./components/atoms/Button";
import type { MessageActions } from "./components/molecules/MessageBubble";
import { MobileTabs, type Area } from "./components/molecules/MobileTabs";
import { ModeSwitch } from "./components/molecules/ModeSwitch";
import { SessionSwitcher } from "./components/molecules/SessionSwitcher";
import { Subtitles } from "./components/molecules/Subtitles";
import { CharacterStage, toCharacterState } from "./components/organisms/CharacterStage";
import { Controls } from "./components/organisms/Controls";
import { ExplanationPanel } from "./components/organisms/ExplanationPanel";
import { StudyPanel } from "./components/organisms/StudyPanel";
import { TranscriptDrawer } from "./components/organisms/TranscriptDrawer";
import { useDrawer } from "./hooks/useDrawer";
import { useExplain } from "./hooks/useExplain";
import { itemTarget, useStudy } from "./hooks/useStudy";
import type { VoiceStatus } from "./components/molecules/StatusIndicator";
import { useHandsFree } from "./hooks/useHandsFree";
import { useHoldToTalk } from "./hooks/useHoldToTalk";
import { useMute } from "./hooks/useMute";
import { useVoiceMode } from "./hooks/useVoiceMode";
import { useTutor } from "./hooks/useTutor";

interface Props {
  api?: TutorApi;
  recorder?: Recorder;
  mic?: Mic;
  player?: Player;
}

const avatarConfig = assistantConfig as unknown as ElementConfig; // module scope: stable reference, no remounts

/** Container: wires the API, audio and state hooks to the presentational components. */
export function App(props: Props) {
  const avatar = useRef<ConversationalAssistant | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const api = useMemo(() => props.api ?? createApi(), [props.api]);
  const recorder = useMemo(() => props.recorder ?? createBrowserRecorder(), [props.recorder]);
  const mic = useMemo(() => props.mic ?? createBrowserMic(), [props.mic]);
  const player = useMemo(
    () => props.player ?? createBrowserPlayer((audio) => void avatar.current?.speak({ audio })),
    [props.player],
  );

  const tutor = useTutor(api, player);
  const study = useStudy(api, tutor.speak);
  const explain = useExplain(api, study.remember);
  const [highlight, setHighlight] = useState<Id | null>(null);
  const { mode, setMode } = useVoiceMode();
  const { muted, toggle: toggleMute } = useMute();
  const drawer = useDrawer();
  const [area, setArea] = useState<Area>("tutor");
  const handsFreeMode = mode === "hands-free";
  const talk = useHoldToTalk({
    recorder,
    onAudio: tutor.sendVoice,
    onError: tutor.setError,
    disabled: !tutor.ready || tutor.busy || muted || handsFreeMode,
  });
  const free = useHandsFree({
    mic,
    enabled: handsFreeMode,
    muted,
    paused: !tutor.ready || tutor.busy || tutor.speaking,
    onAudio: tutor.sendVoice,
    onError: tutor.setError,
  });

  const status: VoiceStatus = muted
    ? "muted"
    : tutor.speaking
      ? "speaking"
      : tutor.busy || free.processing || talk.state === "thinking"
        ? "thinking"
        : free.hearing || talk.state === "listening"
          ? "hearing"
          : handsFreeMode && !free.micError
            ? "listening"
            : "idle";

  useEffect(() => {
    if (highlight === null) return;
    const t = setTimeout(() => setHighlight(null), 4000);
    return () => clearTimeout(t);
  }, [highlight]);

  const actions: MessageActions = {
    onListen: (text, message) => {
      explain.close();
      study.listen(text, message, tutor.sessionId);
    },
    onExplain: (text, message, simpler = false) => {
      void explain.explain(
        { text, context: message.content, source: { messageId: message.id, sessionId: tutor.sessionId } },
        simpler,
      );
    },
    onReadAgain: (message) => void tutor.speak(message.content),
  };

  /** Study list -> original message: open its session if needed, then the transcript on that message. */
  const jumpTo = async (item: StudyItem) => {
    if (item.message_id === null) return;
    if (item.session_id !== null && String(item.session_id) !== String(tutor.sessionId))
      await tutor.openSession(item.session_id);
    if (area === "study") setArea("tutor");
    drawer.show();
    setHighlight(item.message_id);
  };

  const transcriptOpen = drawer.open || area === "talk";
  const closeTranscript = () => {
    drawer.close();
    if (area === "talk") setArea("tutor");
  };

  return (
    <div className="app" data-area={area}>
      <header className="top">
        <h1>English Tutor</h1>
        <Button className="transcript-btn" aria-expanded={transcriptOpen} onClick={drawer.toggle}>
          Transcript (T)
        </Button>
        <SessionSwitcher
          sessions={tutor.sessions}
          current={tutor.sessionId}
          onSelect={tutor.openSession}
          onNew={tutor.newSession}
        />
        <ModeSwitch mode={mode} onChange={setMode} />
      </header>
      {tutor.error && (
        <p role="alert" className="error banner">
          {tutor.error}
        </p>
      )}
      <main className="main">
        <section className="center">
          <CharacterStage state={toCharacterState(status)}>
            {!avatarFailed && supportsWebGL() ? (
              <ConversationalAssistantView
                ref={avatar}
                config={avatarConfig}
                modelUrl={assistantModelUrl}
                state={toCharacterState(status)}
                onError={() => setAvatarFailed(true)}
              />
            ) : undefined}
          </CharacterStage>
          <Subtitles messages={tutor.messages} {...actions} />
        </section>
        <div className="dock">
          <Controls
            mode={mode}
            status={status}
            level={free.level}
            muted={muted}
            canStop={tutor.speaking}
            micError={handsFreeMode ? free.micError : null}
            talkState={talk.state}
            disabled={!tutor.ready || tutor.busy}
            onToggleMute={toggleMute}
            onStop={tutor.stopSpeaking}
            onPress={talk.press}
            onRelease={talk.release}
            onSendText={tutor.sendText}
          />
        </div>
        <StudyPanel
          items={study.items}
          onPlay={(item, speed) => study.replay(itemTarget(item), speed)}
          onExplain={(item) => void explain.explain(itemTarget(item))}
          onJump={(item) => void jumpTo(item)}
        >
          <ExplanationPanel
            state={explain.state}
            focus={study.focus}
            onPlay={study.replay}
            onExplain={(target, simpler) => void explain.explain(target, simpler)}
            onClose={() => {
              explain.close();
              study.setFocus(null);
            }}
          />
        </StudyPanel>
      </main>
      {transcriptOpen && (
        <TranscriptDrawer messages={tutor.messages} highlightId={highlight} onClose={closeTranscript} {...actions} />
      )}
      <MobileTabs area={area} onChange={setArea} />
    </div>
  );
}
