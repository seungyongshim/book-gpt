import { useState, useCallback } from 'react';
import { PromptLayer } from '../types/domain';
import { generatePage } from '../services/gpt';

export function usePageGeneration() {
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (layer: PromptLayer) => {
    setOutput('');
    setRunning(true);
    setError(null);
    const controller = new AbortController();
    try {
      await generatePage(layer, c => {
        if (c.done) {
          setRunning(false);
        } else {
          setOutput(prev => prev + c.text);
        }
      }, controller.signal);
    } catch (e: any) {
      setError(e.message || '생성 오류');
      setRunning(false);
    }
  }, []);

  return { output, running, error, run };
}
