#!/usr/bin/env node
/**
 * excalidraw-mcp — local, dependency-free MCP server for the UX screen map.
 *
 * Implements getFullDiagramState, createNode, createEdge and deleteElement over
 * a persistent .excalidraw file, so agents can build and maintain the map
 * incrementally without network access or third-party servers.
 *
 * Usage: node ai-frontend-guide-kit/tools/excalidraw-mcp.mjs --diagram <path>
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const argv = process.argv.slice(2);
function arg(name, fallback) {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

const DIAGRAM_PATH = resolve(arg('--diagram', 'ai-frontend-output/ux/ux-map.excalidraw'));
const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: 'excalidraw-mcp', version: '1.0.0' };

const COLOR_PRESETS = {
  'light-purple': { stroke: '#9673a6', background: '#e1d5e7' },
  'light-blue': { stroke: '#6c8ebf', background: '#dae8fc' },
  'light-green': { stroke: '#82b366', background: '#d5e8d4' },
  'light-yellow': { stroke: '#d6b656', background: '#fff2cc' },
  'light-orange': { stroke: '#d79b00', background: '#ffe6cc' },
  'light-red': { stroke: '#b85450', background: '#f8cecc' },
  yellow: { stroke: '#d6b656', background: '#fff2cc' },
};
const SHAPES = ['rectangle', 'ellipse', 'diamond'];

const SCAFFOLD = {
  type: 'excalidraw',
  version: 2,
  source: 'https://excalidraw.com',
  elements: [],
  appState: { gridSize: null, viewBackgroundColor: '#ffffff' },
  files: {},
};

let idCounter = 0;
let nonce = Date.now() % 1000000;

function nextId(prefix, label) {
  idCounter += 1;
  const slug = String(label || 'element')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'element';
  return `${prefix}-${slug}-${idCounter}`;
}

function baseElement(id, type, x, y, width, height, colors, roundness) {
  nonce += 1;
  return {
    id,
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: colors.stroke,
    backgroundColor: colors.background,
    fillStyle: 'solid',
    strokeWidth: 1.4,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness,
    seed: nonce,
    version: 1,
    versionNonce: nonce,
    isDeleted: false,
    updated: Date.now(),
    link: null,
    locked: false,
  };
}

function estimateLabelSize(label, width) {
  const charsPerLine = Math.max(12, Math.floor((width - 24) / 8.5));
  let lines = 0;
  for (const rawLine of String(label).split('\n')) {
    lines += Math.max(1, Math.ceil(rawLine.length / charsPerLine));
  }
  return { height: Math.max(60, lines * 20 + 24) };
}

function loadDiagram() {
  if (!existsSync(DIAGRAM_PATH)) {
    mkdirSync(dirname(DIAGRAM_PATH), { recursive: true });
    writeFileSync(DIAGRAM_PATH, `${JSON.stringify(SCAFFOLD, null, 2)}\n`, 'utf8');
  }
  const parsed = JSON.parse(readFileSync(DIAGRAM_PATH, 'utf8').replace(/^\uFEFF/, ''));
  if (!Array.isArray(parsed.elements)) parsed.elements = [];
  parsed.files = parsed.files ?? {};
  parsed.appState = parsed.appState ?? SCAFFOLD.appState;
  return parsed;
}

function saveDiagram(diagram) {
  writeFileSync(DIAGRAM_PATH, `${JSON.stringify(diagram, null, 2)}\n`, 'utf8');
}

function actives(diagram) {
  return diagram.elements.filter((element) => !element.isDeleted);
}

function textOf(element) {
  return typeof element?.text === 'string' ? element.text : null;
}

function resolveElement(diagram, reference) {
  if (!reference) return null;
  const byId = actives(diagram).find((element) => element.id === reference);
  if (byId) {
    return byId.type === 'text' && byId.containerId
      ? actives(diagram).find((element) => element.id === byId.containerId) ?? byId
      : byId;
  }
  const wanted = String(reference);
  const textElement = actives(diagram).find((element) => {
    const text = textOf(element);
    return text === wanted || (typeof text === 'string' && text.split('\n')[0].trim() === wanted);
  });
  if (!textElement) return null;
  if (textElement.containerId) {
    return actives(diagram).find((element) => element.id === textElement.containerId) ?? textElement;
  }
  return textElement;
}

function nodeIndex(diagram) {
  return actives(diagram)
    .filter((element) => SHAPES.includes(element.type))
    .map((element) => {
      const bound = actives(diagram).find(
        (candidate) => candidate.type === 'text' && candidate.containerId === element.id,
      );
      return { element, label: textOf(bound) ?? element.id };
    });
}

function createNode(diagram, options) {
  const label = String(options.label || '').trim();
  if (!label) throw new Error('createNode requires a non-empty label.');
  const shape = SHAPES.includes(options.shape) ? options.shape : 'rectangle';
  const colors = COLOR_PRESETS[options.color] ?? COLOR_PRESETS['light-blue'];
  const width = Number(options.width) > 0 ? Number(options.width) : 280;
  const { height } = estimateLabelSize(label, width);
  const rightmost = actives(diagram).reduce(
    (max, element) => Math.max(max, (element.x ?? 0) + (element.width ?? 0)),
    -width,
  );
  const x = Number.isFinite(Number(options.x)) ? Number(options.x) : (actives(diagram).length ? rightmost + 80 : 0);
  const y = Number.isFinite(Number(options.y)) ? Number(options.y) : 0;
  const roundness = shape === 'rectangle' ? { type: 3 } : shape === 'ellipse' ? null : { type: 2 };
  const node = baseElement(nextId('node', label), shape, x, y, width, height, colors, roundness);
  node.link = options.link ?? null;
  const text = baseElement(nextId('text', label), 'text', x + 12, y + 12, width - 24, height - 24, {
    stroke: '#1e1e1e',
    background: 'transparent',
  }, null);
  text.text = label;
  text.originalText = label;
  text.fontSize = 16;
  text.fontFamily = 1;
  text.textAlign = 'center';
  text.verticalAlign = 'middle';
  text.containerId = node.id;
  text.lineHeight = 1.25;
  text.autoResize = true;
  node.boundElements = [{ type: 'text', id: text.id }];
  diagram.elements.push(node, text);
  return { id: node.id, label, shape, color: options.color ?? 'light-blue', x, y, width, height };
}

function createEdge(diagram, options) {
  const from = resolveElement(diagram, options.from);
  const to = resolveElement(diagram, options.to);
  if (!from || !to) {
    throw new Error(`createEdge could not resolve "${!from ? options.from : options.to}" by label or id.`);
  }
  const fromRight = (from.x ?? 0) <= (to.x ?? 0);
  const startX = fromRight ? (from.x ?? 0) + (from.width ?? 0) : (from.x ?? 0);
  const endX = fromRight ? (to.x ?? 0) : (to.x ?? 0) + (to.width ?? 0);
  const startY = (from.y ?? 0) + (from.height ?? 0) / 2;
  const endY = (to.y ?? 0) + (to.height ?? 0) / 2;
  const dx = endX - startX;
  const dy = endY - startY;
  const edge = baseElement(nextId('edge', options.label || 'to'), 'arrow', startX, startY, Math.abs(dx), Math.abs(dy), {
    stroke: '#1e1e1e',
    background: 'transparent',
  }, { type: 2 });
  edge.points = [[0, 0], [dx, dy]];
  edge.lastCommittedPoint = null;
  edge.startBinding = { elementId: from.id, focus: 0, gap: 8 };
  edge.endBinding = { elementId: to.id, focus: 0, gap: 8 };
  edge.startArrowhead = null;
  edge.endArrowhead = 'arrow';
  edge.strokeStyle = options.style === 'dashed' ? 'dashed' : 'solid';
  from.boundElements = [...(from.boundElements ?? []), { type: 'arrow', id: edge.id }];
  to.boundElements = [...(to.boundElements ?? []), { type: 'arrow', id: edge.id }];
  diagram.elements.push(edge);
  const label = options.label ? String(options.label) : null;
  if (label) {
    const { height } = estimateLabelSize(label, 160);
    const text = baseElement(nextId('edgelabel', label), 'text', (startX + endX) / 2 - 70, (startY + endY) / 2 - height / 2, 140, height, {
      stroke: '#1e1e1e',
      background: 'transparent',
    }, null);
    text.text = label;
    text.originalText = label;
    text.fontSize = 14;
    text.fontFamily = 1;
    text.textAlign = 'center';
    text.verticalAlign = 'middle';
    text.containerId = edge.id;
    text.lineHeight = 1.25;
    text.autoResize = true;
    edge.boundElements = [{ type: 'text', id: text.id }];
    diagram.elements.push(text);
  }
  return { id: edge.id, from: from.id, to: to.id, label, style: edge.strokeStyle };
}

function deleteElement(diagram, options) {
  const target = resolveElement(diagram, options.id ?? options.label);
  if (!target) {
    throw new Error(`deleteElement could not resolve "${options.id ?? options.label}" by label or id.`);
  }
  const doomed = new Set([target.id]);
  for (const element of actives(diagram)) {
    if (element.startBinding?.elementId === target.id || element.endBinding?.elementId === target.id) {
      doomed.add(element.id);
    }
    if (element.type === 'text' && element.containerId && doomed.has(element.containerId)) {
      doomed.add(element.id);
    }
    if (element.containerId === target.id) doomed.add(element.id);
  }
  for (const element of diagram.elements) {
    if (doomed.has(element.id)) {
      element.isDeleted = true;
      element.updated = Date.now();
    }
    if (element.boundElements) {
      element.boundElements = element.boundElements.filter((binding) => !doomed.has(binding.id));
    }
    if (element.startBinding && doomed.has(element.startBinding.elementId)) element.startBinding = null;
    if (element.endBinding && doomed.has(element.endBinding.elementId)) element.endBinding = null;
  }
  return { deleted: [...doomed] };
}

function diagramState(diagram) {
  const nodes = nodeIndex(diagram);
  const edges = actives(diagram).filter((element) => element.type === 'arrow');
  const lines = [`# UX map — ${DIAGRAM_PATH}`, '', `Nodes (${nodes.length}):`];
  for (const { element, label } of nodes) {
    lines.push(`- ${element.id} [${element.type}/${element.backgroundColor}] @(${element.x},${element.y}) ${label.split('\n').join(' | ')}`);
  }
  lines.push('', `Edges (${edges.length}):`);
  for (const edge of edges) {
    const from = nodes.find((node) => node.element.id === edge.startBinding?.elementId);
    const to = nodes.find((node) => node.element.id === edge.endBinding?.elementId);
    const label = actives(diagram).find((element) => element.type === 'text' && element.containerId === edge.id);
    lines.push(
      `- "${textOf(label) ?? ''}" : ${from?.label.split('\n')[0] ?? edge.startBinding?.elementId ?? '?'} -> ${to?.label.split('\n')[0] ?? edge.endBinding?.elementId ?? '?'} (${edge.strokeStyle})`,
    );
  }
  return lines.join('\n');
}

const TOOLS = [
  {
    name: 'getFullDiagramState',
    description: 'Read the current UX map (nodes with labels, edges with action labels) before touching anything.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'createNode',
    description: 'Add a screen/section/start node with a label (name + CTA + key blocks, separated by \\n).',
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Node text; the first line is the stable key.' },
        shape: { type: 'string', enum: SHAPES },
        color: { type: 'string', enum: Object.keys(COLOR_PRESETS) },
        x: { type: 'number' },
        y: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
        link: { type: 'string', description: 'Optional route/URL this node points to.' },
      },
      required: ['label'],
      additionalProperties: false,
    },
  },
  {
    name: 'createEdge',
    description: 'Add a labeled arrow between two nodes, referenced by label text or id.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string' },
        to: { type: 'string' },
        label: { type: 'string', description: 'Real action text that navigates (button/link).' },
        style: { type: 'string', enum: ['solid', 'dashed'] },
      },
      required: ['from', 'to'],
      additionalProperties: false,
    },
  },
  {
    name: 'deleteElement',
    description: 'Remove a node or edge by label text or id (its bound labels and attached arrows go with it).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        label: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
];

function callTool(name, params) {
  const diagram = loadDiagram();
  if (name === 'getFullDiagramState') {
    return diagramState(diagram);
  }
  if (name === 'createNode') {
    const result = createNode(diagram, params ?? {});
    saveDiagram(diagram);
    return `created ${result.id} @(${result.x},${result.y})`;
  }
  if (name === 'createEdge') {
    const result = createEdge(diagram, params ?? {});
    saveDiagram(diagram);
    return `created edge ${result.id}: ${result.from} -> ${result.to} "${result.label ?? ''}" (${result.style})`;
  }
  if (name === 'deleteElement') {
    const result = deleteElement(diagram, params ?? {});
    saveDiagram(diagram);
    return `deleted ${result.deleted.join(', ')}`;
  }
  throw new Error(`Unknown tool: ${name}`);
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function reply(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function replyError(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

function handle(message) {
  const { id, method, params } = message;
  if (method === 'initialize') {
    reply(id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO });
    return;
  }
  if (method === 'notifications/initialized' || method?.startsWith('notifications/')) return;
  if (method === 'ping') {
    reply(id, {});
    return;
  }
  if (method === 'tools/list') {
    reply(id, { tools: TOOLS });
    return;
  }
  if (method === 'tools/call') {
    try {
      const text = callTool(params?.name, params?.arguments);
      reply(id, { content: [{ type: 'text', text }], isError: false });
    } catch (error) {
      reply(id, { content: [{ type: 'text', text: String(error?.message ?? error) }], isError: true });
    }
    return;
  }
  if (id !== undefined) replyError(id, -32601, `Method not found: ${method}`);
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let newline;
  while ((newline = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    try {
      handle(JSON.parse(line));
    } catch (error) {
      send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: `Parse error: ${error?.message}` } });
    }
  }
});
process.stdin.resume();
