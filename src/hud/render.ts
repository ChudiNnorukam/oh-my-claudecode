/**
 * Sisyphus HUD - Main Renderer
 *
 * Composes statusline output from render context.
 */

import type { HudRenderContext, HudConfig } from './types.js';
import { bold, dim } from './colors.js';
import { renderRalph } from './elements/ralph.js';
import { renderAgentsByFormat } from './elements/agents.js';
import { renderTodos } from './elements/todos.js';
import { renderSkills } from './elements/skills.js';
import { renderContext } from './elements/context.js';
import { renderBackground } from './elements/background.js';
import { renderPrd } from './elements/prd.js';

/**
 * Render the complete statusline
 */
export function render(context: HudRenderContext, config: HudConfig): string {
  const elements: string[] = [];
  const { elements: enabledElements } = config;

  // [SISYPHUS] label
  if (enabledElements.sisyphusLabel) {
    elements.push(bold('[SISYPHUS]'));
  }

  // Ralph loop state
  if (enabledElements.ralph && context.ralph) {
    const ralph = renderRalph(context.ralph, config.thresholds);
    if (ralph) elements.push(ralph);
  }

  // PRD story
  if (enabledElements.prdStory && context.prd) {
    const prd = renderPrd(context.prd);
    if (prd) elements.push(prd);
  }

  // Active skills (ultrawork, etc.)
  if (enabledElements.activeSkills) {
    const skills = renderSkills(context.ultrawork, context.ralph);
    if (skills) elements.push(skills);
  }

  // Context window
  if (enabledElements.contextBar) {
    const ctx = renderContext(context.contextPercent, config.thresholds);
    if (ctx) elements.push(ctx);
  }

  // Active agents
  if (enabledElements.agents) {
    const agents = renderAgentsByFormat(
      context.activeAgents,
      enabledElements.agentsFormat || 'codes'
    );
    if (agents) elements.push(agents);
  }

  // Background tasks
  if (enabledElements.backgroundTasks) {
    const bg = renderBackground(context.backgroundTasks);
    if (bg) elements.push(bg);
  }

  // Todos
  if (enabledElements.todos) {
    const todos = renderTodos(context.todos);
    if (todos) elements.push(todos);
  }

  // Join with separator
  return elements.join(dim(' | '));
}
