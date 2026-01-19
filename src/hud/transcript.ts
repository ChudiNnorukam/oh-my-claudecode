/**
 * Sisyphus HUD - Transcript Parser
 *
 * Parse JSONL transcript from Claude Code to extract agents and todos.
 * Based on claude-hud reference implementation.
 */

import { createReadStream, existsSync } from 'fs';
import { createInterface } from 'readline';
import type { TranscriptData, ActiveAgent, TodoItem } from './types.js';

/**
 * Parse a Claude Code transcript JSONL file.
 * Extracts running agents and latest todo list.
 */
export async function parseTranscript(
  transcriptPath: string | undefined
): Promise<TranscriptData> {
  const result: TranscriptData = {
    agents: [],
    todos: [],
  };

  if (!transcriptPath || !existsSync(transcriptPath)) {
    return result;
  }

  const agentMap = new Map<string, ActiveAgent>();
  let latestTodos: TodoItem[] = [];

  try {
    const fileStream = createReadStream(transcriptPath);
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.trim()) continue;

      try {
        const entry = JSON.parse(line);
        processEntry(entry, agentMap, latestTodos, result);
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // Return partial results on error
  }

  // Get the last 10 agents (most recent)
  result.agents = Array.from(agentMap.values()).slice(-10);
  result.todos = latestTodos;

  return result;
}

/**
 * Process a single transcript entry
 */
function processEntry(
  entry: TranscriptEntry,
  agentMap: Map<string, ActiveAgent>,
  latestTodos: TodoItem[],
  result: TranscriptData
): void {
  const timestamp = entry.timestamp ? new Date(entry.timestamp) : new Date();

  // Set session start time from first entry
  if (!result.sessionStart && entry.timestamp) {
    result.sessionStart = timestamp;
  }

  const content = entry.message?.content;
  if (!content || !Array.isArray(content)) return;

  for (const block of content) {
    // Track tool_use for Task (agents) and TodoWrite
    if (block.type === 'tool_use' && block.id && block.name) {
      if (block.name === 'Task') {
        const input = block.input as TaskInput | undefined;
        const agentEntry: ActiveAgent = {
          id: block.id,
          type: input?.subagent_type ?? 'unknown',
          model: input?.model,
          description: input?.description,
          status: 'running',
          startTime: timestamp,
        };
        agentMap.set(block.id, agentEntry);
      } else if (block.name === 'TodoWrite') {
        const input = block.input as TodoWriteInput | undefined;
        if (input?.todos && Array.isArray(input.todos)) {
          // Replace latest todos with new ones
          latestTodos.length = 0;
          latestTodos.push(
            ...input.todos.map((t) => ({
              content: t.content,
              status: t.status as TodoItem['status'],
              activeForm: t.activeForm,
            }))
          );
        }
      }
    }

    // Track tool_result to mark agents as completed
    // BUT: Background agents return tool_result immediately with "Async agent launched"
    // These should NOT be marked as completed - they're still running
    if (block.type === 'tool_result' && block.tool_use_id) {
      const agent = agentMap.get(block.tool_use_id);
      if (agent) {
        // Check if this is a background agent launch result (not actual completion)
        const content = block.content;
        const isBackgroundLaunch =
          typeof content === 'string'
            ? content.includes('Async agent launched')
            : Array.isArray(content) && content.some(
                (c: { type?: string; text?: string }) =>
                  c.type === 'text' && c.text?.includes('Async agent launched')
              );

        if (!isBackgroundLaunch) {
          agent.status = 'completed';
          agent.endTime = timestamp;
        }
        // If it's a background launch, keep status as 'running'
      }
    }
  }
}

// ============================================================================
// Type Definitions for Transcript Parsing
// ============================================================================

interface TranscriptEntry {
  timestamp?: string;
  message?: {
    content?: ContentBlock[];
  };
}

interface ContentBlock {
  type: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  is_error?: boolean;
  content?: string | Array<{ type?: string; text?: string }>;
}

interface TaskInput {
  subagent_type?: string;
  model?: string;
  description?: string;
}

interface TodoWriteInput {
  todos?: Array<{
    content: string;
    status: string;
    activeForm?: string;
  }>;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get count of running agents
 */
export function getRunningAgentCount(agents: ActiveAgent[]): number {
  return agents.filter((a) => a.status === 'running').length;
}

/**
 * Get todo completion stats
 */
export function getTodoStats(todos: TodoItem[]): {
  completed: number;
  total: number;
  inProgress: number;
} {
  return {
    completed: todos.filter((t) => t.status === 'completed').length,
    total: todos.length,
    inProgress: todos.filter((t) => t.status === 'in_progress').length,
  };
}
