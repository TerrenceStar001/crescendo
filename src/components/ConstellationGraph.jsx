import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import useGraphData from '../hooks/useGraphData';
import { useView } from '../context/ViewContext';

const BG_LIGHT = '#d8d2ca';
const BG_DARK = '#080818';

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.15, 'rgba(255,255,255,0.7)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const glowTexture = createGlowTexture();

export default function ConstellationGraph({ notes, activeId, onSelect, onFocusTag, focusTag, onClearFocusTag }) {
  const { theme } = useView();
  const containerRef = useRef();
  const fgRef = useRef();
  const graphData = useGraphData(notes);
  const [dims, setDims] = useState({ width: 800, height: 600 });
  const bloomRef = useRef(null);
  const hoveredNodeRef = useRef(null);

  const bgColor = theme === 'dark' ? BG_DARK : BG_LIGHT;

  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        setDims({ width: w, height: h });
        if (bloomRef.current) {
          bloomRef.current.resolution.set(w, h);
        }
      }
    });
    observer.observe(el);
    setDims({ width: el.clientWidth, height: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  // Reduce charge to bring clusters closer
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('link')?.distance(80);
      fgRef.current.d3Force('charge')?.strength(-80);
      fgRef.current.d3Force('center')?.strength(0.4);
      fgRef.current.zoomToFit(400, 60);
    }
  }, []);

  // Bloom post-processing
  useEffect(() => {
    let bloomPass, outputPass, composer;
    let cancelled = false;

    (async () => {
      try {
        const [{ UnrealBloomPass }, { OutputPass }] = await Promise.all([
          import('three/addons/postprocessing/UnrealBloomPass.js'),
          import('three/addons/postprocessing/OutputPass.js')
        ]);

        if (cancelled) return;

        const fg = fgRef.current;
        if (!fg || !fg.postProcessingComposer) return;
        composer = fg.postProcessingComposer();
        if (!composer) return;

        const isDarkBloom = theme === 'dark';
        bloomPass = new UnrealBloomPass(
          new THREE.Vector2(dims.width, dims.height),
          isDarkBloom ? 0.4 : 0.04,
          0.15,
          isDarkBloom ? 0.1 : 0.7
        );
        composer.addPass(bloomPass);
        outputPass = new OutputPass();
        composer.addPass(outputPass);
        bloomRef.current = bloomPass;
      } catch (e) {
        console.warn('Bloom setup failed:', e);
      }
    })();

    return () => {
      cancelled = true;
      if (bloomRef.current && composer) {
        const idx = composer.passes.indexOf(bloomRef.current);
        if (idx >= 0) composer.passes.splice(idx, 2);
        if (bloomRef.current) bloomRef.current.dispose();
        bloomRef.current = null;
      }
    };
  }, [theme, dims.width, dims.height]);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || !fg.scene) return;
    const scene = fg.scene();
    const isDark = theme === 'dark';

    scene.fog = new THREE.FogExp2(isDark ? 0x080818 : 0xd8d2ca, 0.00035);

    const starBlend = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;

    const cloudGroup = new THREE.Group();
    const cloudColors = isDark
      ? [0x4433aa, 0x224488, 0x445577]
      : [0xbbbcee, 0xccddff, 0xddddff];
    const cloudPositions = [
      [-250, -80, -500],
      [180, 120, -600],
      [-80, -180, -700],
    ];
    cloudColors.forEach((color, i) => {
      const geo = new THREE.SphereGeometry(180 + Math.random() * 120, 20, 20);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: isDark ? 0.04 : 0.03,
        side: THREE.BackSide,
        blending: starBlend,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cloudPositions[i][0], cloudPositions[i][1], cloudPositions[i][2]);
      cloudGroup.add(mesh);
    });
    scene.add(cloudGroup);

    const farStarCount = 1500;
    const farStarGeo = new THREE.BufferGeometry();
    const farStarPos = new Float32Array(farStarCount * 3);
    const farStarSizes = new Float32Array(farStarCount);
    for (let i = 0; i < farStarCount; i++) {
      const radius = 1500 + Math.random() * 2500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      farStarPos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      farStarPos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      farStarPos[i * 3 + 2] = radius * Math.cos(phi);
      farStarSizes[i] = Math.random() * 0.6 + 0.05;
    }
    farStarGeo.setAttribute('position', new THREE.BufferAttribute(farStarPos, 3));
    farStarGeo.setAttribute('size', new THREE.BufferAttribute(farStarSizes, 1));
    const farStarMat = new THREE.PointsMaterial({
      color: isDark ? 0x8888cc : 0x222244,
      size: 0.2,
      transparent: true,
      opacity: isDark ? 0.5 : 0.35,
      sizeAttenuation: true,
      blending: starBlend,
      depthWrite: false,
    });
    const farStars = new THREE.Points(farStarGeo, farStarMat);
    scene.add(farStars);

    const starCount = 600;
    const starsGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      const radius = 500 + Math.random() * 800;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      const tint = Math.random();
      if (tint < 0.5) {
        colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
      } else if (tint < 0.75) {
        colors[i * 3] = 0.85; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 1;
      } else {
        colors[i * 3] = 1; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 0.75;
      }
      sizes[i] = Math.random() * 1.5 + 0.2;
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const starsMaterial = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: isDark ? 0.8 : 0.5,
      sizeAttenuation: true,
      blending: starBlend,
      depthWrite: false,
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    const dustCount = 2000;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    const dustSizes = new Float32Array(dustCount);
    for (let i = 0; i < dustCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 60 + Math.random() * 300;
      const y = (Math.random() - 0.5) * 200;
      dustPos[i * 3] = Math.cos(angle) * r;
      dustPos[i * 3 + 1] = y;
      dustPos[i * 3 + 2] = Math.sin(angle) * r;
      dustSizes[i] = Math.random() * 0.4 + 0.05;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    dustGeo.setAttribute('size', new THREE.BufferAttribute(dustSizes, 1));
    const dustMat = new THREE.PointsMaterial({
      color: isDark ? 0x8888ff : 0x444488,
      size: 0.15,
      transparent: true,
      opacity: isDark ? 0.3 : 0.2,
      sizeAttenuation: true,
      blending: starBlend,
      depthWrite: false,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    let animId;
    let startTime = Date.now();
    const animate = () => {
      const t = Date.now() - startTime;
      farStars.rotation.y += 0.00008;
      stars.rotation.y += 0.0002;
      dust.rotation.y += 0.0006;
      cloudGroup.rotation.y += 0.00003;
      starsMaterial.opacity = isDark
        ? 0.7 + Math.sin(t * 0.0005) * 0.1
        : 0.4 + Math.sin(t * 0.0005) * 0.1;
      if (bloomRef.current) {
        const base = isDark ? 0.4 : 0.04;
        bloomRef.current.strength = base + Math.sin(t * 0.0003) * 0.02;
      }
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      scene.fog = null;
      scene.remove(cloudGroup);
      scene.remove(farStars);
      scene.remove(stars);
      scene.remove(dust);
      cloudGroup.children.forEach(c => {
        c.geometry.dispose();
        c.material.dispose();
      });
      farStarGeo.dispose();
      farStarMat.dispose();
      starsGeometry.dispose();
      starsMaterial.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      cancelAnimationFrame(animId);
    };
  }, [theme]);

  const focusedNodeIds = useMemo(() => {
    if (!focusTag) return null;
    const tagExists = graphData.nodes.some(n => n.id === `tag:${focusTag}`);
    if (!tagExists) return null;
    const ids = new Set();
    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      if (sourceId === `tag:${focusTag}`) ids.add(targetId);
      if (targetId === `tag:${focusTag}`) ids.add(sourceId);
    });
    ids.add(`tag:${focusTag}`);
    return ids;
  }, [focusTag, graphData.links, graphData.nodes]);

  // Wait for force simulation to compute positions before zooming to tag
  const simReadyRef = useRef(false);
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    // ForceGraph3D calls onEngineTick; use first tick as signal that positions exist
    const onTick = () => {
      if (!simReadyRef.current) {
        simReadyRef.current = true;
        setTimeout(() => {
          if (!focusTag || !fgRef.current) return;
          const tagNode = graphData.nodes.find(n => n.id === `tag:${focusTag}`);
          if (!tagNode || tagNode.x === undefined) {
            fgRef.current.zoomToFit(400, 60);
            return;
          }
          const linkedNodes = graphData.nodes.filter(n =>
            focusedNodeIds?.has(n.id) && n.id !== `tag:${focusTag}`
          );
          const allRelevant = [tagNode, ...linkedNodes];
          if (allRelevant.length <= 1) {
            fgRef.current.cameraPosition(
              { x: tagNode.x, y: tagNode.y, z: tagNode.z + 120 },
              { x: tagNode.x, y: tagNode.y, z: tagNode.z },
              800
            );
            return;
          }
          const xs = allRelevant.map(n => n.x);
          const ys = allRelevant.map(n => n.y);
          const zs = allRelevant.map(n => n.z);
          const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
          const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
          const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
          const dist = Math.max(
            Math.max(...xs) - Math.min(...xs),
            Math.max(...ys) - Math.min(...ys),
            200
          ) * 1.6;
          fgRef.current.cameraPosition(
            { x: cx, y: cy, z: cz + dist },
            { x: cx, y: cy, z: cz },
            800
          );
        }, 600);
      }
    };
    // @ts-ignore - onEngineTick is undocumented but available
    if (fg.onEngineTick) fg.onEngineTick(onTick);
  }, []); // only once on mount

  // Reset simReady when focusTag changes for a new zoom
  useEffect(() => {
    simReadyRef.current = false;
    setTimeout(() => {
      if (!focusTag && fgRef.current) {
        fgRef.current.zoomToFit(400, 60);
      }
    }, 100);
  }, [focusTag]);

  const handleBackgroundClick = useCallback(() => {
    if (focusTag) {
      onClearFocusTag?.();
    } else if (fgRef.current) {
      fgRef.current.zoomToFit(400, 60);
    }
  }, [focusTag, onClearFocusTag]);

  const handleNodeClick = useCallback((node) => {
    if (!node) return;
    if (node.type === 'note' && node.note) {
      onSelect?.(node.note.id);
      fgRef.current.cameraPosition(
        { x: node.x, y: node.y, z: node.z + 150 },
        { x: node.x, y: node.y, z: node.z },
        800
      );
    }
    if (node.type === 'tag' && node.tagData) {
      onFocusTag?.(node.tagData.label);
    }
  }, [onSelect, onFocusTag]);

  const handleNodeHover = useCallback((node) => {
    hoveredNodeRef.current = node;
  }, []);

  const linkColor = useCallback((link) => {
    const src = link.source;
    const tgt = link.target;
    const tag = src?.type === 'tag' ? src : tgt?.type === 'tag' ? tgt : null;
    const dimmed = focusTag && focusedNodeIds
      ? !(focusedNodeIds.has(src?.id || src) && focusedNodeIds.has(tgt?.id || tgt))
      : false;
    return dimmed ? '#444' : (tag?.color || (theme === 'dark' ? '#6688bb' : '#334488'));
  }, [theme, focusTag, focusedNodeIds]);

  const linkWidth = useCallback((link) => {
    const src = link.source;
    const tgt = link.target;
    const tag = src?.type === 'tag' ? src : tgt;
    return tag?.val ? Math.min(3, 0.5 + tag.val * 0.04) : 1;
  }, []);

  const linkMaterial = useCallback((link) => {
    const isDark = theme === 'dark';
    const dimmed = focusTag && focusedNodeIds
      ? !(focusedNodeIds.has(link.source?.id || link.source) && focusedNodeIds.has(link.target?.id || link.target))
      : false;
    const src = link.source;
    const tgt = link.target;
    const tag = src?.type === 'tag' ? src : tgt?.type === 'tag' ? tgt : null;
    const c = tag?.color || null;
    const color = c ? new THREE.Color(c) : new THREE.Color(isDark ? 0x6688cc : 0x445588);
    if (!isDark) color.multiplyScalar(0.25);
    const baseOpacity = isDark
      ? (tag?.val ? Math.min(0.5, 0.15 + tag.val * 0.01) : 0.2)
      : (tag?.val ? Math.min(0.85, 0.3 + tag.val * 0.015) : 0.5);
    return new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: dimmed ? baseOpacity * 0.1 : baseOpacity,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });
  }, [theme, focusTag, focusedNodeIds]);

  function createTextSprite(text, isNote, isDark, dimmed) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    const size = 40;
    ctx.font = `bold ${size}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxWidth = 480;
    let displayText = text || '';
    if (ctx.measureText(displayText).width > maxWidth) {
      while (ctx.measureText(displayText + '…').width > maxWidth && displayText.length > 1) {
        displayText = displayText.slice(0, -1);
      }
      displayText += '…';
    }
    const textColor = isDark ? '#ffffff' : '#222222';
    // Subtle glow shadow for readability + bloom integration
    ctx.shadowColor = isDark ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.8)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = textColor;
    ctx.globalAlpha = dimmed ? 0.2 : 1;
    ctx.fillText(displayText, 256, 64);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.fillText(displayText, 256, 64);
    ctx.globalAlpha = 1;
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: dimmed ? 0.25 : 1,
      sizeAttenuation: true,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const sprite = new THREE.Sprite(mat);
    const s = isNote ? 85 : 75;
    sprite.scale.set(s, s * 0.25, 1);
    return sprite;
  }

  const isDimmed = useCallback((node) => {
    return focusTag && focusedNodeIds && !focusedNodeIds.has(node.id);
  }, [focusTag, focusedNodeIds]);

  const nodeThreeObjectExtend = useCallback((node) => {
    const isDark = theme === 'dark';
    const dimmed = isDimmed(node);
    const color = new THREE.Color(node.color);
    if (!isDark) color.multiplyScalar(0.5);
    if (dimmed) color.multiplyScalar(0.2);
    const isNote = node.type === 'note';
    const nodeSize = isNote
      ? Math.max(30, node.val * 2.5)
      : Math.max(12, node.val * 0.5);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color,
        transparent: true,
        opacity: dimmed ? 0.12 : (isDark ? 0.5 : 0.4),
        blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: false,
      })
    );
    sprite.scale.set(nodeSize * 1.5, nodeSize * 1.5, 1);
    return sprite;
  }, [theme, isDimmed]);

  const nodeThreeObject = useCallback((node) => {
    const isDark = theme === 'dark';
    const dimmed = isDimmed(node);
    const color = new THREE.Color(node.color);
    if (!isDark) color.multiplyScalar(0.4);
    if (dimmed) color.multiplyScalar(0.15);
    const isNote = node.type === 'note';
    const r = isNote
      ? Math.max(12, node.val * 1.0)
      : Math.max(5, node.val * 0.3);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(r, 8, 8),
      new THREE.MeshBasicMaterial({ color })
    );
    const label = node.label || (isNote ? '' : node.id?.replace('tag:', '') || '');
    if (!label) return mesh;
    const group = new THREE.Group();
    group.add(mesh);
    const sprite = createTextSprite(label, isNote, isDark, dimmed);
    sprite.position.y = -(isNote ? r + 18 : r + 16);
    group.add(sprite);
    return group;
  }, [theme, isDimmed]);

  if (!graphData.nodes.length) {
    return (
      <div className="constellation-empty">
        <p>No tags to visualize yet</p>
        <p className="constellation-empty__hint">Add tags to your notes to see them in the constellation</p>
        <button
          className="constellation-empty__btn"
          onClick={() => onSelect?.(notes[0]?.id)}
          style={{ display: notes.length > 0 ? 'inline-block' : 'none' }}
        >
          {notes.length > 0 ? 'Open latest note' : 'Create your first note'}
        </button>
        <div className="welcome__hints" style={{ marginTop: '1rem', display: notes.length === 0 ? 'block' : 'none' }}>
          <kbd>Ctrl+N</kbd> New note &middot; <kbd>Ctrl+3</kbd> Back to graph
        </div>
      </div>
    );
  }

  return (
    <div className="constellation-graph" ref={containerRef} role="img" aria-label="3D constellation graph of notes and tags">
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
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeLabel={node => node.label || ''}
        nodeColor={node => node.color}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkMaterial={linkMaterial}
        linkDirectionalParticles={4}
        linkDirectionalParticleWidth={5}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleColor={linkColor}
        linkDirectionalArrowLength={0}
        linkCurvature={0.12}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={nodeThreeObjectExtend}
        backgroundColor={bgColor}
        showNavInfo={false}
        enableNodeDrag={false}
        enableNavigationControls
        controlType="orbit"
        d3AlphaDecay={0.015}
        d3VelocityDecay={0.3}
        minZoom={50}
        maxZoom={500}
        onBackgroundClick={handleBackgroundClick}
        width={dims.width}
        height={dims.height}
      />
      <div className="constellation-legend">
        <span className="constellation-legend__item">
          <span className="constellation-legend__dot constellation-legend__dot--tag" /> Tag
        </span>
        <span className="constellation-legend__item">
          <span className="constellation-legend__dot constellation-legend__dot--note" /> Note
        </span>
      </div>
    </div>
  );
}
