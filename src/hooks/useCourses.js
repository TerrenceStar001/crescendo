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
import { calculateCourseRecommendations, validateCourse, buildRetryFeedback } from '../utils/courseSchema';
import { buildCoursePrompt as buildTutorPrompt } from '../prompts/courseGeneratorPrompt';

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
      if (!Array.isArray(courses)) return [];
      let changed = false;
      const cleaned = courses.map(c => {
        if (c.title && /^DSE\s+English\s+Language\s*[:\-–—]\s*/i.test(c.title)) {
          changed = true;
          return { ...c, title: c.title.replace(/^DSE\s+English\s+Language\s*[:\-–—]\s*/i, '').trim() };
        }
        return c;
      });
      if (changed) setItem(COURSE_KEYS.DEFINITIONS, cleaned).catch(() => {});
      return cleaned;
    } catch {
      return [];
    }
  }, [getItem, setItem, COURSE_KEYS.DEFINITIONS]);

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
    } catch (e) {
      console.error('[useCourses] saveCourse failed:', e.message);
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
    const { simplerContent = true } = options;

    // Frontend AI call with retry loop
    function extractJSON(text) {
      if (!text || typeof text !== 'string') return null;
      const trimmed = text.trim();
      const firstBrace = trimmed.indexOf('{');
      const lastBrace = trimmed.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try { return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)); } catch { /* continue */ }
      }
      if (firstBrace !== -1) {
        let depth = 0;
        for (let i = firstBrace; i < trimmed.length; i++) {
          if (trimmed[i] === '{') depth++;
          else if (trimmed[i] === '}') {
            depth--;
            if (depth === 0) {
              try { return JSON.parse(trimmed.slice(firstBrace, i + 1)); } catch { /* continue */ }
            }
          }
        }
      }
      try { return JSON.parse(trimmed); } catch { /* continue */ }
      return null;
    }
    const maxRetries = 3;
    let feedback = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const completedContext = ''; // Frontend doesn't have easy access to completed courses
        const aiPrompt = buildTutorPrompt(weaknessTags, completedContext, simplerContent);

        // Append retry feedback if this is a retry
        const prompt = feedback
          ? `${aiPrompt}\n\nPREVIOUS ATTEMPT HAD THESE ISSUES — fix them:\n${feedback}`
          : aiPrompt;

        const text = await Promise.race([
          callAI(prompt, { maxTokens: 8192, temperature: 0.3, timeout: 300000 }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 300000)),
        ]);

        const courseDraft = extractJSON(text);
        if (!courseDraft) {
          feedback = 'Returned invalid or incomplete JSON. Output must be a valid JSON object with topics, lessons, and exercises.';
          continue;
        }
        // Strip generic DSE English prefix from generated titles
        if (courseDraft.title && typeof courseDraft.title === 'string') {
          courseDraft.title = courseDraft.title.replace(/^DSE\s+English\s+Language\s*[:\-–—]\s*/i, '').trim();
        }

        const draftId = `course-auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const course = { ...courseDraft, id: draftId, tags: courseDraft.tags || weaknessTags, published: false };

        const validation = validateCourse(course, { simplerContent });
        if (!validation.valid) {
          console.warn(`[autoGenerateCourse] Attempt ${attempt + 1} validation failed:`, validation.errors);
          if (attempt < maxRetries) {
            feedback = buildRetryFeedback(validation.errors);
            continue;
          }
          // SimplerContent dead-end: return seed fallback suggestion
          if (simplerContent) {
            return { course: null, error: 'SIMPLER_CONTENT_FAILED', needsSeedFallback: true };
          }
          return { course: null, error: 'Course validation failed after multiple attempts. Try simpler content mode.' };
        }

        await saveCourse(course);
        return { course, error: null };
      } catch (e) {
        console.error(`[autoGenerateCourse] Attempt ${attempt + 1} failed:`, e.message);
        if (attempt >= maxRetries) {
          return { course: null, error: e.message || 'All course generation attempts failed.' };
        }
        feedback = `Error: ${e.message}. Please try again with valid output.`;
      }
    }
    return { course: null, error: 'Course generation failed after all attempts.' };
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
   */
  const getCachedCourse = useCallback(async (courseId) => {
    try {
      const key = `${COURSE_CACHE_PREFIX}${courseId}`;
      const cached = await getItem(key);
      return cached || null;
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
    cacheCourseOffline,
    getCachedCourse,
    isCourseAvailableOffline,
  };
}
