import React, { useMemo } from 'react';
import { checkAnswer } from '../utils/answerChecking';

export default function MarkedScriptView({ passageHtml, questions, userAnswers }) {
  if (!passageHtml || !questions?.length) return null;

  const answerMap = useMemo(() => userAnswers || {}, [userAnswers]);

  const { items, totalContentParas } = useMemo(() => {
    try {
      const temp = document.createElement('div');
      temp.innerHTML = passageHtml;
      let paraCount = 0;
      const parsed = Array.from(temp.children)
        .filter(el => el.tagName === 'P' || el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'BLOCKQUOTE')
        .map(el => {
          const isP = el.tagName === 'P';
          if (isP) paraCount++;
          return {
            html: el.innerHTML,
            tagName: el.tagName,
            isContent: isP,
            paraNum: isP ? paraCount : null,
          };
        });
      return { items: parsed, totalContentParas: paraCount };
    } catch {
      return { items: [], totalContentParas: 0 };
    }
  }, [passageHtml]);

  if (items.length === 0) return null;

  const { questionMap } = useMemo(() => {
    const map = {};
    const qLen = questions.length;
    let globalNum = 0;

    for (let i = 0; i < qLen; i++) {
      const q = questions[i];
      let ref = q.paragraphRef;

      if (ref === null || ref === undefined || typeof ref !== 'number' || ref < 1 || ref > totalContentParas) {
        const perPara = Math.max(1, Math.floor(qLen / Math.max(1, totalContentParas)));
        ref = Math.ceil((i + 1) / perPara);
        if (ref < 1) ref = 1;
        if (ref > totalContentParas) ref = totalContentParas;
      }

      if (!map[ref]) map[ref] = [];
      const result = checkAnswer(q, answerMap[q.id]);
      globalNum++;
      map[ref].push({ ...q, result, questionNumber: globalNum });
    }

    return { questionMap: map };
  }, [questions, answerMap, totalContentParas]);

  const totalCorrect = useMemo(() => {
    let correct = 0;
    for (const q of questions) {
      const result = checkAnswer(q, answerMap[q.id]);
      if (result.correct) correct++;
    }
    return correct;
  }, [questions, answerMap]);

  if (totalCorrect === questions.length) {
    return (
      <div className="marked-script">
        <div className="marked-script__empty">
          No errors to review
        </div>
      </div>
    );
  }

  return (
    <div className="marked-script">
      {items.map((item, i) => {
        const annotations = item.isContent ? (questionMap[item.paraNum] || []) : [];

        return (
          <div key={i} className={`marked-script__para${annotations.length > 0 ? ' marked-script__para--has-errors' : ''}`}>
            <div className="marked-script__text">
              {item.tagName === 'P' ? (
                <p dangerouslySetInnerHTML={{ __html: item.html }} />
              ) : (
                React.createElement(item.tagName.toLowerCase(), { dangerouslySetInnerHTML: { __html: item.html } })
              )}
            </div>
            {annotations.map((q, qi) => {
              const isCorrect = q.result.correct;
              const isPartial = !q.result.correct && q.result.marksEarned > 0;
              const modClass = isCorrect
                ? 'marked-script__annotation--correct'
                : isPartial
                  ? 'marked-script__annotation--partial'
                  : 'marked-script__annotation--wrong';

              const ua = answerMap[q.id];
              const displayAnswer = q.type === 'matching' && ua && typeof ua === 'object'
                ? Object.entries(ua).map(([k, v]) => `${k} \u2192 ${v}`).join(', ')
                : q.type === 'gap-fill' && q.answers && ua && typeof ua === 'object'
                  ? q.answers.map((a, idx) => `${idx + 1}. ${ua[idx] || '\u2014'}`).join(', ')
                  : ua && typeof ua === 'object' ? JSON.stringify(ua) : (ua || '\u2014');

              return (
                <div key={qi} className={`marked-script__annotation ${modClass}`}>
                  <span className="marked-script__annotation-marker" aria-label={isCorrect ? 'Correct' : 'Wrong'}>
                    {isCorrect ? '\u2713' : '\u2717'}
                  </span>
                  <span className="marked-script__annotation-text">
                    <strong>Q{q.questionNumber}.</strong> {q.stem}
                  </span>
                  <span className="marked-script__annotation-answer">
                    Your answer: <strong>{displayAnswer}</strong>
                    {!isCorrect && q.correctAnswer && (
                      <> | Correct: <strong style={{ color: 'var(--color-success)' }}>{q.correctAnswer}</strong></>
                    )}
                  </span>
                  {q.result.feedback && (
                    <span className="marked-script__annotation-feedback">{q.result.feedback}</span>
                  )}
                  {q.marks > 1 && (
                    <span className="marked-script__annotation-marks">
                      [{Math.round(q.result.marksEarned)}/{q.result.maxMarks}m]
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
