/**
 * notion-sync.mjs
 *
 * Executado pela GitHub Action a cada push na main.
 * Lê o progress.json do repositório — fonte de verdade do OrdireOS —
 * e sincroniza o estado completo com o Tracker no Notion.
 *
 * Campos atualizados:
 *   - Módulo Atual       → milestone/sprint ativo ou "Concluído"
 *   - Módulos Concluídos → milestones com status "done"
 *   - Sprints Concluídos → sprints com status "done"
 *   - Status             → "Ativo" | "Concluído"
 *   - Notas              → último commit + resumo do progress.json
 */

import { readFileSync } from 'fs';

const NOTION_TOKEN   = process.env.NOTION_TOKEN;
const PAGE_ID        = process.env.NOTION_PAGE_ID;   // entrada OrdireOS no Tracker
const COMMIT_SHA     = process.env.COMMIT_SHA;
const COMMIT_MESSAGE = process.env.COMMIT_MESSAGE ?? '';
const COMMIT_AUTHOR  = process.env.COMMIT_AUTHOR ?? 'berdansch';
const COMMIT_URL     = process.env.COMMIT_URL ?? '';

if (!NOTION_TOKEN || !PAGE_ID) {
  console.error('❌  NOTION_TOKEN ou NOTION_PAGE_ID ausentes.');
  process.exit(1);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function notionRequest(method, path, body) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion API ${res.status}: ${text}`);
  }

  return res.json();
}

// ─── Leitura do progress.json ────────────────────────────────────────────────

function loadProgress() {
  try {
    const raw = readFileSync('progress.json', 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.warn('⚠️  progress.json não encontrado ou inválido — usando fallback.');
    return null;
  }
}

// ─── Derivação de estado ─────────────────────────────────────────────────────

function deriveState(progress) {
  const milestones = progress?.milestones ?? [];
  const sprints    = progress?.sprints ?? [];

  const doneMilestones  = milestones.filter(m => m.status === 'done').length;
  const doneSprints     = sprints.filter(s => s.status === 'done').length;
  const totalMilestones = milestones.length;

  // Milestone ativo: primeiro que não está done, ou "done" se todos concluídos
  const activeMilestone = milestones.find(m => m.status !== 'done');
  const activeSprint    = sprints.find(s => s.status !== 'done');

  // Status geral
  const allDone = progress?.active_milestone === 'done'
               || (!activeMilestone && !activeSprint);

  // Módulo atual: sprint ativo tem precedência sobre milestone
  let moduloAtual;
  if (allDone) {
    const lastMilestone = milestones[milestones.length - 1];
    moduloAtual = `${lastMilestone?.id ?? 'M8'} — Concluído`;
  } else if (activeSprint) {
    moduloAtual = `${activeSprint.id} — ${activeSprint.title}`;
  } else if (activeMilestone) {
    // Subtask ativa, se houver
    const activeTask = activeMilestone.tasks?.find(t => !t.done);
    moduloAtual = activeTask
      ? `${activeTask.id} — ${activeTask.title}`
      : `${activeMilestone.id} — ${activeMilestone.title}`;
  }

  return {
    doneMilestones,
    doneSprints,
    totalMilestones,
    moduloAtual,
    status: allDone ? 'Concluído' : 'Ativo',
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🔄  Sincronizando com Notion — commit ${COMMIT_SHA?.slice(0, 7)}...`);

  // 1. Lê progress.json
  const progress = loadProgress();
  const state    = deriveState(progress);

  console.log(`   Status:              ${state.status}`);
  console.log(`   Módulo Atual:        ${state.moduloAtual}`);
  console.log(`   Milestones done:     ${state.doneMilestones}/${state.totalMilestones}`);
  console.log(`   Sprints done:        ${state.doneSprints}`);

  // 2. Monta nota com último commit
  const shortSha  = COMMIT_SHA?.slice(0, 7) ?? '???????';
  const shortMsg  = COMMIT_MESSAGE.split('\n')[0].slice(0, 120);
  const lastUpdated = progress?.last_updated ?? new Date().toISOString().slice(0, 10);

  const notesLines = [
    `Ultimo commit: [${shortSha}] ${shortMsg} — ${COMMIT_AUTHOR}`,
    `Atualizado em: ${lastUpdated}`,
    `Milestones: ${state.doneMilestones}/${state.totalMilestones} concluidos`,
    `Sprints: ${state.doneSprints} concluidos`,
    ...(COMMIT_URL ? [`Link: ${COMMIT_URL}`] : []),
  ];

  // 3. Monta payload Notion
  const updateBody = {
    properties: {
      'Módulo Atual': {
        rich_text: [{ type: 'text', text: { content: state.moduloAtual } }],
      },
      'Módulos Concluídos': {
        number: state.doneMilestones,
      },
      'Sprints Concluídos': {
        number: state.doneSprints,
      },
      'Status': {
        select: { name: state.status },
      },
      'Notas': {
        rich_text: [{ type: 'text', text: { content: notesLines.join('\n') } }],
      },
    },
  };

  // 4. Envia para o Notion
  await notionRequest('PATCH', `/pages/${PAGE_ID}`, updateBody);

  console.log('✅  Notion sincronizado com sucesso!');
}

main().catch(err => {
  console.error('❌  Erro:', err.message);
  process.exit(1);
});
