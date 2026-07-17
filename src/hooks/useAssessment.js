import { useCallback, useEffect, useRef, useState } from 'react';
import { useIndexedDB } from './useIndexedDB';
import { computeOverallDseLevel } from '../utils/dseGrading';

const VERIFICATION_QUESTIONS = [
  { id: 1, skill: 'reading', type: 'mcq', stem: 'What is the main idea of a passage where the author describes the causes of climate change, its effects on coastal communities, and then proposes renewable energy as a solution?', options: [{ label: 'A', text: 'Climate change is caused by human activity' }, { label: 'B', text: 'Coastal communities are most affected by climate change' }, { label: 'C', text: 'Renewable energy can mitigate climate change impacts' }, { label: 'D', text: 'Climate change has multiple causes, effects, and a proposed solution' }], correctAnswer: 'D' },
  { id: 2, skill: 'reading', type: 'mcq', stem: 'Read this sentence: "The professor\'s elucidation of the complex theory was remarkably lucid, even for first-year students." What does "elucidation" most likely mean?', options: [{ label: 'A', text: 'Criticism' }, { label: 'B', text: 'Explanation' }, { label: 'C', text: 'Complication' }, { label: 'D', text: 'Summary' }], correctAnswer: 'B' },
  { id: 3, skill: 'reading', type: 'mcq', stem: 'In a passage where the writer says "While many argue that social media connects people, the evidence suggests otherwise — loneliness rates have doubled since 2010", what is the writer\'s attitude towards social media?', options: [{ label: 'A', text: 'Strongly supportive' }, { label: 'B', text: 'Neutral' }, { label: 'C', text: 'Skeptical' }, { label: 'D', text: 'Enthusiastic' }], correctAnswer: 'C' },
  { id: 4, skill: 'writing', type: 'mcq', stem: 'Which text type would be most appropriate for proposing a new school policy to the principal?', options: [{ label: 'A', text: 'A narrative essay' }, { label: 'B', text: 'A formal proposal' }, { label: 'C', text: 'A blog post' }, { label: 'D', text: 'A short story' }], correctAnswer: 'B' },
  { id: 5, skill: 'writing', type: 'mcq', stem: 'Which of the following sentences demonstrates the most formal register?', options: [{ label: 'A', text: 'The company is gonna look into the issue ASAP' }, { label: 'B', text: 'The company will investigate the matter promptly' }, { label: 'C', text: 'The company will check it out soon' }, { label: 'D', text: 'The company\'s on it' }], correctAnswer: 'B' },
  { id: 6, skill: 'writing', type: 'mcq', stem: 'A well-structured paragraph should begin with:', options: [{ label: 'A', text: 'A supporting detail' }, { label: 'B', text: 'A concluding thought' }, { label: 'C', text: 'A topic sentence' }, { label: 'D', text: 'An example' }], correctAnswer: 'C' },
  { id: 7, skill: 'listening', type: 'mcq', stem: 'In a lecture about marine biology, the speaker says "The coral reef ecosystem, despite covering less than 1% of the ocean floor, supports approximately 25% of all marine species." What is the speaker\'s main point?', options: [{ label: 'A', text: 'Coral reefs are beautiful' }, { label: 'B', text: 'Coral reefs are ecologically significant despite their small area' }, { label: 'C', text: 'Most marine species live in the open ocean' }, { label: 'D', text: 'Coral reefs cover most of the ocean floor' }], correctAnswer: 'B' },
  { id: 8, skill: 'listening', type: 'mcq', stem: 'If a speaker says "First, let\'s examine the historical context. Moving on, we\'ll look at current applications. Finally, we\'ll consider future implications," what organizational pattern is being used?', options: [{ label: 'A', text: 'Compare and contrast' }, { label: 'B', text: 'Chronological order' }, { label: 'C', text: 'Problem-solution' }, { label: 'D', text: 'Cause and effect' }], correctAnswer: 'B' },
  { id: 9, skill: 'listening', type: 'mcq', stem: 'When taking notes during a listening task, which approach is most effective?', options: [{ label: 'A', text: 'Write every word the speaker says' }, { label: 'B', text: 'Record key points and main ideas using abbreviations' }, { label: 'C', text: 'Only listen without writing anything' }, { label: 'D', text: 'Copy the entire passage from memory afterwards' }], correctAnswer: 'B' },
  { id: 10, skill: 'speaking', type: 'mcq', stem: 'In a group discussion, which strategy best demonstrates effective interaction?', options: [{ label: 'A', text: 'Speaking as much as possible without pausing' }, { label: 'B', text: 'Waiting for others to finish, then building on their points' }, { label: 'C', text: 'Only speaking when directly asked a question' }, { label: 'D', text: 'Interrupting to show engagement' }], correctAnswer: 'B' },
  { id: 11, skill: 'speaking', type: 'mcq', stem: 'What is the most important factor in pronunciation for clear communication?', options: [{ label: 'A', text: 'Having a native-like accent' }, { label: 'B', text: 'Speaking very quickly' }, { label: 'C', text: 'Using correct stress and intonation patterns' }, { label: 'D', text: 'Using advanced vocabulary' }], correctAnswer: 'C' },
  { id: 12, skill: 'speaking', type: 'mcq', stem: 'When giving a presentation, an effective introduction should:', options: [{ label: 'A', text: 'Start with detailed statistics' }, { label: 'B', text: 'Apologize for any mistakes you might make' }, { label: 'C', text: 'Hook the audience and state your main point' }, { label: 'D', text: 'Jump straight into the first point' }], correctAnswer: 'C' },
];

const SKILLS = ['reading', 'writing', 'listening', 'speaking'];

