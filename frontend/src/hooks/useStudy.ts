import { useCallback, useEffect, useState } from "react";
import type { TutorApi } from "../api/client";
import type { Explanation, Id, Message, StudyDraft, StudyItem, StudyTarget } from "../api/types";

/** Playback speed of the "slow" pronunciation buttons. */
export const SLOW = 0.7;

export const itemTarget = (i: StudyItem): StudyTarget => ({
  text: i.text,
  context: i.source_text,
  source: { messageId: i.message_id, sessionId: i.session_id },
});

const toDraft = (t: StudyTarget): StudyDraft => ({
  text: t.text,
  source_text: t.context,
  session_id: t.source.sessionId,
  message_id: t.source.messageId,
});

/** Studied words (saved by the backend) and the word the user is currently looking at. */
export function useStudy(api: TutorApi, speak: (text: string, speed?: number) => Promise<void>) {
  const [items, setItems] = useState<StudyItem[]>([]);
  const [focus, setFocus] = useState<StudyTarget | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .listStudy()
      .then((list) => alive && setItems(list))
      .catch(() => undefined); // the list is optional: speech and explanations still work
    return () => {
      alive = false;
    };
  }, [api]);

  const save = useCallback(
    async (draft: StudyDraft) => {
      try {
        const saved = await api.saveStudy(draft);
        setItems((prev) => [saved, ...prev.filter((i) => i.id !== saved.id)]);
      } catch {
        /* not being able to save must not interrupt studying */
      }
    },
    [api],
  );

  /** Click on a word or phrase of a message: say it, remember it, keep it as the current word. */
  const listen = useCallback(
    (text: string, message: Message, sessionId: Id | null) => {
      const target: StudyTarget = {
        text,
        context: message.content,
        source: { messageId: message.id, sessionId },
      };
      setFocus(target);
      void speak(text, 1);
      void save(toDraft(target));
    },
    [speak, save],
  );

  /** Say a word again (normal or slow) and count it. */
  const replay = useCallback(
    (target: StudyTarget, speed = 1) => {
      void speak(target.text, speed);
      void save(toDraft(target));
    },
    [speak, save],
  );

  /** Save an explanation together with its word. */
  const remember = useCallback(
    (target: StudyTarget, result: Explanation) =>
      save({
        ...toDraft(target),
        translation: result.translation,
        explanation: result.explanation,
        examples: result.examples,
      }),
    [save],
  );

  return { items, focus, setFocus, listen, replay, remember };
}
