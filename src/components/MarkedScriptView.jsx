import React, { useMemo } from 'react';
import { checkAnswer } from '../utils/answerChecking';

export default function MarkedScriptView({ passageHtml, questions, userAnswers }) {
  if (!passageHtml || !questions?.length) return null;

  const answerMap = useMemo(() => userAnswers || {}, [userAnswers]);

  const paragraphs = useMemo(() => {
    try {
      const temp = document.createElement('div');
      temp.innerHTML = passageHtml;
      return Array.from(temp.children)
        .filter(el => el.tagName === 'P' || el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'BLOCKQUOTE')
        .map((el, i) => ({
          seqNum: i + 1,
          html: el.innerHTML,
          tagName: el.tagName,
        }));
    } catch {
      return [];
    }
  }, [passageHtml]);

  if (paragraphs.length === 0) return null;

  const totalParagraphs = paragraphs.length;

  // Group questions by paragraph and assign sequential global numbers
  const { questionMap, sortedQuestions } = useMemo(() => {
    const map = {};
    const qLen = questions.length;
    let globalNum = 0;

    // First pass: assign paragraph refs with sequential global numbering
    for (let i = 0; i < qLen; i++) {
      const q = questions[i];
      let ref = q.paragraphRef;

      if (ref === null || ref === undefined || typeof ref !== 'number' || ref < 1 || ref > totalParagraphs) {
        const perPara = Math.max(1, Math.floor(qLen / Math.max(1, totalParagraphs)));
        ref = Math.ceil((i + 1) / perPara);
        if (ref < 1) ref = 1;
        if (ref > totalParagraphs) ref = totalParagraphs;
      }

      if (!map[ref]) map[ref] = [];
      const result = checkAnswer(q, answerMap[q.id]);
      globalNum++;
      map[ref].push({ ...q, result, questionNumber: globalNum });
    }

    // Flatten all questions in reading order (by paragraph, then by position within paragraph)
    const flat = [];
    for (let p = 1; p <= totalParagraphs; p++) {
      if (map[p]) {
        for (const q of map[p]) {
          flat.push(q);
        }
      }
    }

    return { questionMap: map, sortedQuestions: flat };
  }, [questions, answerMap, totalParagraphs]);

  const totalCorrect = useMemo(() => {
    let correct = 0;
    for (const q of questions) {
      const result = checkAnswer(q, answerMap[q.id]);
      if (result.correct) correct++;
    }
    return correct;
  }, [questions, answerMap]);

  const allCorrect = totalCorrect === questions.length;

  if (allCorrect) {
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
      {paragraphs.map((para, i) => {
        const annotations = questionMap[para.seqNum];

        const wrongCount = (annotations || []).filter(
          a => !a.result.correct && answerMap[a.id] !== null && answerMap[a.id] !== undefined
        ).length;
        const partialCount = (annotations || []).filter(
          a => !a.result.correct && a.result.marksEarned > 0
        ).length;
        const hasErrors = wrongCount > 0 || partialCount > 0;

        return (
          <div
            key={i}
            className={`marked-script__para${hasErrors ? ' marked-script__para--has-errors' : ' marked-script__para--all-correct'}`}
          >
            <div className="marked-script__gutter">
              {(annotations || []).map((q, qi) => {
                const isCorrect = q.result.correct;
                const isPartial = !q.result.correct && q.result.marksEarned > 0;
                const modClass = isCorrect
                  ? 'marked-script__annotation--correct'
                  : isPartial
                    ? 'marked-script__annotation--partial'
                    : 'marked-script__annotation--wrong';

                return (
                  <div key={qi} className={`marked-script__annotation ${modClass}`}>
                    <span
                      className="marked-script__annotation-marker"
                      aria-label={isCorrect ? 'Correct' : 'Wrong'}
                    >
                      {isCorrect ? '\u2713' : '\u2717'}
                    </span>
                    <span className="marked-script__annotation-text">
                      Q{q.questionNumber} — {q.result.feedback}
                    </span>
                    {q.marks > 1 && (
                      <span className="marked-script__annotation-marks">
                        [{Math.round(q.result.marksEarned)}/{q.result.maxMarks}m]
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className={`marked-script__text${hasErrors ? ' marked-script__text--highlighted' : ''}`}>
              {para.tagName === 'P' ? (
                <p dangerouslySetInnerHTML={{ __html: para.html }} />
              ) : (
                React.createElement(para.tagName, { dangerouslySetInnerHTML: { __html: para.html } })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
