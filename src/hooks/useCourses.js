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

const ENROLLMENT_KEY = 'crescendo-course-enrollments';
const COMPLETED_KEY = 'crescendo-course-completed';
const ACTIVE_LESSON_KEY = 'crescendo-course-active-lesson';

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
  };
}
