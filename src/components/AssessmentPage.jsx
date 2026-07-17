import React, { useState } from 'react';

const SKILLS = [
  { id: 'reading', icon: '📖', label: 'Reading' },
  { id: 'writing', icon: '✍️', label: 'Writing' },
  { id: 'listening', icon: '🎧', label: 'Listening' },
  { id: 'speaking', icon: '🎤', label: 'Speaking' },
];

const LEVELS = [1, 2, 3, 4, 5];
const CONFIDENCE_LEVELS = ['low', 'medium', 'high'];

export default function AssessmentPage({ assessment, onComplete, onBack }) {
  const [phase, setPhase] = useState('intro');
  const [quizSkillIndex, setQuizSkillIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});

  const { setSelfRating, getQuizQuestions, submitQuizResult, completeAssessment, selfRatings, finalLevels, hasCompletedAssessment, currentPhase } = assessment;

  if (hasCompletedAssessment && phase !== 'intro') {
    // Allow re-entry but default to intro if already complete
  }

  function handleStart() {
    setPhase('self-rate');
  }

  function handleSelfRateNext() {
    const allRated = SKILLS.every(s => typeof selfRatings[s.id].level === 'number');
    if (!allRated) return;
    setQuizSkillIndex(0);
    setQuizAnswers({});
    setPhase('quiz');
  }

  function handleQuizAnswer(questionId, answer) {
    setQuizAnswers(prev => ({ ...prev, [`q${questionId}`]: answer }));
  }

  function handleNextSkill() {
    const skill = SKILLS[quizSkillIndex];
    const questions = getQuizQuestions(skill.id);
    const allAnswered = questions.every(q => quizAnswers[`q${q.id}`]);
    if (!allAnswered) return;

    submitQuizResult(skill.id, quizAnswers);

    if (quizSkillIndex < SKILLS.length - 1) {
      setQuizSkillIndex(prev => prev + 1);
      setQuizAnswers({});
    } else {
      completeAssessment();
      setPhase('results');
    }
  }

  function handleViewPlan() {
    onComplete?.();
  }

  function handleRetake() {
    assessment.resetAssessment();
    setPhase('intro');
  }

  const quizSkill = SKILLS[quizSkillIndex];
  const quizQuestions = quizSkill ? getQuizQuestions(quizSkill.id) : [];
  const quizProgress = `${quizSkillIndex + 1} / ${SKILLS.length}`;

  return React.createElement('div', { className: 'assessment__container' },
    phase === 'intro' && React.createElement('div', { className: 'assessment__phase' },
      React.createElement('div', { className: 'assessment__header' },
        React.createElement('h2', null, '📋 DSE Skill Assessment'),
        React.createElement('p', { className: 'assessment__subtitle' }, 'Rate your current ability across all 4 DSE papers, then take a short verification quiz to confirm your levels.'),
      ),
      React.createElement('div', { className: 'assessment__intro-cards' },
        SKILLS.map(s => React.createElement('div', { key: s.id, className: 'assessment__intro-card' },
          React.createElement('span', { style: { fontSize: '2rem' } }, s.icon),
          React.createElement('h3', null, s.label),
          React.createElement('p', null, '3 quick questions'),
        )),
      ),
      React.createElement('button', { className: 'assessment__btn assessment__btn--primary', onClick: handleStart }, 'Start Assessment'),
    ),

    phase === 'self-rate' && React.createElement('div', { className: 'assessment__phase' },
      React.createElement('div', { className: 'assessment__header' },
        React.createElement('h2', null, 'Self-Rating'),
        React.createElement('p', null, 'Rate your current DSE level for each skill. Be honest — this helps create a better study plan.'),
      ),
      React.createElement('div', { className: 'assessment__skill-grid' },
        SKILLS.map(s => React.createElement('div', { key: s.id, className: 'assessment__skill-card' },
          React.createElement('div', { className: 'assessment__skill-card-header' },
            React.createElement('span', { style: { fontSize: '1.5rem' } }, s.icon),
            React.createElement('h3', null, s.label),
          ),
          React.createElement('div', { className: 'assessment__level-group' },
            React.createElement('label', { className: 'assessment__level-label' }, 'DSE Level'),
            React.createElement('div', { className: 'assessment__radio-group' },
              LEVELS.map(l => {
                const isSelected = selfRatings[s.id]?.level === l;
                return React.createElement('button', {
                  key: l,
                  className: `assessment__level-btn${isSelected ? ' assessment__level-btn--selected' : ''}`,
                  onClick: () => setSelfRating(s.id, l, selfRatings[s.id]?.confidence || 'medium'),
                  'aria-pressed': isSelected,
                }, l === 5 ? '5' : String(l));
              }),
            ),
          ),
          React.createElement('div', { className: 'assessment__confidence-group' },
            React.createElement('label', { className: 'assessment__level-label' }, 'Confidence'),
            React.createElement('div', { className: 'assessment__radio-group' },
              CONFIDENCE_LEVELS.map(c => {
                const isSelected = selfRatings[s.id]?.confidence === c;
                return React.createElement('button', {
                  key: c,
                  className: `assessment__confidence-btn${isSelected ? ' assessment__confidence-btn--selected' : ''}`,
                  onClick: () => setSelfRating(s.id, selfRatings[s.id]?.level || 3, c),
                  'aria-pressed': isSelected,
                }, c.charAt(0).toUpperCase() + c.slice(1));
              }),
            ),
          ),
        )),
      ),
      React.createElement('div', { className: 'assessment__actions' },
        React.createElement('button', { className: 'assessment__btn', onClick: onBack }, 'Back'),
        React.createElement('button', {
          className: 'assessment__btn assessment__btn--primary',
          onClick: handleSelfRateNext,
          disabled: !SKILLS.every(s => typeof selfRatings[s.id]?.level === 'number'),
        }, 'Continue to Quiz'),
      ),
    ),

    phase === 'quiz' && quizSkill && React.createElement('div', { className: 'assessment__phase' },
      React.createElement('div', { className: 'assessment__header' },
        React.createElement('h2', null, `${quizSkill.icon} ${quizSkill.label} Quiz`),
        React.createElement('p', null, `Skill ${quizProgress}`),
      ),
      React.createElement('div', { className: 'assessment__progress-bar' },
        React.createElement('div', {
          className: 'assessment__progress-fill',
          style: { width: `${((quizSkillIndex) / SKILLS.length) * 100}%` },
        }),
      ),
      quizQuestions.map((q, idx) => React.createElement('div', { key: q.id, className: 'assessment__quiz-question' },
        React.createElement('p', { className: 'assessment__question-stem' }, `${idx + 1}. ${q.stem}`),
        React.createElement('div', { className: 'assessment__options' },
          q.options.map(opt => {
            const isSelected = quizAnswers[`q${q.id}`] === opt.label;
            return React.createElement('button', {
              key: opt.label,
              className: `assessment__option${isSelected ? ' assessment__option--selected' : ''}`,
              onClick: () => handleQuizAnswer(q.id, opt.label),
              'aria-pressed': isSelected,
            }, React.createElement('span', { className: 'assessment__option-label' }, opt.label), React.createElement('span', null, opt.text));
          }),
        ),
      )),
      React.createElement('div', { className: 'assessment__actions' },
        React.createElement('button', {
          className: 'assessment__btn',
          onClick: () => {
            if (quizSkillIndex > 0) {
              setQuizSkillIndex(prev => prev - 1);
              setQuizAnswers({});
            } else {
              setPhase('self-rate');
            }
          },
        }, 'Back'),
        React.createElement('button', {
          className: 'assessment__btn assessment__btn--primary',
          onClick: handleNextSkill,
          disabled: !quizQuestions.every(q => quizAnswers[`q${q.id}`]),
        }, quizSkillIndex < SKILLS.length - 1 ? 'Next Skill →' : 'Complete Assessment'),
      ),
    ),

    phase === 'results' && React.createElement('div', { className: 'assessment__phase' },
      React.createElement('div', { className: 'assessment__header' },
        React.createElement('h2', null, '📊 Assessment Results'),
        React.createElement('p', null, 'Your self-ratings compared with quiz results'),
      ),
      React.createElement('div', { className: 'assessment__result-table' },
        React.createElement('div', { className: 'assessment__result-row assessment__result-row--header' },
          React.createElement('span', null, 'Skill'),
          React.createElement('span', null, 'Self-Rated'),
          React.createElement('span', null, 'Adjusted'),
          React.createElement('span', null, 'Final'),
        ),
        SKILLS.map(s => {
          const fl = finalLevels[s.id];
          const match = fl?.selfRated === fl?.final;
          return React.createElement('div', { key: s.id, className: 'assessment__result-row' },
            React.createElement('span', { className: 'assessment__result-skill' }, `${s.icon} ${s.label}`),
            React.createElement('span', null, fl?.selfRated || '—'),
            React.createElement('span', null, fl?.quizAdjusted || '—'),
            React.createElement('span', {
              className: `assessment__result-final${match ? ' assessment__result-final--match' : ' assessment__result-final--adjusted'}`,
            }, `${fl?.final || '—'} ${match ? '✓' : '⇅'}`),
          );
        }),
      ),
      React.createElement('div', { className: 'assessment__actions' },
        React.createElement('button', { className: 'assessment__btn', onClick: handleRetake }, 'Re-take'),
        React.createElement('button', { className: 'assessment__btn assessment__btn--primary', onClick: handleViewPlan }, 'View My Study Plan →'),
      ),
    ),
  );
}
