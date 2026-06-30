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
  };
}
