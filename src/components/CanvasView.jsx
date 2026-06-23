import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import NoteNode from './NoteNode';
import useLocalStorage from '../hooks/useLocalStorage';

const nodeTypes = { noteNode: NoteNode };

const NODE_WIDTH = 220;
const NODE_HEIGHT = 120;
const GAP_X = 40;
const GAP_Y = 120;
const GROUP_SNAP = 50;

let edgeIdCounter = 0;
function genEdgeId() {
  return `manual_${++edgeIdCounter}_${Date.now()}`;
}

function arrangeCluster(notes, allSuggestions, manualEdges) {
  const linkSet = new Set();
  [...(allSuggestions || []), ...(manualEdges || [])].forEach(s => {
    linkSet.add(`${s.source}-${s.target}`);
    linkSet.add(`${s.target}-${s.source}`);
  });
  const noteIds = new Set(notes.map(n => n.id));
  const clusters = [];
  const assigned = new Set();
  for (const note of notes) {
    if (assigned.has(note.id)) continue;
    const cluster = [note.id];
    assigned.add(note.id);
    let changed = true;
    while (changed) {
      changed = false;
      for (const other of notes) {
        if (assigned.has(other.id)) continue;
        if (cluster.some(id => linkSet.has(`${id}-${other.id}`))) {
          cluster.push(other.id);
          assigned.add(other.id);
          changed = true;
        }
      }
    }
    clusters.push(cluster);
  }
  const positions = {};
  let xOff = 50;
  clusters.forEach((cluster, ci) => {
    cluster.forEach((id, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      positions[id] = {
        x: xOff + col * (NODE_WIDTH + GAP_X),
        y: 60 + row * (NODE_HEIGHT + GAP_Y),
      };
    });
    xOff += Math.min(cluster.length, 3) * (NODE_WIDTH + GAP_X) + 60;
  });
  notes.forEach(n => { if (!positions[n.id]) positions[n.id] = { x: xOff, y: 60 }; xOff += NODE_WIDTH + GAP_X; });
  return { positions, tagHeaders: {} };
}

function arrangeByTag(notes, activeId) {
  const tagMap = {};
  notes.forEach(note => {
    const tags = note.tags && note.tags.length ? note.tags : ['_untagged'];
    tags.forEach(tag => {
      if (!tagMap[tag]) tagMap[tag] = [];
      tagMap[tag].push(note);
    });
  });
  const allTagKeys = Object.keys(tagMap);
  let xOff = 50;
  const positions = {};
  allTagKeys.forEach(tag => {
    const group = tagMap[tag];
    const headerY = 40;
    group.forEach((note, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      positions[note.id] = {
        x: xOff + col * (NODE_WIDTH + GAP_X),
        y: headerY + 60 + row * (NODE_HEIGHT + GAP_Y),
      };
    });
    xOff += 3 * (NODE_WIDTH + GAP_X);
  });
  const tagHeaders = {};
  allTagKeys.forEach(tag => {
    const ids = tagMap[tag].map(n => n.id);
    const xs = ids.map(id => positions[id]?.x || 0).filter(Boolean);
    if (xs.length) {
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      tagHeaders[tag] = {
        id: `_taggroup_${tag}`,
        type: 'default',
        position: { x: minX + (maxX - minX + NODE_WIDTH) / 2 - 80, y: 10 },
        data: { label: `#${tag}` },
        draggable: false,
        style: {
          background: 'var(--color-surface-card)',
          border: '2px solid var(--color-accent)',
          borderRadius: '16px',
          padding: '6px 16px',
          fontSize: '13px',
          color: 'var(--color-accent)',
          fontWeight: 600,
        },
      };
    }
  });
  return { positions, tagHeaders };
}

function arrangeByDate(notes) {
  const sorted = [...notes].sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
  const positions = {};
  sorted.forEach((note, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    positions[note.id] = {
      x: 50 + col * (NODE_WIDTH + GAP_X),
      y: 50 + row * (NODE_HEIGHT + GAP_Y),
    };
  });
  return { positions, tagHeaders: {} };
}