function createEmptyProfile() {
  const selfRatings = {};
  const quizResults = {};
  const finalLevels = {};
  for (const skill of SKILLS) {
    selfRatings[skill] = { level: 'not-rated', confidence: 'low' };
    quizResults[skill] = { score: 0, questions: [], completedAt: null };
    finalLevels[skill] = { selfRated: 1, quizAdjusted: 1, final: 1, method: 'self' };
  }
  return {
    _initialized: true,
    completedAt: null,
    selfRatings,
    quizResults,
    finalLevels,
    _overallDse: '1',
  };
}

export default function useAssessment() {
  const { getItem, setItem, DSE_KEYS } = useIndexedDB();
  const loadedRef = useRef(false);

  const [profile, setProfile] = useState(createEmptyProfile());
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeSkill, setActiveSkill] = useState(null);
  const [currentPhase, setCurrentPhase] = useState('self-rate');

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      const saved = await getItem(DSE_KEYS.ASSESSMENT);
      if (saved && saved._initialized) {
        setProfile(saved);
        setCurrentPhase(saved.completedAt ? 'complete' : 'self-rate');
      }
      setIsLoaded(true);
    })();
  }, [getItem, DSE_KEYS.ASSESSMENT]);

  const persist = useCallback(async (p) => {
    try {
      await setItem(DSE_KEYS.ASSESSMENT, p);
    } catch { /* silent */ }
  }, [setItem, DSE_KEYS.ASSESSMENT]);

  const setSelfRating = useCallback((skill, level, confidence) => {
    setProfile(prev => {
      const next = { ...prev, selfRatings: { ...prev.selfRatings, [skill]: { level, confidence } } };
      persist(next);
      return next;
    });
  }, [persist]);

  const getQuizQuestions = useCallback((skill) => {
    return VERIFICATION_QUESTIONS.filter(q => q.skill === skill);
  }, []);

  const submitQuizResult = useCallback((skill, answers) => {
    const questions = getQuizQuestions(skill);
    let score = 0;
    for (const q of questions) {
      const userAnswer = answers[`q${q.id}`];
      if (userAnswer === q.correctAnswer) score++;
    }
    setProfile(prev => {
      const next = {
        ...prev,
        quizResults: {
          ...prev.quizResults,
          [skill]: { score, questions: questions.map(q => q.id), completedAt: new Date().toISOString() },
        },
      };
      persist(next);
      return next;
    });
  }, [getQuizQuestions, persist]);

  const computeFinalLevel = useCallback((skill) => {
    setProfile(prev => {
      const selfLevel = typeof prev.selfRatings[skill].level === 'number'
        ? prev.selfRatings[skill].level : 3;
      const quizScore = prev.quizResults[skill]?.score || 0;

      let quizAdjusted, final, method;
      if (quizScore === 3) {
        quizAdjusted = selfLevel;
        if (Math.abs(selfLevel - selfLevel) <= 1) {
          final = selfLevel;
          method = 'self';
        } else {
          final = Math.round((selfLevel + selfLevel) / 2);
          method = 'adjusted';
        }
      } else if (quizScore === 2) {
        quizAdjusted = Math.max(1, selfLevel - 1);
        final = quizAdjusted;
        method = 'adjusted';
      } else {
        const quizLevel = quizScore <= 0 ? 1 : 2;
        quizAdjusted = Math.min(quizLevel, selfLevel);
        final = quizAdjusted;
        method = 'quiz';
      }

      const finalLevels = {
        ...prev.finalLevels,
        [skill]: { selfRated: selfLevel, quizAdjusted, final, method },
      };

      return { ...prev, finalLevels };
    });
  }, []);

  const completeAssessment = useCallback(() => {
    setProfile(prev => {
      const finalLevels = { ...prev.finalLevels };
      for (const skill of SKILLS) {
        const selfLevel = typeof prev.selfRatings[skill].level === 'number'
          ? prev.selfRatings[skill].level : 3;
        const quizScore = prev.quizResults[skill]?.score || 0;

        let quizAdjusted, final, method;
        if (quizScore === 3) {
          quizAdjusted = selfLevel;
          final = selfLevel;
          method = 'self';
        } else if (quizScore === 2) {
          quizAdjusted = Math.max(1, selfLevel - 1);
          final = quizAdjusted;
          method = 'adjusted';
        } else {
          const quizLevel = quizScore <= 0 ? 1 : 2;
          quizAdjusted = Math.min(quizLevel, selfLevel);
          final = quizAdjusted;
          method = 'quiz';
        }
        finalLevels[skill] = { selfRated: selfLevel, quizAdjusted, final, method };
      }

      const levels = Object.values(finalLevels).map(l => l.final);
      const overall = computeOverallDseLevel(levels);

      const next = {
        ...prev,
        finalLevels,
        completedAt: new Date().toISOString(),
        _overallDse: overall,
      };
      persist(next);
      setCurrentPhase('complete');
      return next;
    });
  }, [persist]);

  const resetAssessment = useCallback(() => {
    const empty = createEmptyProfile();
    setProfile(empty);
    setCurrentPhase('self-rate');
    persist(empty);
  }, [persist]);

  const hasCompletedAssessment = profile.completedAt !== null;

  return {
    profile, isLoaded, activeSkill, setActiveSkill,
    currentPhase, setCurrentPhase,
    setSelfRating, getQuizQuestions, submitQuizResult,
    computeFinalLevel, completeAssessment, resetAssessment,
    hasCompletedAssessment,
    selfRatings: profile.selfRatings,
    quizResults: profile.quizResults,
    finalLevels: profile.finalLevels,
  };
}
