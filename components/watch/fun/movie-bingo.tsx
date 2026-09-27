"use client";
import type { FunState } from "@/lib/fun/types";
import type { RunFun } from "./little-moments";

const CHOICES = [
  ["Romantic", "❤️"],
  ["Funny", "😂"],
  ["Sad", "😢"],
  ["Shocking", "😮"],
  ["Tense", "😬"],
] as const;
export function MovieBingo({
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
  const round = state.round?.kind === "bingo" ? state.round : null;
  const mine = round?.users.includes(userId);
  const scores = state.bingo_scores || {};
  const people = [
    ...new Set([userId, buddy, ...Object.keys(scores)].filter(Boolean)),
  ];
  const unfinished =
    state.round &&
    (!state.round.answers ||
      (state.round.kind === "bingo" && !state.round.winner));
  return (
    <section className="shared-round fun-stack" aria-label="Movie Bingo">
      <div>
        <span className="overline">A little friendly competition</span>
        <h3>Movie Bingo</h3>
        <p className="fun-help">
          Pause a scene. Both pick what describes it best. Agree on the winning
          answer together—each matching pick earns 1 point.
        </p>
      </div>
      <div className="answer-reveal" aria-label="Bingo scoreboard">
        {people.map((id) => (
          <blockquote key={id}>
            <span>{name(id)}</span>
            <p>
              {scores[id] || 0} {scores[id] === 1 ? "point" : "points"}
            </p>
          </blockquote>
        ))}
      </div>
      {!round ? (
        <>
          <button
            type="button"
            className="button button-primary"
            disabled={!buddy || !!unfinished}
            onClick={() =>
              void run("round_start", {
                kind: "bingo",
                other: buddy,
                text: "What best describes the scene we just watched?",
              })
            }
          >
            Pause & pick
          </button>
          <p className="fun-help">
            {!buddy
              ? "Your person needs to join before you can play."
              : unfinished
                ? "Finish or cancel your current activity first."
                : "This pauses the movie for both of you. Your first picks stay secret until both are locked in."}
          </p>
        </>
      ) : (
        <>
          <h4>{round.prompt}</h4>
          {!round.answers ? (
            mine ? (
              round.submitted.includes(userId) ? (
                <p role="status">
                  Your pick is locked. Waiting for your person…
                </p>
              ) : (
                <>
                  <p className="fun-help">
                    Choose your private answer. Tapping locks it in.
                  </p>
                  <div className="fun-button-row">
                    {CHOICES.map(([text, emoji]) => (
                      <button
                        key={text}
                        type="button"
                        className="button button-secondary"
                        onClick={() =>
                          void run("round_answer", { id: round.id, text })
                        }
                      >
                        Pick {emoji} {text}
                      </button>
                    ))}
                  </div>
                </>
              )
            ) : (
              <p>This round is for {round.users.map(name).join(" and ")}.</p>
            )
          ) : (
            <>
              <div className="answer-reveal" aria-label="Bingo picks">
                {Object.entries(round.answers).map(([id, text]) => (
                  <blockquote key={id}>
                    <span>{name(id)} picked</span>
                    <p>{text}</p>
                  </blockquote>
                ))}
              </div>
              {round.winner ? (
                <div role="status">
                  <h4>You agreed: {round.winner}</h4>
                  {round.users.map((id) => (
                    <p key={id}>
                      {name(id)}:{" "}
                      {round.answers![id] === round.winner
                        ? "+1 point 🎉"
                        : "No point this round"}
                    </p>
                  ))}
                  <p className="fun-help">
                    Points saved. Press play when you’re ready to keep watching.
                  </p>
                </div>
              ) : (
                <>
                  <p>
                    Talk it over, then each accept the description that fits
                    best.
                  </p>
                  {mine && (
                    <div className="fun-button-row">
                      {CHOICES.map(([text, emoji]) => (
                        <button
                          key={text}
                          type="button"
                          className="button button-secondary"
                          aria-pressed={round.accepted?.[userId] === text}
                          onClick={() =>
                            void run("bingo_accept", { id: round.id, text })
                          }
                        >
                          Accept {emoji} {text}
                        </button>
                      ))}
                    </div>
                  )}
                  <div role="status">
                    {round.users.map((id) => (
                      <p key={id}>
                        {name(id)}:{" "}
                        {round.accepted?.[id]
                          ? `accepted ${round.accepted[id]}`
                          : "still deciding"}
                      </p>
                    ))}
                  </div>
                  <p className="fun-help">
                    Both must accept the same answer before points are awarded.
                    You can change your acceptance while you disagree, or skip
                    with no points. If both original picks match, you both
                    score.
                  </p>
                </>
              )}
            </>
          )}
          {mine && (
            <button
              type="button"
              className="text-button"
              onClick={() => void run("round_cancel")}
            >
              {round.winner ? "Finish round" : "Skip round · no points"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
