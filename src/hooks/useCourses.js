/**
 * useCourses — Course CRUD hook following the useIndexedDB pattern.
 * Implements D-32 (IndexedDB storage), D-34 (AI calls through useAI),
 * D-36 (silent catch for recoverable errors), D-04 (single active lesson).
 *
 * Course definitions stored in IndexedDB (CrescendoDSE, single store).
 * Enrollment state stored in localStorage (lightweight config per D-32).
 */
import { useCallback } from 'react';
import { useIndexedDB } from './useIndexedDB';
import { calculateCourseRecommendations, validateCourse } from '../utils/courseSchema';

const ENROLLMENT_KEY = 'crescendo-course-enrollments';
const COMPLETED_KEY = 'crescendo-course-completed';
const ACTIVE_LESSON_KEY = 'crescendo-course-active-lesson';
const COURSE_CACHE_PREFIX = 'crescendo-course-cache:';
const IMPROVEMENT_KEY = 'crescendo-course-improvements';


export default function useCourses() {
  const { getItem, setItem, updateItem, DSE_KEYS } = useIndexedDB();

  const COURSE_KEYS = {
    DEFINITIONS: DSE_KEYS.COURSES,
    PROGRESS: DSE_KEYS.COURSE_PROGRESS,
    INGESTION: DSE_KEYS.COURSE_INGESTION,
  };

  /**
   * getCourses: Returns array of course definitions from IndexedDB.
   */
  const getCourses = useCallback(async () => {
    try {
      const courses = await getItem(COURSE_KEYS.DEFINITIONS);
      return Array.isArray(courses) ? courses : [];
    } catch {
      return [];
    }
  }, [getItem, COURSE_KEYS.DEFINITIONS]);

  /**
   * saveCourse: Upserts a course into the array (find by id, update or push).
   */
  const saveCourse = useCallback(async (course) => {
    try {
      const existing = await getCourses();
      const idx = existing.findIndex(c => c.id === course.id);
      let updated;
      if (idx >= 0) {
        updated = [...existing];
        updated[idx] = { ...updated[idx], ...course, updatedAt: new Date().toISOString() };
      } else {
        updated = [...existing, { ...course, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
      }
      await setItem(COURSE_KEYS.DEFINITIONS, updated);
      return true;
    } catch {
      return false;
    }
  }, [getCourses, setItem, COURSE_KEYS.DEFINITIONS]);

  /**
   * deleteCourse: Removes a course by id.
   */
  const deleteCourse = useCallback(async (id) => {
    try {
      const existing = await getCourses();
      const filtered = existing.filter(c => c.id !== id);
      await setItem(COURSE_KEYS.DEFINITIONS, filtered);
      return true;
    } catch {
      return false;
    }
  }, [getCourses, setItem, COURSE_KEYS.DEFINITIONS]);

  /**
   * getProgress: Returns progress object for a specific course.
   */
  const getProgress = useCallback(async (courseId) => {
    try {
      const key = `${COURSE_KEYS.PROGRESS}:${courseId}`;
      return await getItem(key) || null;
    } catch {
      return null;
    }
  }, [getItem, COURSE_KEYS.PROGRESS]);

  /**
   * saveProgress: Saves progress with timestamp.
   */
  const saveProgress = useCallback(async (courseId, progress) => {
    try {
      const key = `${COURSE_KEYS.PROGRESS}:${courseId}`;
      await setItem(key, {
        ...progress,
        courseId,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch {
      return false;
    }
  }, [setItem, COURSE_KEYS.PROGRESS]);

  /**
   * enrollCourse: Marks course as enrolled in localStorage.
   */
  const enrollCourse = useCallback((courseId) => {
    try {
      const raw = localStorage.getItem(ENROLLMENT_KEY);
      const enrollments = raw ? JSON.parse(raw) : [];
      if (!enrollments.includes(courseId)) {
        enrollments.push(courseId);
        localStorage.setItem(ENROLLMENT_KEY, JSON.stringify(enrollments));
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * unenrollCourse: Removes enrollment.
   */
  const unenrollCourse = useCallback((courseId) => {
    try {
      const raw = localStorage.getItem(ENROLLMENT_KEY);
      const enrollments = raw ? JSON.parse(raw) : [];
      const filtered = enrollments.filter(id => id !== courseId);
      localStorage.setItem(ENROLLMENT_KEY, JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * getEnrolledCourses: Returns array of enrolled course IDs from localStorage.
   */
  const getEnrolledCourses = useCallback(() => {
    try {
      const raw = localStorage.getItem(ENROLLMENT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  /**
   * getInProgressCourseId: Returns the single active lesson's course ID (D-04).
   * Only one active lesson at a time.
   */
  const getInProgressCourseId = useCallback(() => {
    try {
      return localStorage.getItem(ACTIVE_LESSON_KEY) || null;
    } catch {
      return null;
    }
  }, []);

  /**
   * setActiveLesson: Tracks the active lesson per D-04.
   * Stores courseId:lessonIndex:exerciseIndex in localStorage.
   */
  const setActiveLesson = useCallback((courseId, lessonIndex, exerciseIndex) => {
    try {
      const value = JSON.stringify({ courseId, lessonIndex, exerciseIndex: exerciseIndex ?? 0 });
      localStorage.setItem(ACTIVE_LESSON_KEY, value);
      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * getEnrollmentStatus: Returns 'enrolled' | 'completed' | null for a course.
   */
  const getEnrollmentStatus = useCallback((courseId) => {
    try {
      const raw = localStorage.getItem(ENROLLMENT_KEY);
      const enrollments = raw ? JSON.parse(raw) : [];
      if (!enrollments.includes(courseId)) return null;
      const completedRaw = localStorage.getItem(COMPLETED_KEY);
      const completed = completedRaw ? JSON.parse(completedRaw) : [];
      if (completed.includes(courseId)) return 'completed';
      return 'enrolled';
    } catch {
      return null;
    }
  }, []);

  /**
   * setEnrollmentStatus: Sets enrollment status for a course.
   * status: 'enrolled' | 'completed' | 'archived'
   */
  const setEnrollmentStatus = useCallback((courseId, status) => {
    try {
      const raw = localStorage.getItem(ENROLLMENT_KEY);
      let enrollments = raw ? JSON.parse(raw) : [];

      if (status === 'enrolled') {
        if (!enrollments.includes(courseId)) enrollments.push(courseId);
      } else if (status === 'completed') {
        if (!enrollments.includes(courseId)) enrollments.push(courseId);
        const completedRaw = localStorage.getItem(COMPLETED_KEY);
        const completed = completedRaw ? JSON.parse(completedRaw) : [];
        if (!completed.includes(courseId)) {
          completed.push(courseId);
          localStorage.setItem(COMPLETED_KEY, JSON.stringify(completed));
        }
      } else if (status === 'archived') {
        enrollments = enrollments.filter(id => id !== courseId);
        const completedRaw = localStorage.getItem(COMPLETED_KEY);
        const completed = completedRaw ? JSON.parse(completedRaw) : [];
        localStorage.setItem(COMPLETED_KEY, JSON.stringify(completed.filter(id => id !== courseId)));
      }

      localStorage.setItem(ENROLLMENT_KEY, JSON.stringify(enrollments));
      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * getCourseProgress: Returns { completedLessons, finalAssessmentScore, lastAccessed } for a course.
   */
  const getCourseProgress = useCallback(async (courseId) => {
    try {
      const progress = await getItem(`${DSE_KEYS.COURSE_PROGRESS}:${courseId}`);
      if (!progress) return null;
      return {
        completedLessons: progress.completedLessons || [],
        finalAssessmentScore: progress.finalAssessmentScore ?? null,
        lastAccessed: progress.lastAccessed || null,
      };
    } catch {
      return null;
    }
  }, [getItem, DSE_KEYS.COURSE_PROGRESS]);

  /**
   * markLessonComplete: Adds a lesson index to the completed lessons set.
   */
  const markLessonComplete = useCallback(async (courseId, lessonIndex) => {
    try {
      const key = `${DSE_KEYS.COURSE_PROGRESS}:${courseId}`;
      const existing = await getItem(key) || {};
      const completedLessons = [...(existing.completedLessons || [])];
      if (!completedLessons.includes(lessonIndex)) {
        completedLessons.push(lessonIndex);
      }
      await setItem(key, {
        ...existing,
        completedLessons,
        lastAccessed: Date.now(),
        courseId,
      });
      return true;
    } catch {
      return false;
    }
  }, [getItem, setItem, DSE_KEYS.COURSE_PROGRESS]);

  /**
   * getActiveCourseId: Returns the course ID with the active lesson (D-04).
   */
  const getActiveCourseId = useCallback(() => {
    try {
      const raw = localStorage.getItem(ACTIVE_LESSON_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data.courseId || null;
    } catch {
      return null;
    }
  }, []);

  /**
   * setActiveCourseId: Sets the active course, clearing any previous (D-04).
   */
  const setActiveCourseId = useCallback((courseId) => {
    try {
      localStorage.setItem(ACTIVE_LESSON_KEY, JSON.stringify({ courseId }));
      return true;
    } catch {
      return false;
    }
  }, []);

  // ─── Recommendation & Auto-generation Methods ───

  /**
   * getCompletedCourses: Returns courses with enrollmentStatus === 'completed'.
   */
  const getCompletedCourses = useCallback(async () => {
    try {
      const allCourses = await getCourses();
      const completedRaw = localStorage.getItem(COMPLETED_KEY);
      const completedIds = completedRaw ? JSON.parse(completedRaw) : [];
      return allCourses.filter(c => completedIds.includes(c.id));
    } catch {
      return [];
    }
  }, [getCourses]);

  /**
   * getCourseCount: Returns total course count (published + drafts).
   */
  const getCourseCount = useCallback(async () => {
    try {
      const courses = await getCourses();
      return courses.length;
    } catch {
      return 0;
    }
  }, [getCourses]);

  /**
   * getRecommendations: Maps skill analytics weak areas to course tag recommendations.
   * @param {Object} skillAnalytics - The useSkillAnalytics hook object
   * @returns {Array<{ tags: string[], confidence: number, source: string }>}
   */
  const getRecommendations = useCallback(async (skillAnalytics) => {
    try {
      const weakAreas = skillAnalytics?.getWeakAreas?.() || [];
      if (weakAreas.length === 0) return [];
      const completedCourses = await getCompletedCourses();
      return calculateCourseRecommendations(weakAreas, completedCourses);
    } catch {
      return [];
    }
  }, [getCompletedCourses]);

  /**
   * autoGenerateCourse: Calls backend to auto-generate a course from weakness tags.
   * Falls back to frontend AI call when backend is unavailable.
   * @param {string[]} weaknessTags - Course tags to target
   * @param {string[]} completedCourseIds - IDs of courses already completed
   * @param {Function} callAI - AI call function
   * @returns {Object|null} The generated course draft or null
   */
  const autoGenerateCourse = useCallback(async (weaknessTags, completedCourseIds, callAI, options = {}) => {
    const { simplerContent = false } = options;

    // Tier 1: Backend API call
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      const res = await fetch('/api/courses/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weaknessTags, completedCourseIds }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`backend returned ${res.status}`);
      const data = await res.json();
      if (data.draftId && data.course) {
        const validation = validateCourse(data.course);
        if (!validation.valid) {
          console.warn('[autoGenerateCourse] Validation failed:', validation.errors);
          return { course: null, error: 'Backend validation failed. Please try again.' };
        }
        await saveCourse(data.course);
        return { course: data.course, error: null };
      }
    } catch (e) {
      console.warn('[autoGenerateCourse] Backend unavailable, trying frontend AI:', e.message);
      // Continue to frontend AI fallback
    }

    // Tier 2: Frontend AI call
    try {
      const structureDesc = simplerContent
        ? `- 1 topic (grouped by skill area)\n- Each topic has 1 lesson\n- Each lesson has a "referenceContent" field containing an actual readable passage about the topic (this is the reading material the learner studies)\n- Each lesson has 2 exercises that test understanding of the lesson's referenceContent`
        : `- 3-5 topics (grouped by skill area)\n- Each topic has 2-4 lessons\n- Each lesson has a "referenceContent" field containing an actual readable passage about the topic (this is the reading material the learner studies)\n- Each lesson has 3-5 exercises that test understanding of the lesson's referenceContent`;

      const simplerNote = simplerContent
        ? '\n\nCRITICAL: Generate highly concise, straightforward reference passages (150-200 words max) and prioritize highly predictable, standardized question syntax to maximize validation compliance.'
        : '';

      const aiPrompt = `You are an English course designer. Generate a structured course targeting these weakness areas. Each lesson must include a reading passage (referenceContent) that the learner reads before attempting exercises.

WEAKNESS TAGS: ${JSON.stringify(weaknessTags)}

STRUCTURE:
${structureDesc}
- Exercise types: gap-fill, matching, cloze, short-answer, sentence-rewrite, reordering, mcq
- Final assessment mixes all exercise types

IMPORTANT: The referenceContent must be a self-contained reading passage. Exercises must be answerable after reading only the lesson's referenceContent. Do NOT reference external texts, paragraph numbers, or page numbers.

Return ONLY a JSON object with no markdown fences:
{
  "title": string,
  "description": string,
  "tags": string[],
  "difficulty": "beginner" | "intermediate" | "advanced",
  "topics": [{
    "title": string,
    "learningObjectives": string[],
    "lessons": [{
      "title": string,
      "exercises": [{
        "question": string,
        "type": string,
        "answer": string,
        "explanation": string,
        "difficulty": number (1-5)
      }],
      "referenceContent": string
    }]
  }],
  "finalAssessment": {
    "title": string,
    "exercises": [{ ... same shape ... }]
  }
}${simplerNote}`;
      const text = await Promise.race([
        callAI(aiPrompt, { maxTokens: 4096, temperature: 0.3 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 120000)),
      ]);
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) return { course: null, error: 'Failed to parse AI response.' };
      const courseDraft = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
      const draftId = `course-auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const course = { ...courseDraft, id: draftId, tags: courseDraft.tags || weaknessTags, published: false };

      const validation = validateCourse(course);
      if (!validation.valid) {
        console.warn('[autoGenerateCourse] Frontend validation failed:', validation.errors);
        return { course: null, error: 'Frontend validation failed. Please try again.' };
      }
      await saveCourse(course);
      return { course, error: null };
    } catch (e) {
      console.error('[autoGenerateCourse] Frontend AI failed:', e.message);
      return { course: null, error: e.message || 'All generation attempts failed. Try again or choose from validated catalog.' };
    }
  }, [saveCourse]);

  /**
   * trackPostCourseImprovement: Stores pre-course and post-course error patterns (D-29).
   * @param {string} courseId - The course that was completed
   * @param {Object} beforeAnalysis - Error pattern analysis before the course
   * @param {Object} afterAnalysis - Error pattern analysis after the course
   */
  const trackPostCourseImprovement = useCallback((courseId, beforeAnalysis, afterAnalysis) => {
    try {
      const raw = localStorage.getItem(IMPROVEMENT_KEY);
      const entries = raw ? JSON.parse(raw) : {};
      entries[courseId] = {
        beforeAnalysis,
        afterAnalysis,
        trackedAt: new Date().toISOString(),
      };
      // Keep only last 50 entries
      const keys = Object.keys(entries);
      if (keys.length > 50) {
        const sorted = keys.sort((a, b) => new Date(entries[b].trackedAt) - new Date(entries[a].trackedAt));
        const toDelete = sorted.slice(50);
        toDelete.forEach(k => delete entries[k]);
      }
      localStorage.setItem(IMPROVEMENT_KEY, JSON.stringify(entries));
      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * checkAndRegenerateCourse: Implements D-15 — re-generate after completion if weakness persists.
   * Compares current weak areas against the weaknessPattern stored in completed courses.
   * If the same weakness tags persist (overlap > 50%), calls autoGenerateCourse().
   * @param {Array} weakAreas - Current weak areas from error analysis
   * @param {string[]} completedCourseIds - IDs of completed courses
   * @param {Function} callAI - AI call function
   * @returns {Object|null} New course draft or null if no regeneration needed
   */
  const checkAndRegenerateCourse = useCallback(async (weakAreas, completedCourseIds, callAI) => {
    try {
      if (!weakAreas?.length || !completedCourseIds?.length) return null;

      const { weaknessTagsToCourseTags } = await import('../utils/errorPatternAnalysis');
      const currentTags = weaknessTagsToCourseTags(weakAreas);

      // Get completed courses and check their weakness patterns
      const completedCourses = await getCompletedCourses();
      const persistedTags = new Set();
      completedCourses.forEach(c => {
        if (c.weaknessPattern) {
          c.weaknessPattern.split(', ').forEach(t => persistedTags.add(t));
        }
      });

      if (persistedTags.size === 0) return null;

      // Calculate overlap between current weakness tags and persisted patterns
      const overlap = currentTags.filter(t => persistedTags.has(t));
      const overlapRatio = overlap.length / Math.max(persistedTags.size, 1);

      // Re-generate only if overlap > 50% (D-15: weakness persists)
      if (overlapRatio > 0.5 && overlap.length > 0) {
        const result = await autoGenerateCourse(overlap, completedCourseIds, callAI);
        if (result.course) return result.course;
        return null;
      }

      return null;
    } catch {
      return null;
    }
  }, [getCompletedCourses, autoGenerateCourse]);

  // ─── Offline Caching Methods ───

  /**
   * cacheCourseOffline: Stores course in IndexedDB and PWA cache for offline access.
   * Called when a student enrolls in or starts a course (D-31).
   */
  const cacheCourseOffline = useCallback(async (course) => {
    try {
      if (!course?.id) return false;
      // Store in IndexedDB
      const key = `${COURSE_CACHE_PREFIX}${course.id}`;
      await setItem(key, course);

      // Also register in PWA cache via Cache API
      if ('caches' in window) {
        const cache = await caches.open('crescendo-courses-v1');
        const response = new Response(JSON.stringify(course), {
          headers: { 'Content-Type': 'application/json', 'X-Crescendo-Course': course.id },
        });
        await cache.put(`/api/courses/cached/${course.id}`, response);
      }

      return true;
    } catch {
      return false;
    }
  }, [setItem]);

  /**
   * getCachedCourse: Returns cached course from IndexedDB or null.
   * Falls back to fetching from backend if not cached (for browsing).
   */
  const getCachedCourse = useCallback(async (courseId) => {
    try {
      const key = `${COURSE_CACHE_PREFIX}${courseId}`;
      const cached = await getItem(key);
      if (cached) return cached;
      // Fall back to backend fetch
      const res = await fetch(`/api/courses/${courseId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    } catch {
      return null;
    }
  }, [getItem]);

  /**
   * isCourseAvailableOffline: Returns boolean based on whether course is cached.
   */
  const isCourseAvailableOffline = useCallback(async (courseId) => {
    try {
      const key = `${COURSE_CACHE_PREFIX}${courseId}`;
      const cached = await getItem(key);
      return !!cached;
    } catch {
      return false;
    }
  }, [getItem]);

  return {
    getCourses,
    saveCourse,
    deleteCourse,
    getProgress,
    saveProgress,
    enrollCourse,
    unenrollCourse,
    getEnrolledCourses,
    getInProgressCourseId,
    setActiveLesson,
    getEnrollmentStatus,
    setEnrollmentStatus,
    getCourseProgress,
    markLessonComplete,
    getActiveCourseId,
    setActiveCourseId,
    getCompletedCourses,
    getCourseCount,
    getRecommendations,
    autoGenerateCourse,
    trackPostCourseImprovement,
    checkAndRegenerateCourse,
    cacheCourseOffline,
    getCachedCourse,
    isCourseAvailableOffline,
  };
}
