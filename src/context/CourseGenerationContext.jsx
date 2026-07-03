import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const GenerationContext = createContext(null);

export function CourseGenerationProvider({ children, autoGenerateCourseFn, callAI }) {
  const [state, setState] = useState({
    isGenerating: false,
    progress: 0,
    status: 'idle', // 'idle' | 'generating' | 'success' | 'error'
    error: null,
    courseId: null,
    courseTitle: null,
  });

  const [showNavGuard, setShowNavGuard] = useState(false);

  const progressRef = useRef(null);
  const startTimeRef = useRef(null);
  const paramsRef = useRef(null);

  // ==============================
  // Pseudo-progress engine (D-15)
  // ==============================
  const startProgress = useCallback(() => {
    stopProgress();
    startTimeRef.current = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      let progress;
      if (elapsed < 30000) {
        // Phase 1: rapid climb 0→45% in 30s
        progress = Math.min(45, (elapsed / 30000) * 45);
      } else if (elapsed < 90000) {
        // Phase 2: slow crawl 45→85% in 60s
        progress = 45 + ((elapsed - 30000) / 60000) * 40;
      } else if (elapsed < 115000) {
        // Phase 3: asymptotic 85→95% in 25s
        progress = 85 + ((elapsed - 90000) / 25000) * 10;
      } else {
        progress = 95; // asymptote until explicit complete
      }
      setState(prev => ({ ...prev, progress }));
    }, 500);
  }, []);

  const stopProgress = useCallback(() => {
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  }, []);

  // Check sessionStorage for pending generation on mount (tab reopened)
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('crescendo-gen-pending');
      if (pending) {
        const parsed = JSON.parse(pending);
        if (parsed.status === 'generating') {
          // Previous tab closed during generation — show as success toast
          setState(prev => ({
            ...prev,
            status: 'success',
            progress: 100,
            courseId: parsed.courseId || null,
            courseTitle: parsed.courseTitle || null,
          }));
          sessionStorage.removeItem('crescendo-gen-pending');
        }
      }
    } catch { /* sessionStorage not available */ }
  }, []);

  // ==============================
  // beforeunload handler (D-16, D-17)
  // ==============================
  useEffect(() => {
    if (state.isGenerating) {
      const handler = (e) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [state.isGenerating]);

  // ==============================
  // Generation lifecycle methods
  // ==============================
  const startGeneration = useCallback(async ({ weaknessTags, completedCourseIds, callAI: overrideCallAI, autoGenerateCourseFn: overrideAutoGen, simplerContent }) => {
    const genFn = overrideAutoGen || autoGenerateCourseFn;
    const aiFn = overrideCallAI || callAI;

    // Store params for retry
    paramsRef.current = { weaknessTags, completedCourseIds, callAI: aiFn, autoGenerateCourseFn: genFn, simplerContent };

    // Store pending in sessionStorage for beforeunload recovery
    try {
      sessionStorage.setItem('crescendo-gen-pending', JSON.stringify({
        status: 'generating',
        timestamp: Date.now(),
      }));
    } catch { /* sessionStorage not available */ }

    setState(prev => ({
      ...prev,
      isGenerating: true,
      status: 'generating',
      progress: 0,
      error: null,
      courseId: null,
      courseTitle: null,
    }));
    setShowNavGuard(true);
    startProgress();

    try {
      const result = await genFn(weaknessTags, completedCourseIds, aiFn, { simplerContent });
      stopProgress();

      if (result) {
        const courseTitle = result.title || 'Untitled Course';
        setState(prev => ({
          ...prev,
          isGenerating: false,
          status: 'success',
          progress: 100,
          courseId: result.id,
          courseTitle,
        }));
        // Clear pending marker on success
        try { sessionStorage.removeItem('crescendo-gen-pending'); } catch {}
      } else {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          status: 'error',
          error: 'Generation returned no result. The AI may have failed to produce valid course content.',
        }));
      }
    } catch (e) {
      stopProgress();
      setState(prev => ({
        ...prev,
        isGenerating: false,
        status: 'error',
        error: e.message || 'An unexpected error occurred during course generation.',
      }));
    }
  }, [autoGenerateCourseFn, callAI, startProgress, stopProgress]);

  const cancelGeneration = useCallback(() => {
    stopProgress();
    try { sessionStorage.removeItem('crescendo-gen-pending'); } catch {}
    setState(prev => ({
      ...prev,
      isGenerating: false,
      status: 'idle',
      progress: 0,
      error: null,
    }));
    setShowNavGuard(false);
  }, [stopProgress]);

  const retryGeneration = useCallback(async () => {
    if (!paramsRef.current) return;
    await startGeneration({ ...paramsRef.current, simplerContent: false });
  }, [startGeneration]);

  const retrySimpler = useCallback(async () => {
    if (!paramsRef.current) return;
    await startGeneration({ ...paramsRef.current, simplerContent: true });
  }, [startGeneration]);

  const dismiss = useCallback(() => {
    stopProgress();
    try { sessionStorage.removeItem('crescendo-gen-pending'); } catch {}
    setState({
      isGenerating: false,
      progress: 0,
      status: 'idle',
      error: null,
      courseId: null,
      courseTitle: null,
    });
    setShowNavGuard(false);
  }, [stopProgress]);

  const dismissNavGuard = useCallback(() => {
    setShowNavGuard(false);
  }, []);

  const value = {
    ...state,
    showNavGuard,
    startGeneration,
    retryGeneration,
    retrySimpler,
    cancelGeneration,
    dismiss,
    dismissNavGuard,
  };

  return (
    <GenerationContext.Provider value={value}>
      {children}

      {/* ============================== */}
      {/* Floating progress panel (D-15) */}
      {/* ============================== */}
      {state.status !== 'idle' && (
        <div className={`course__gen-panel course__gen-panel--${state.status}`}>
          {/* Generating state */}
          {state.status === 'generating' && (
            <>
              <button
                className="course__gen-panel-header"
                onClick={cancelGeneration}
                title="Cancel generation"
                aria-label="Cancel generation"
              >
                ✕
              </button>
              <div className="course__gen-status">
                <div className="course__gen-status-icon">⟳</div>
                <span>Generating your course...</span>
              </div>
              <div className="course__gen-progress-track">
                <div
                  className="course__gen-progress-bar"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
              <div className="course__gen-actions">
                <button className="course__gen-btn course__gen-btn--cancel" onClick={cancelGeneration}>
                  Cancel
                </button>
              </div>
            </>
          )}

          {/* Success state (D-18) */}
          {state.status === 'success' && (
            <>
              <div className="course__gen-status">
                <div className="course__gen-status-icon course__gen-status-icon--success">✓</div>
                <span>Your personalized course is ready!</span>
              </div>
              {state.courseId && (
                <div className="course__gen-actions">
                  <button
                    className="course__gen-btn course__gen-btn--view"
                    onClick={() => {
                      // Navigate to catalog — parent route handler picks up courseId
                      window.location.hash = '#/courses';
                      dismiss();
                    }}
                  >
                    View Course
                  </button>
                </div>
              )}
              <button className="course__gen-dismiss" onClick={dismiss}>Dismiss</button>
            </>
          )}

          {/* Error state (D-19) */}
          {state.status === 'error' && (
            <>
              <div className="course__gen-status">
                <div className="course__gen-status-icon course__gen-status-icon--error">⚠</div>
                <span>{state.error || 'Course generation failed.'}</span>
              </div>
              <div className="course__gen-actions">
                <button className="course__gen-btn course__gen-btn--retry" onClick={retryGeneration}>
                  Retry
                </button>
                <button className="course__gen-btn course__gen-btn--simpler" onClick={retrySimpler}>
                  Try Simpler Content
                </button>
              </div>
              <button className="course__gen-dismiss" onClick={dismiss}>Dismiss</button>
            </>
          )}
        </div>
      )}

      {/* ============================== */}
      {/* Navigation guard modal (D-16) */}
      {/* ============================== */}
      {showNavGuard && state.isGenerating && (
        <div className="course__gen-nav-guard" onClick={dismissNavGuard}>
          <div className="course__gen-nav-guard__modal" onClick={e => e.stopPropagation()}>
            <p className="course__gen-nav-guard__text">
              Your course is generating in the background.
            </p>
            <div className="course__gen-nav-guard__actions">
              <button
                className="course__gen-btn course__gen-btn--browse"
                onClick={dismissNavGuard}
              >
                Browse Site
              </button>
              <button
                className="course__gen-btn course__gen-btn--stay"
                onClick={dismissNavGuard}
              >
                Stay on Page
              </button>
            </div>
          </div>
        </div>
      )}
    </GenerationContext.Provider>
  );
}

export function useCourseGeneration() {
  const ctx = useContext(GenerationContext);
  if (!ctx) throw new Error('useCourseGeneration must be used within CourseGenerationProvider');
  return ctx;
}
