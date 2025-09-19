// Utility to accumulate streaming tool_calls deltas safely
// Ensures each tool call has a stable id (placeholder if API hasn't supplied one yet)

export interface ToolCallMeta {
  index: number;
  id: string; // never empty after accumulation
  name: string;
  args: string; // concatenated JSON fragment string
  _placeholder?: boolean; // internal flag if id was synthetic
}

interface IncomingToolCallDeltaFunction {
  name?: string;
  arguments?: string;
}

interface IncomingToolCallDelta {
  index: number;
  id?: string;
  function?: IncomingToolCallDeltaFunction;
  type?: string;
}

// Accumulate tool call deltas (streaming) into meta list
export function accumulateToolCalls(
  current: ToolCallMeta[],
  deltas: IncomingToolCallDelta[],
  iteration: number
): ToolCallMeta[] {
  for (const delta of deltas) {
    if (typeof delta.index !== 'number') continue; // must have index per spec
    let meta = current.find(c => c.index === delta.index);
    if (!meta) {
      const syntheticId = delta.id || `pending_${iteration}_${delta.index}`;
      meta = {
        index: delta.index,
        id: syntheticId,
        name: delta.function?.name || 'unknown',
        args: delta.function?.arguments || '',
        _placeholder: !delta.id,
      };
      current.push(meta);
    } else {
      // fill in id when it appears later
      if (meta._placeholder && delta.id) {
        meta.id = delta.id;
        meta._placeholder = false;
      }
      if (delta.function?.name && meta.name === 'unknown') {
        meta.name = delta.function.name;
      }
      if (delta.function?.arguments) {
        meta.args += delta.function.arguments; // append fragments
      }
    }
  }
  return current;
}

// Finalize before sending back: ensure no placeholder ids remain
export function finalizeToolCalls(list: ToolCallMeta[], iteration: number): ToolCallMeta[] {
  list.forEach((item, i) => {
    if (!item.id) {
      item.id = `pending_final_${iteration}_${i}`;
      item._placeholder = true;
    }
  });
  return list;
}
