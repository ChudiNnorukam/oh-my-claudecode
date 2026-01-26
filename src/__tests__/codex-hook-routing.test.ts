import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the modules before importing
vi.mock('../features/codex-router.js', () => ({
  routeToCodex: vi.fn(),
  CodexNotAvailableError: class CodexNotAvailableError extends Error {
    constructor(message = 'Codex is not available') {
      super(message);
      this.name = 'CodexNotAvailableError';
    }
  }
}));

vi.mock('../agents/definitions.js', () => ({
  getAgentDefinitions: vi.fn()
}));

vi.mock('../hud/background-tasks.js', () => ({
  addBackgroundTask: vi.fn(),
  completeBackgroundTask: vi.fn()
}));

// Import after mocking
import { processHook, type HookInput } from '../hooks/bridge.js';
import { routeToCodex, CodexNotAvailableError } from '../features/codex-router.js';
import { getAgentDefinitions } from '../agents/definitions.js';
import { addBackgroundTask } from '../hud/background-tasks.js';

describe('Codex Agent Hook Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when Task tool is called with codex agent', () => {
    it('routes architect-codex through Codex CLI', async () => {
      // Setup mocks
      vi.mocked(getAgentDefinitions).mockReturnValue({
        'architect-codex': {
          description: 'Codex architect',
          prompt: 'test prompt',
          tools: ['Read'],
          model: 'opus',
          defaultModel: 'opus',
          executionType: 'codex'
        }
      });
      vi.mocked(routeToCodex).mockResolvedValue({
        success: true,
        output: 'Codex analysis result'
      });

      const input: HookInput = {
        toolName: 'Task',
        toolInput: {
          subagent_type: 'oh-my-claudecode:architect-codex',
          prompt: 'Analyze the architecture',
          description: 'Architecture analysis',
          model: 'opus'
        }
      };

      const result = await processHook('pre-tool-use', input);

      expect(routeToCodex).toHaveBeenCalledWith(
        'architect-codex',
        'Analyze the architecture',
        'opus'
      );
      expect(result.continue).toBe(false);
      expect(result.message).toBe('Codex analysis result');
      expect(result.reason).toContain('Codex CLI');
    });

    it('routes planner-codex through Codex CLI', async () => {
      vi.mocked(getAgentDefinitions).mockReturnValue({
        'planner-codex': {
          description: 'Codex planner',
          prompt: 'test prompt',
          tools: ['Read'],
          model: 'opus',
          defaultModel: 'opus',
          executionType: 'codex'
        }
      });
      vi.mocked(routeToCodex).mockResolvedValue({
        success: true,
        output: 'Strategic plan output'
      });

      const input: HookInput = {
        toolName: 'Task',
        toolInput: {
          subagent_type: 'planner-codex',
          prompt: 'Create a strategic plan',
          description: 'Planning'
        }
      };

      const result = await processHook('pre-tool-use', input);

      expect(routeToCodex).toHaveBeenCalledWith(
        'planner-codex',
        'Create a strategic plan',
        'opus' // Falls back to defaultModel
      );
      expect(result.continue).toBe(false);
      expect(result.message).toBe('Strategic plan output');
    });

    it('routes critic-codex through Codex CLI', async () => {
      vi.mocked(getAgentDefinitions).mockReturnValue({
        'critic-codex': {
          description: 'Codex critic',
          prompt: 'test prompt',
          tools: ['Read'],
          model: 'opus',
          defaultModel: 'opus',
          executionType: 'codex'
        }
      });
      vi.mocked(routeToCodex).mockResolvedValue({
        success: true,
        output: 'VERDICT: APPROVED'
      });

      const input: HookInput = {
        toolName: 'Task',
        toolInput: {
          subagent_type: 'oh-my-claudecode:critic-codex',
          prompt: 'Review this plan',
          description: 'Plan review'
        }
      };

      const result = await processHook('pre-tool-use', input);

      expect(routeToCodex).toHaveBeenCalled();
      expect(result.continue).toBe(false);
      expect(result.message).toBe('VERDICT: APPROVED');
    });

    it('returns error message when Codex execution fails', async () => {
      vi.mocked(getAgentDefinitions).mockReturnValue({
        'architect-codex': {
          description: 'Codex architect',
          prompt: 'test prompt',
          tools: ['Read'],
          executionType: 'codex'
        }
      });
      vi.mocked(routeToCodex).mockResolvedValue({
        success: false,
        output: '',
        error: 'Codex timeout after 5 minutes'
      });

      const input: HookInput = {
        toolName: 'Task',
        toolInput: {
          subagent_type: 'architect-codex',
          prompt: 'Analyze this',
          description: 'Analysis'
        }
      };

      const result = await processHook('pre-tool-use', input);

      expect(result.continue).toBe(false);
      expect(result.message).toContain('Codex timeout');
      expect(result.reason).toBe('Codex CLI error');
    });

    it('throws CodexNotAvailableError when Codex CLI not installed', async () => {
      vi.mocked(getAgentDefinitions).mockReturnValue({
        'architect-codex': {
          description: 'Codex architect',
          prompt: 'test prompt',
          tools: ['Read'],
          executionType: 'codex'
        }
      });
      vi.mocked(routeToCodex).mockRejectedValue(
        new CodexNotAvailableError('Codex CLI not available')
      );

      const input: HookInput = {
        toolName: 'Task',
        toolInput: {
          subagent_type: 'architect-codex',
          prompt: 'Analyze this',
          description: 'Analysis'
        }
      };

      await expect(processHook('pre-tool-use', input)).rejects.toThrow(
        CodexNotAvailableError
      );
    });
  });

  describe('when Task tool is called with non-codex agent', () => {
    it('passes architect through normally (not routed to Codex)', async () => {
      vi.mocked(getAgentDefinitions).mockReturnValue({
        'architect': {
          description: 'Claude architect',
          prompt: 'test prompt',
          tools: ['Read'],
          model: 'opus',
          executionType: undefined // or 'claude'
        }
      });

      const input: HookInput = {
        toolName: 'Task',
        toolInput: {
          subagent_type: 'architect',
          prompt: 'Analyze this',
          description: 'Analysis'
        }
      };

      const result = await processHook('pre-tool-use', input);

      expect(routeToCodex).not.toHaveBeenCalled();
      expect(result.continue).toBe(true);
    });

    it('passes executor through normally', async () => {
      vi.mocked(getAgentDefinitions).mockReturnValue({
        'executor': {
          description: 'Claude executor',
          prompt: 'test prompt',
          tools: ['Edit'],
          model: 'sonnet'
        }
      });

      const input: HookInput = {
        toolName: 'Task',
        toolInput: {
          subagent_type: 'oh-my-claudecode:executor',
          prompt: 'Execute task',
          description: 'Task execution'
        }
      };

      const result = await processHook('pre-tool-use', input);

      expect(routeToCodex).not.toHaveBeenCalled();
      expect(result.continue).toBe(true);
    });

    it('tracks background task for non-codex agents', async () => {
      vi.mocked(getAgentDefinitions).mockReturnValue({
        'executor': {
          description: 'Claude executor',
          prompt: 'test prompt',
          tools: ['Edit'],
          model: 'sonnet'
        }
      });

      const input: HookInput = {
        toolName: 'Task',
        toolInput: {
          subagent_type: 'executor',
          prompt: 'Execute task',
          description: 'Task execution'
        },
        directory: '/test/dir'
      };

      await processHook('pre-tool-use', input);

      expect(addBackgroundTask).toHaveBeenCalledWith(
        expect.stringMatching(/^task-\d+-/),
        'Task execution',
        'executor',
        '/test/dir'
      );
    });
  });

  describe('edge cases', () => {
    it('handles agent with -codex suffix but no executionType', async () => {
      vi.mocked(getAgentDefinitions).mockReturnValue({
        'fake-codex': {
          description: 'Not really a codex agent',
          prompt: 'test prompt',
          tools: ['Read'],
          // No executionType field
        }
      });

      const input: HookInput = {
        toolName: 'Task',
        toolInput: {
          subagent_type: 'fake-codex',
          prompt: 'Test',
          description: 'Test'
        }
      };

      const result = await processHook('pre-tool-use', input);

      expect(routeToCodex).not.toHaveBeenCalled();
      expect(result.continue).toBe(true);
    });

    it('handles unknown agent type gracefully', async () => {
      vi.mocked(getAgentDefinitions).mockReturnValue({});

      const input: HookInput = {
        toolName: 'Task',
        toolInput: {
          subagent_type: 'unknown-codex',
          prompt: 'Test',
          description: 'Test'
        }
      };

      const result = await processHook('pre-tool-use', input);

      expect(routeToCodex).not.toHaveBeenCalled();
      expect(result.continue).toBe(true);
    });

    it('handles empty prompt gracefully', async () => {
      vi.mocked(getAgentDefinitions).mockReturnValue({
        'architect-codex': {
          description: 'Codex architect',
          prompt: 'test prompt',
          tools: ['Read'],
          executionType: 'codex',
          defaultModel: 'opus'
        }
      });
      vi.mocked(routeToCodex).mockResolvedValue({
        success: true,
        output: 'Result'
      });

      const input: HookInput = {
        toolName: 'Task',
        toolInput: {
          subagent_type: 'architect-codex',
          // No prompt field
          description: 'Test'
        }
      };

      const result = await processHook('pre-tool-use', input);

      expect(routeToCodex).toHaveBeenCalledWith(
        'architect-codex',
        '', // Empty string fallback
        'opus'
      );
      expect(result.continue).toBe(false);
    });

    it('handles non-Task tool calls', async () => {
      const input: HookInput = {
        toolName: 'Read',
        toolInput: {
          file_path: '/some/file.ts'
        }
      };

      const result = await processHook('pre-tool-use', input);

      expect(routeToCodex).not.toHaveBeenCalled();
      expect(result.continue).toBe(true);
    });
  });
});
