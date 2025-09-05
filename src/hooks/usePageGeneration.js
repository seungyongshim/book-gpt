import { useState, useCallback } from 'react';
import { generatePage } from '../services/gpt';
export function usePageGeneration() {
    const [output, setOutput] = useState('');
    const [running, setRunning] = useState(false);
    const [error, setError] = useState(null);
    const run = useCallback(async (layer) => {
        setOutput('');
        setRunning(true);
        setError(null);
        const controller = new AbortController();
        try {
            await generatePage(layer, c => {
                if (c.done) {
                    setRunning(false);
                }
                else {
                    setOutput(prev => prev + c.text);
                }
            }, controller.signal);
        }
        catch (e) {
            setError(e.message || '생성 오류');
            setRunning(false);
        }
    }, []);
    return { output, running, error, run };
}
