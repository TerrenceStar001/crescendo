import React, { useState, useEffect, useRef } from 'react';

export default function AISettings({ config, onUpdate, isOpen, onClose, testConnection }) {
  const [local, setLocal] = useState(config);
  const [testStatus, setTestStatus] = useState('');
  const [testing, setTesting] = useState(false);
  const overlayRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    setLocal(config);
    setTestStatus('');
  }, [config, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    triggerRef.current = document.activeElement;
    const focusable = overlayRef.current?.querySelectorAll(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];
    first?.focus();
    function handleKey(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        if (!focusable?.length) return;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      triggerRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleSave() {
    onUpdate(local);
    onClose();
  }

  function handleBackdrop(e) {
    if (e.target === overlayRef.current) onClose();
  }

  async function handleTest() {
    if (!local.apiKey && !local.endpoint && local.provider) {
      setTestStatus('Please enter an API key for the external provider');
      return;
    }
    setTesting(true);
    setTestStatus('Testing connection...');
    const result = await testConnection(local);
    setTestStatus(result);
    setTesting(false);
  }

  return (
    <div className="ai-settings-overlay" ref={overlayRef} onClick={handleBackdrop}>
      <div className="ai-settings-modal">
        <h2>AI Settings <span className="ai-settings-optional">(Optional)</span></h2>
        <p className="ai-settings-desc">
          AI is available out of the box via the local OpenCode proxy.
          Optionally connect an external API to override.
        </p>

        <hr className="ai-settings-divider" />

        <label className="ai-settings-field">
          External Provider (optional override)
          <select
            value={local.provider}
            onChange={e => setLocal(prev => ({ ...prev, provider: e.target.value }))}
          >
            <option value="">Disabled (use local OpenCode proxy)</option>
            <option value="nvidia">NVIDIA NIM</option>
            <option value="openai">OpenAI</option>
            <option value="custom">Custom / Local LLM</option>
          </select>
        </label>

        <label className="ai-settings-field">
          API Endpoint
          <input
            type="text"
            placeholder="https://integrate.api.nvidia.com/v1"
            value={local.endpoint}
            onChange={e => setLocal(prev => ({ ...prev, endpoint: e.target.value }))}
          />
        </label>

        <label className="ai-settings-field">
          API Key
          <input
            type="password"
            placeholder="Optional — leave empty for local proxy"
            value={local.apiKey}
            onChange={e => setLocal(prev => ({ ...prev, apiKey: e.target.value }))}
          />
        </label>

        <label className="ai-settings-field">
          Model
          <input
            type="text"
            placeholder="opencode/deepseek-v4-flash-free"
            value={local.model}
            onChange={e => setLocal(prev => ({ ...prev, model: e.target.value }))}
          />
        </label>

        {testStatus && (
          <div className={`ai-settings-status${testStatus.startsWith('Connected') ? ' ai-settings-status--ok' : testStatus.startsWith('Please') || testStatus.startsWith('Testing') ? '' : ' ai-settings-status--error'}`}>
            {testStatus}
          </div>
        )}

        <div className="ai-settings-actions">
          <button
            className="ai-settings-test"
            onClick={handleTest}
            disabled={testing}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button className="ai-settings-cancel" onClick={onClose}>Cancel</button>
          <button className="ai-settings-save" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}