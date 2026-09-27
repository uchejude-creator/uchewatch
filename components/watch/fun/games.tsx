"use client";
import { useState } from "react";
import { ACTIVITIES, BINGO, hasBingo } from "@/lib/fun/catalog";
import type { FunState, RoundKind } from "@/lib/fun/types";
import type { RunFun } from "./little-moments";
export function Games({
  state,
  userId,
  buddy,
  name,
  run,
}: {
  state: FunState;
  userId: string;
  buddy: string;
  name: (id: string) => string;
  run: RunFun;
}) {
  const [answer, setAnswer] = useState(""),
    [lie, setLie] = useState("");
  const [statements, setStatements] = useState(["", "", ""]);
  const [kind, setKind] = useState<RoundKind>("compliment");
  const [custom, setCustom] = useState("");
  const round = state.round;
  const mine = round?.users.includes(userId);
  const submitted = round?.submitted.includes(userId);
  const selected = ACTIVITIES.find((a) => a.kind === kind)!;
  const marked = state.bingo[userId] || [];
  return (
    <div className="fun-stack">
      {round?.kind === "ready" && (
        <p className="fun-help">
          If Safari asks, tap the video once to enable playback before your
          countdown.
        </p>
      )}
      {round && (
        <section className="shared-round" aria-label="Our shared activity">
          <span className="overline">
            {ACTIVITIES.find((a) => a.kind === round.kind)?.title}
          </span>
          <h3>{round.prompt}</h3>
          <p className="fun-help">
            {round.users.map(name).join(" + ")} · {round.submitted.length}/2
            answers locked in
          </p>
          {round.answers ? (
            <div className="answer-reveal">
              {Object.entries(round.answers).map(([id, text]) => (
                <blockquote key={id}>
                  <span>{name(id)}</span>
                  <p>{text}</p>
                  {round.lies && (
                    <small>Statement {round.lies[id]} was the lie.</small>
                  )}
                </blockquote>
              ))}
              {round.kind === "truths" && mine && !round.lies && (
                <div>
                  <p>Which of your person’s statements is the lie?</p>
                  {round.guesses?.[userId] ? (
                    <p role="status">
                      Your guess is locked. Waiting for your person…
                    </p>
                  ) : (
                    <div className="fun-button-row">
                      {["1", "2", "3"].map((n) => (
                        <button
                          type="button"
                          className="button button-secondary"
                          key={n}
                          onClick={() =>
                            void run("truth_guess", { id: round.id, text: n })
                          }
                        >
                          Statement {n}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {round.lies &&
                round.users.map((id) => {
                  const other = round.users.find((u) => u !== id)!;
                  return (
                    <p key={id}>
                      {name(id)}{" "}
                      {round.guesses?.[id] === round.lies?.[other]
                        ? "guessed it! 🎉"
                        : "was fooled this time 🤭"}
                    </p>
                  );
                })}
              {round.kind === "prediction" && (
                <p className="fun-help">
                  Predictions revealed. Press play when you’re ready to find
                  out.
                </p>
              )}
            </div>
          ) : mine ? (
            submitted ? (
              <div className="fun-empty" role="status">
                Your answer is tucked away.
                <br />
                Waiting for{" "}
                {name(round.users.find((id) => id !== userId) || "")}…
              </div>
            ) : (
              <form
                className="fun-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    await run("round_answer", {
                      id: round.id,
                      text:
                        round.kind === "ready"
                          ? "Ready"
                          : round.kind === "truths"
                            ? statements
                                .map((text, i) => `${i + 1}. ${text.trim()}`)
                                .join("\n")
                            : answer,
                      lie,
                    })
                  ) {
                    setAnswer("");
                    setStatements(["", "", ""]);
                    setLie("");
                  }
                }}
              >
                {round.kind === "ready" ? (
                  <button className="button button-primary">
                    I’m ready too ♥
                  </button>
                ) : round.kind === "rating" ? (
                  <div className="fun-button-row">
                    {["❤️", "😂", "😮", "🔥", "😭"].map((emoji) => (
                      <button
                        type="button"
                        className="reaction-button"
                        aria-label={`Choose ${emoji}`}
                        key={emoji}
                        onClick={() =>
                          void run("round_answer", {
                            id: round.id,
                            text: emoji,
                          })
                        }
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    {round.kind === "truths" ? (
                      <>
                        <p className="fun-help">
                          Write one statement in each box: two true things about
                          you and one made-up thing. Then secretly choose the
                          lie.
                        </p>
                        {statements.map((statement, i) => (
                          <div className="fun-form" key={i}>
                            <label htmlFor={`truth-statement-${i}`}>
                              Statement {i + 1}
                            </label>
                            <input
                              id={`truth-statement-${i}`}
                              value={statement}
                              maxLength={75}
                              required
                              placeholder={
                                [
                                  "For example: I have missed a flight",
                                  "For example: I can swim",
                                  "For example: I have met a famous singer",
                                ][i]
                              }
                              onChange={(e) =>
                                setStatements((previous) =>
                                  previous.map((text, index) =>
                                    index === i ? e.target.value : text,
                                  ),
                                )
                              }
                            />
                          </div>
                        ))}
                        <label htmlFor="lie-number">
                          Which statement is your lie? (kept secret)
                        </label>
                        <select
                          id="lie-number"
                          value={lie}
                          required
                          onChange={(e) => setLie(e.target.value)}
                        >
                          <option value="" disabled>
                            Choose your made-up statement
                          </option>
                          {[1, 2, 3].map((n) => (
                            <option key={n} value={n}>
                              Statement {n}
                            </option>
                          ))}
                        </select>
                        <p className="fun-help">
                          After you both submit, read each other’s statements
                          and guess the lie. The correct answers reveal after
                          both guesses.
                        </p>
                      </>
                    ) : (
                      <>
                        <label htmlFor="secret-answer">
                          Your private answer
                        </label>
                        <textarea
                          id="secret-answer"
                          rows={3}
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          maxLength={300}
                          placeholder="Just between the two of you, until the reveal…"
                          required
                        />
                      </>
                    )}
                    <button
                      className="button button-primary"
                      disabled={
                        round.kind === "truths"
                          ? statements.some((text) => !text.trim()) || !lie
                          : !answer.trim()
                      }
                    >
                      {round.kind === "truths"
                        ? "Lock in my three statements"
                        : "Lock in my answer"}
                    </button>
                  </>
                )}
              </form>
            )
          ) : (
            <p className="fun-help">
              This round is for {round.users.map(name).join(" and ")}.
            </p>
          )}
          {mine && (
            <button
              type="button"
              className="text-button"
              onClick={() => void run("round_cancel")}
            >
              {round.answers ? "Close this round" : "Cancel this round"}
            </button>
          )}
        </section>
      )}
      <div>
        <h3 className="fun-label">Make a little moment</h3>
        <div className="activity-grid">
          {ACTIVITIES.map((a) => (
            <button
              type="button"
              key={a.kind}
              className="activity-choice"
              aria-pressed={kind === a.kind}
              onClick={() => {
                setKind(a.kind);
                setCustom("");
              }}
            >
              <span>{a.emoji}</span>
              <strong>{a.title}</strong>
              <small>{a.description}</small>
            </button>
          ))}
        </div>
      </div>
      <form
        className="fun-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setAnswer("");
          setStatements(["", "", ""]);
          setLie("");
          await run("round_start", {
            kind,
            other: buddy,
            text: custom.trim() || selected.prompt,
          });
        }}
      >
        {kind === "truths" ? (
          <p className="fun-help">
            Each of you writes three statements about yourself: two truths and
            one lie. Start the game to open your three boxes, then see if you
            can fool each other.
          </p>
        ) : (
          <>
            <label htmlFor="activity-prompt">Tonight’s question</label>
            <input
              id="activity-prompt"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              maxLength={180}
              placeholder={selected.prompt}
            />
          </>
        )}
        <button
          className="button button-primary"
          disabled={!buddy || !!(round && !round.answers)}
        >
          Start {selected.title.toLowerCase()}
        </button>
        {!buddy && (
          <p className="fun-help">
            Your person needs to join before a two-person activity can start.
          </p>
        )}
        <p className="fun-help">
          Your answers stay hidden until you both submit. Revealed answers are
          visible to this private room.
        </p>
      </form>
      <section aria-label="Movie bingo">
        <div className="fun-section-heading">
          <h3>Movie bingo</h3>
          <span>
            {hasBingo(marked) ? "Bingo! 🎉" : `${marked.length}/9 spotted`}
          </span>
        </div>
        <p className="fun-help">
          Spot a moment? Tap its square. Your person has their own card.
        </p>
        <div className="bingo-grid">
          {BINGO.map((text, i) => (
            <button
              type="button"
              key={text}
              aria-pressed={marked.includes(String(i))}
              onClick={() => void run("bingo", { id: String(i) })}
            >
              {marked.includes(String(i)) && <span aria-hidden="true">♥ </span>}
              {text}
            </button>
          ))}
        </div>
        {Object.entries(state.bingo)
          .filter(([id]) => id !== userId)
          .map(([id, card]) => (
            <p className="fun-help" key={id}>
              {name(id)}: {card.length}/9 {hasBingo(card) ? "· Bingo! 🎉" : ""}
            </p>
          ))}
      </section>
    </div>
  );
}
