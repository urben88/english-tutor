import { useMemo, useState } from "react";
import { createApi, type TutorApi } from "./api/client";
import { createBrowserMic, type Mic } from "./audio/mic";
import { createBrowserPlayer, type Player } from "./audio/player";
import { createBrowserRecorder, type Recorder } from "./audio/recorder";
import { Button } from "./components/atoms/Button";
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

/** Container: wires the API, audio and state hooks to the presentational components. */
export function App(props: Props) {
  const api = useMemo(() => props.api ?? createApi(), [props.api]);
  const recorder = useMemo(() => props.recorder ?? createBrowserRecorder(), [props.recorder]);
  const mic = useMemo(() => props.mic ?? createBrowserMic(), [props.mic]);
  const player = useMemo(() => props.player ?? createBrowserPlayer(), [props.player]);

  const tutor = useTutor(api, player);
  const explain = useExplain(api);
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
          <CharacterStage state={toCharacterState(status)} />
          <Subtitles messages={tutor.messages} onExplain={explain.explain} />
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
        <StudyPanel items={[]}>
          <ExplanationPanel state={explain.state} onClose={explain.close} />
        </StudyPanel>
      </main>
      {transcriptOpen && (
        <TranscriptDrawer messages={tutor.messages} onExplain={explain.explain} onClose={closeTranscript} />
      )}
      <MobileTabs area={area} onChange={setArea} />
    </div>
  );
}
