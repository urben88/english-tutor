import { useEffect, useState } from "react";
import type { TutorApi } from "../../api/client";
import { MAX_CONTEXT, MIN_CONTEXT, type AnswerLength, type Settings } from "../../api/types";
import { Button } from "../atoms/Button";
import { Dialog } from "../atoms/Dialog";

interface Props {
  api: TutorApi;
  onClose: () => void;
}

const LENGTHS: { value: AnswerLength; label: string; hint: string }[] = [
  { value: "short", label: "Short", hint: "One short sentence" },
  { value: "medium", label: "Medium", hint: "The tutor's usual answer" },
  { value: "long", label: "Long", hint: "A short paragraph" },
];

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

/** Answer length and context budget, saved on the server and applied from the next turn. */
export default function SettingsDialog({ api, onClose }: Props) {
  const [loaded, setLoaded] = useState<Settings | null>(null);
  const [length, setLength] = useState<AnswerLength>("medium");
  const [auto, setAuto] = useState(true);
  const [context, setContext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .getSettings()
      .then((s) => {
        if (!alive) return;
        setLoaded(s);
        setLength(s.answer_length);
        setAuto(s.context_tokens === 0);
        setContext(s.context_tokens === 0 ? "" : String(s.context_tokens));
      })
      .catch((e: unknown) => alive && setError(errMsg(e)));
    return () => {
      alive = false;
    };
  }, [api]);

  const save = async () => {
    let tokens = 0;
    if (!auto) {
      tokens = Number(context);
      if (context.trim() === "" || !Number.isInteger(tokens) || tokens < MIN_CONTEXT || tokens > MAX_CONTEXT)
        return setError(`The context budget must be a whole number from ${MIN_CONTEXT} to ${MAX_CONTEXT}.`);
    }
    setSaving(true);
    setError(null);
    try {
      await api.saveSettings({ answer_length: length, context_tokens: tokens });
      onClose();
    } catch (e) {
      setError(errMsg(e));
      setSaving(false);
    }
  };

  const alert = error && (
    <p role="alert" className="error">
      {error}
    </p>
  );

  return (
    <Dialog title="Settings" onClose={onClose}>
      {loaded === null ? (
        <>
          {error ? alert : (
            <p role="status" className="muted">
              Loading…
            </p>
          )}
          <div className="dialog-actions">
            <Button onClick={onClose}>Close</Button>
          </div>
        </>
      ) : (
        <form
          className="dialog-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <fieldset className="field-group">
            <legend>Answer length</legend>
            {LENGTHS.map((o) => (
              <div key={o.value} className="choice">
                <label>
                  <input type="radio" name="answer-length" checked={length === o.value} onChange={() => setLength(o.value)} />
                  <span>{o.label}</span>
                </label>
                <small className="muted">{o.hint}</small>
              </div>
            ))}
          </fieldset>
          <fieldset className="field-group">
            <legend>Context budget</legend>
            <div className="choice">
              <label>
                <input type="radio" name="context-mode" checked={auto} onChange={() => setAuto(true)} />
                <span>Automatic</span>
              </label>
              <small className="muted">Use the whole model window</small>
            </div>
            <div className="choice">
              <label>
                <input type="radio" name="context-mode" checked={!auto} onChange={() => setAuto(false)} />
                <span>Custom</span>
              </label>
            </div>
            <label className="field">
              <span>
                Context tokens ({MIN_CONTEXT}–{MAX_CONTEXT})
              </span>
              <input
                type="number"
                min={MIN_CONTEXT}
                max={MAX_CONTEXT}
                step={1}
                value={context}
                disabled={auto}
                onChange={(e) => setContext(e.target.value)}
              />
            </label>
          </fieldset>
          {alert}
          <div className="dialog-actions">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" className="btn-on" disabled={saving}>
              Save
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