function arrangeRadial(notes, activeId) {
  const active = notes.find(n => n.id === activeId);
  const cx = active?.position?.x || 400;
  const cy = active?.position?.y || 300;
  const others = notes.filter(n => n.id !== activeId);
  const radius = Math.max(200, others.length * 30);
  const positions = {};
  if (active) positions[activeId] = active.position || { x: cx, y: cy };
  others.forEach((note, i) => {
    const angle = (2 * Math.PI * i) / (others.length || 1);
    positions[note.id] = {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });
  return { positions, tagHeaders: {} };
}

function CanvasFlow({ notes, activeId, onSelect, onNodeDragStop, focusTag, onFocusTag, onClearFocusTag, updateNote, suggestions, healthMap }) {
  const [connectMode, setConnectMode] = useState(false);
  const [connectSource, setConnectSource] = useState(null);
  const [layoutMode, setLayoutMode] = useState('none');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [clusterMode, setClusterMode] = useState(false);
  const [showSynthPanel, setShowSynthPanel] = useState(false);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState([]);
  const [manualEdges, setManualEdges] = useLocalStorage('crescendo-canvas-edges', []);
  const synthPanelRef = useRef(null);
  const { fitView } = useReactFlow();

  // Clean orphaned edges (source or target note no longer exists)
  const validManualEdges = useMemo(() => {
    const noteIds = new Set(notes.map(n => n.id));
    return manualEdges.filter(e => noteIds.has(e.source) && noteIds.has(e.target));
  }, [manualEdges, notes]);
  // Auto-clean orphaned edges from storage
  useEffect(() => {
    if (validManualEdges.length !== manualEdges.length) {
      setManualEdges(validManualEdges);
    }
  }, [validManualEdges, manualEdges, setManualEdges]);

  const appliedLayout = useMemo(() => {
    if (clusterMode && suggestions?.length > 0) {
      return arrangeCluster(notes, suggestions, validManualEdges);
    }
    if (layoutMode === 'none') {
      const positions = {};
      let gridIdx = 0;
      notes.forEach(n => {
        if (n.position) {
          positions[n.id] = n.position;
        } else {
          const col = gridIdx % 3;
          const row = Math.floor(gridIdx / 3);
          positions[n.id] = {
            x: col * (NODE_WIDTH + 40) + 50,
            y: row * (NODE_HEIGHT + 40) + 50,
          };
          gridIdx++;
        }
      });
      return { positions, tagHeaders: {} };
    }
    if (layoutMode === 'by-tag') return arrangeByTag(notes, activeId);
    if (layoutMode === 'by-date') return arrangeByDate(notes);
    if (layoutMode === 'radial') return arrangeRadial(notes, activeId);
    return { positions: {}, tagHeaders: {} };
  }, [notes, activeId, layoutMode, clusterMode, suggestions, validManualEdges]);

  useEffect(() => {
    if (layoutMode !== 'none' || clusterMode) {
      setTimeout(() => fitView({ duration: 300 }), 50);
    }
  }, [layoutMode, clusterMode, fitView]);

  const flowNodes = useMemo(() => {
    const nodes = notes.map(note => ({
      id: note.id,
      type: 'noteNode',
      position: appliedLayout.positions[note.id] || note.position || { x: 0, y: 0 },
      data: {
        note,
        isActive: note.id === activeId,
        onClick: onSelect,
        onTagClick: onFocusTag,
      },
    }));
    const headers = Object.values(appliedLayout.tagHeaders);
    return [...nodes, ...headers];
  }, [notes, activeId, onSelect, onFocusTag, appliedLayout]);

  const tagEdges = useMemo(() => {
    if (!focusTag) return [];
    const edges = [];
    for (const note of notes) {
      if (!note.tags?.length) continue;
      for (const tag of note.tags) {
        if (tag === focusTag) {
          edges.push({
            id: `${tag}->${note.id}`,
            source: tag,
            target: note.id,
            animated: true,
            style: { stroke: 'var(--color-accent)', strokeWidth: 2, opacity: 0.5 },
          });
        }
      }
    }
    const tagNodes = [...new Set(edges.map(e => e.source))];
    return [
      ...edges,
      ...tagNodes.map(tag => ({ id: `${tag}->self`, source: tag, target: tag, hidden: true })),
    ];
  }, [notes, focusTag]);

  const suggestionEdgeData = useMemo(() => {
    if (!showSuggestions || !suggestions?.length) return [];
    const acceptedSet = new Set(acceptedSuggestions.map(s => `${s.source}-${s.target}`));
    return suggestions
      .filter(s => !acceptedSet.has(`${s.source}-${s.target}`))
      .map(s => ({
        id: `suggest_${s.source}_${s.target}`,
        source: s.source,
        target: s.target,
        style: {
          stroke: s.type === 'strong' ? 'var(--color-accent)' : 'var(--color-text-muted)',
          strokeWidth: s.type === 'strong' ? 2 : 1,
          strokeDasharray: '8 4',
          opacity: 0.6,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: s.type === 'strong' ? 'var(--color-accent)' : 'var(--color-text-muted)' },
        animated: true,
        data: { suggestion: true, ...s },
      }));
  }, [showSuggestions, suggestions, acceptedSuggestions]);

  const manualEdgeData = useMemo(() =>
    validManualEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      style: { stroke: 'var(--color-warm)', strokeWidth: 2, strokeDasharray: '6 3' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-warm)' },
      animated: false,
    })),
  [validManualEdges]);

  const allNodes = useMemo(() => {
    const extraTagNodeSet = new Set();
    tagEdges.forEach(e => {
      if (!flowNodes.find(n => n.id === e.source)) {
        extraTagNodeSet.add(e.source);
      }
    });
    const extraTagNodes = [...extraTagNodeSet].map((tag, i) => {
      const connectedNotes = flowNodes.filter(n => tagEdges.some(e => e.source === tag && e.target === n.id));
      let x, y;
      if (connectedNotes.length > 0) {
        const minY = Math.min(...connectedNotes.map(n => n.position.y));
        const minX = Math.min(...connectedNotes.map(n => n.position.x));
        const maxX = Math.max(...connectedNotes.map(n => n.position.x + NODE_WIDTH));
        x = minX + (maxX - minX) / 2 - 60 * extraTagNodeSet.size + i * 130;
        y = minY - 80;
      } else {
        x = 80 + i * 130;
        y = 40;
      }
      return {
        id: tag,
        type: 'default',
        position: { x, y },
        data: { label: `#${tag}` },
        draggable: false,
        style: {
          background: 'var(--color-surface-card)',
          border: '2px solid var(--color-accent)',
          borderRadius: '16px',
          padding: '6px 14px',
          fontSize: '13px',
          color: 'var(--color-accent)',
          fontWeight: 600,
        },
      };
    });

    const noteNodes = flowNodes.map(node => {
      if (!focusTag) return node;
      const hasTag = node.data.note.tags?.includes(focusTag);
      return {
        ...node,
        style: hasTag ? undefined : { opacity: 0.25, pointerEvents: 'none' },
      };
    });
    return [...noteNodes, ...extraTagNodes];
  }, [flowNodes, tagEdges, focusTag]);

  const allFlowEdges = useMemo(() => [...tagEdges, ...manualEdgeData, ...suggestionEdgeData], [tagEdges, manualEdgeData, suggestionEdgeData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(allNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(allFlowEdges);

  useEffect(() => {
    setNodes(allNodes);
    setEdges(allFlowEdges);
  }, [allNodes, allFlowEdges, setNodes, setEdges]);

  const handleNodeDragStop = useCallback((event, node) => {
    if (node.type === 'noteNode') {
      onNodeDragStop?.(node.id, node.position);
      const dropped = notes.find(n => n.id === node.id);
      if (!dropped) return;
      const near = notes.find(n =>
        n.id !== node.id &&
        Math.abs(n.position?.x - node.position.x) < GROUP_SNAP &&
        Math.abs(n.position?.y - node.position.y) < GROUP_SNAP
      );
      if (near && (!dropped.group || dropped.group !== near.group)) {
        const groupId = dropped.group || near.group || `group_${Date.now()}`;
        if (!dropped.group) updateNote?.(dropped.id, { group: groupId });
        if (!near.group) updateNote?.(near.id, { group: groupId });
      }
    }
  }, [onNodeDragStop, notes, updateNote]);

  const handleNodeClick = useCallback((event, node) => {
    if (!connectMode) return;
    if (node.type !== 'noteNode') return;
    if (!connectSource) {
      setConnectSource(node.id);
      return;
    }
    if (connectSource === node.id) {
      setConnectSource(null);
      return;
    }
    const newEdge = { id: genEdgeId(), source: connectSource, target: node.id };
    setManualEdges(prev => [...prev, newEdge]);
    setConnectSource(null);
  }, [connectMode, connectSource, setManualEdges]);

  const handleConnectClick = useCallback(() => {
    setConnectMode(c => !c);
    setConnectSource(null);
  }, []);

  const handleLayoutClick = useCallback((mode) => {
    setLayoutMode(prev => prev === mode ? 'none' : mode);
  }, []);

  const clearManualEdges = useCallback(() => setManualEdges([]), [setManualEdges]);
  const [synthTooltip, setSynthTooltip] = useState(null);

  const handleEdgeMouseEnter = useCallback((event, edge) => {
    if (edge.data?.suggestion && edge.data.reasons?.length) {
      const rect = event.target?.closest('.react-flow__edge')?.getBoundingClientRect();
      setSynthTooltip({
        x: rect ? rect.left + rect.width / 2 : event.clientX,
        y: rect ? rect.top - 8 : event.clientY,
        reasons: edge.data.reasons,
        strength: edge.data.strength,
        type: edge.data.type,
      });
    }
  }, []);

  const handleEdgeMouseLeave = useCallback(() => {
    setSynthTooltip(null);
  }, []);

  if (notes.length === 0) {
    return (
      <div className="canvas-view">
        <div className="canvas-view__empty">
          <p className="canvas-view__empty-title">Canvas is empty</p>
          <p className="canvas-view__empty-hint">Notes you create will appear here as draggable cards</p>
          <div className="welcome__hints" style={{ marginTop: '1rem' }}>
            <kbd>Ctrl+N</kbd> New note &middot; <kbd>Ctrl+2</kbd> Back to canvas
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="canvas-view">
      <div className="canvas-view__toolbar">
        <button
          className={`canvas-view__tool ${connectMode ? 'canvas-view__tool--active' : ''}`}
          onClick={handleConnectClick}
          title={connectMode ? 'Exit connect mode' : 'Connect notes (click two notes to create edge)'}
          aria-label="Toggle connect mode"
        >
          {connectMode ? '✕ Connect' : '⊕ Connect'}
        </button>
        <span className="canvas-view__tool-sep" />
        <button
          className={`canvas-view__tool${layoutMode === 'by-tag' ? ' canvas-view__tool--active' : ''}`}
          onClick={() => handleLayoutClick('by-tag')}
          title="Arrange by tag"
          aria-label="Arrange by tag"
        >
          ⊞ By Tag
        </button>
        <button
          className={`canvas-view__tool${layoutMode === 'by-date' ? ' canvas-view__tool--active' : ''}`}
          onClick={() => handleLayoutClick('by-date')}
          title="Arrange by date"
          aria-label="Arrange by date"
        >
          ⊟ By Date
        </button>
        <button
          className={`canvas-view__tool${layoutMode === 'radial' ? ' canvas-view__tool--active' : ''}`}
          onClick={() => handleLayoutClick('radial')}
          title="Radial layout around active note"
          aria-label="Radial layout"
        >
          ◎ Radial
        </button>
          {manualEdges.length > 0 && (
            <>
              <span className="canvas-view__tool-sep" />
              <button
                className="canvas-view__tool"
                onClick={clearManualEdges}
                title="Clear all manual connections"
                aria-label="Clear all manual connections"
              >
                ✕ Clear Edges
              </button>
            </>
          )}
          {suggestions?.length > 0 && (
            <>
              <span className="canvas-view__tool-sep" />
              <button
                className={`canvas-view__tool${showSuggestions ? ' canvas-view__tool--active' : ''}`}
                onClick={() => setShowSuggestions(s => !s)}
                title="Show AI-suggested connections"
                aria-label="Toggle suggested connections"
              >
                ✦ Traces ({suggestions.length})
              </button>
              <button
                className={`canvas-view__tool${showSynthPanel ? ' canvas-view__tool--active' : ''}`}
                onClick={() => setShowSynthPanel(s => !s)}
                title="Open synthesis panel"
                aria-label="Toggle synthesis panel"
              >
                ☰ Panel
              </button>
              <button
                className={`canvas-view__tool${clusterMode ? ' canvas-view__tool--active' : ''}`}
                onClick={() => setClusterMode(c => !c)}
                title="Cluster notes by synthesis connections"
                aria-label="Toggle cluster by synthesis"
              >
                ⊞ Cluster
              </button>
            </>
          )}
        </div>
      {connectSource && (
        <div className="canvas-view__connect-hint">
          Click another note to connect &quot;{(notes.find(n => n.id === connectSource)?.title || '')}&quot;
        </div>
      )}
      {focusTag && (
        <div className="canvas-view__focus-banner">
          <span>Filtering by: <strong>#{focusTag}</strong></span>
          <button
            className="canvas-view__focus-clear"
            onClick={onClearFocusTag}
            title="Clear filter"
            aria-label="Clear focus filter"
          >
            ✕
          </button>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={handleNodeClick}
        onEdgeClick={(event, edge) => {
          if (edge.data?.suggestion) {
            const newEdge = { id: genEdgeId(), source: edge.source, target: edge.target };
            setManualEdges(prev => [...prev, newEdge]);
            setAcceptedSuggestions(prev => [...prev, { source: edge.source, target: edge.target }]);
          }
        }}
        onEdgeMouseEnter={handleEdgeMouseEnter}
        onEdgeMouseLeave={handleEdgeMouseLeave}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={n => n.data?.note?.color || 'var(--color-accent)'}
        />
      </ReactFlow>
      {synthTooltip && (
        <div
          className="canvas-view__tooltip"
          style={{ left: synthTooltip.x, top: synthTooltip.y }}
        >
          <div className="canvas-view__tooltip-header">
            <span className={`canvas-view__tooltip-badge canvas-view__tooltip-badge--${synthTooltip.type}`}>
              {synthTooltip.type === 'strong' ? '✦ Strong' : '○ Weak'}
            </span>
            <span className="canvas-view__tooltip-score">
              {(synthTooltip.strength * 100).toFixed(0)}%
            </span>
          </div>
          <div className="canvas-view__tooltip-reasons">
            {synthTooltip.reasons.map((r, i) => (
              <div key={i} className="canvas-view__tooltip-reason">
                <span className="canvas-view__tooltip-icon">{r.icon}</span>
                <span>{r.label}{r.type ? ` (${r.type})` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {showSynthPanel && (
        <div className="canvas-view__synth-overlay" onClick={() => setShowSynthPanel(false)}>
          <div className="canvas-view__synth-panel" ref={synthPanelRef} onClick={e => e.stopPropagation()}>
            <div className="canvas-view__synth-header">
              <h3 className="canvas-view__synth-title">🧩 Synthesis Web</h3>
              <span className="canvas-view__synth-count">
                <span className="canvas-view__synth-count--strong">{suggestions?.filter(s => s.type === 'strong').length || 0} strong</span>
                {' / '}
                <span className="canvas-view__synth-count--weak">{suggestions?.filter(s => s.type !== 'strong').length || 0} weak</span>
              </span>
              <button
                className="canvas-view__synth-close"
                onClick={() => setShowSynthPanel(false)}
                aria-label="Close synthesis panel"
              >
                ✕
              </button>
            </div>
            <div className="canvas-view__synth-list">
              {suggestions?.map((s, i) => {
                const isAccepted = acceptedSuggestions.some(a => a.source === s.source && a.target === s.target);
                return (
                  <div key={i} className={`canvas-view__synth-item${isAccepted ? ' canvas-view__synth-item--accepted' : ''}`}>
                    <div className="canvas-view__synth-item-header">
                      <span className={`canvas-view__synth-item-badge canvas-view__synth-item-badge--${s.type}`}>
                        {s.type === 'strong' ? '✦' : '○'}
                      </span>
                      <span className="canvas-view__synth-item-source" title={s.sourceTitle || s.source}>
                        {s.sourceTitle || s.source}
                      </span>
                      <span className="canvas-view__synth-item-arrow">→</span>
                      <span className="canvas-view__synth-item-target" title={s.targetTitle || s.target}>
                        {s.targetTitle || s.target}
                      </span>
                    </div>
                    <div className="canvas-view__synth-item-strength">
                      <div
                        className="canvas-view__synth-item-bar"
                        style={{ width: `${(s.strength * 100).toFixed(0)}%` }}
                      />
                    </div>
                    <div className="canvas-view__synth-item-reasons">
                      {s.reasons?.map((r, ri) => (
                        <span key={ri} className="canvas-view__synth-item-reason">
                          {r.icon} {r.label}
                        </span>
                      ))}
                    </div>
                    <div className="canvas-view__synth-item-actions">
                      {isAccepted ? (
                        <span className="canvas-view__synth-item-accepted-label">✓ Accepted</span>
                      ) : (
                        <>
                          <button
                            className="canvas-view__synth-btn canvas-view__synth-btn--accept"
                            onClick={() => {
                              const newEdge = { id: genEdgeId(), source: s.source, target: s.target };
                              setManualEdges(prev => [...prev, newEdge]);
                              setAcceptedSuggestions(prev => [...prev, { source: s.source, target: s.target }]);
                            }}
                          >
                            Accept
                          </button>
                          <button
                            className="canvas-view__synth-btn canvas-view__synth-btn--reject"
                            onClick={() => setAcceptedSuggestions(prev => [...prev, { source: s.source, target: s.target }])}
                          >
                            Dismiss
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="canvas-view__synth-footer">
              <button
                className="canvas-view__synth-btn canvas-view__synth-btn--accept"
                onClick={() => {
                  suggestions.forEach(s => {
                    if (!acceptedSuggestions.some(a => a.source === s.source && a.target === s.target)) {
                      const newEdge = { id: genEdgeId(), source: s.source, target: s.target };
                      setManualEdges(prev => [...prev, newEdge]);
                    }
                  });
                  setAcceptedSuggestions(suggestions.map(s => ({ source: s.source, target: s.target })));
                }}
              >
                ✓ Accept All
              </button>
              <button
                className="canvas-view__synth-btn canvas-view__synth-btn--reject"
                onClick={() => setAcceptedSuggestions(suggestions.map(s => ({ source: s.source, target: s.target })))}
              >
                ✕ Dismiss All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CanvasView(props) {
  return (
    <ReactFlowProvider>
      <CanvasFlow {...props} />
    </ReactFlowProvider>
  );
}
