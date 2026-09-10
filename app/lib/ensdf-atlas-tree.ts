import type { EnsdfAtlasBranch, EnsdfAtlasShard } from "./ensdf-atlas";

export type AtlasTraceStop = "cycle" | "depth" | "budget" | "unavailable" | null;

export type AtlasTraceEdge = Readonly<{
  id: string;
  displayMode: EnsdfAtlasBranch["displayMode"];
  rawModes: readonly string[];
  daughterStateId: string;
  reportedFractions: readonly number[];
  recordCount: number;
  child: AtlasTraceNode | null;
  stop: AtlasTraceStop;
}>;

export type AtlasTraceNode = Readonly<{
  stateId: string;
  depth: number;
  edges: readonly AtlasTraceEdge[];
}>;

export type AtlasTraceRow = Readonly<{
  id: string;
  depth: number;
  parentStateId: string;
  daughterStateId: string;
  displayMode: EnsdfAtlasBranch["displayMode"];
  rawModes: readonly string[];
  reportedFractions: readonly number[];
  recordCount: number;
  stop: AtlasTraceStop;
}>;

type LoadShard = (stateId: string) => Promise<EnsdfAtlasShard | null>;

function groupBranches(branches: readonly EnsdfAtlasBranch[]) {
  const groups = new Map<string, EnsdfAtlasBranch[]>();
  for (const branch of branches) {
    const key = `${branch.displayMode}|${branch.daughterStateId}`;
    const group = groups.get(key) ?? [];
    group.push(branch);
    groups.set(key, group);
  }
  return [...groups.entries()].sort(([, a], [, b]) =>
    a[0].daughterStateId.localeCompare(b[0].daughterStateId) || a[0].displayMode.localeCompare(b[0].displayMode));
}

export async function buildAtlasTrace(
  rootStateId: string,
  loadShard: LoadShard,
  options: Readonly<{ maxDepth: number; maxNodes?: number }>,
): Promise<AtlasTraceNode> {
  const maxDepth = Math.max(1, Math.min(12, Math.trunc(options.maxDepth)));
  const maxNodes = Math.max(2, Math.min(120, Math.trunc(options.maxNodes ?? 60)));
  let visitedNodes = 0;

  const visit = async (stateId: string, depth: number, path: ReadonlySet<string>): Promise<AtlasTraceNode> => {
    visitedNodes += 1;
    const shard = await loadShard(stateId);
    if (!shard) return { stateId, depth, edges: [] };
    const outgoing = shard.branches.filter((branch) => branch.parentStateId === stateId);
    const edges: AtlasTraceEdge[] = [];
    for (const [groupId, records] of groupBranches(outgoing)) {
      const first = records[0];
      const daughterStateId = first.daughterStateId;
      let child: AtlasTraceNode | null = null;
      let stop: AtlasTraceStop = null;
      if (path.has(daughterStateId)) stop = "cycle";
      else if (depth + 1 >= maxDepth) stop = "depth";
      else if (visitedNodes >= maxNodes) stop = "budget";
      else {
        const daughterShard = await loadShard(daughterStateId);
        if (!daughterShard) stop = "unavailable";
        else child = await visit(daughterStateId, depth + 1, new Set([...path, daughterStateId]));
      }
      edges.push({
        id: `${stateId}|${groupId}`,
        displayMode: first.displayMode,
        rawModes: [...new Set(records.map((record) => record.rawMode))].sort(),
        daughterStateId,
        reportedFractions: [...new Set(records.map((record) => record.branchingFractionReported).filter((value): value is number => value !== null))].sort((a, b) => a - b),
        recordCount: records.length,
        child,
        stop,
      });
    }
    return { stateId, depth, edges };
  };

  return visit(rootStateId, 0, new Set([rootStateId]));
}

export function flattenAtlasTrace(root: AtlasTraceNode): readonly AtlasTraceRow[] {
  const rows: AtlasTraceRow[] = [];
  const walk = (node: AtlasTraceNode) => {
    for (const edge of node.edges) {
      rows.push({
        id: `${edge.id}|${rows.length}`,
        depth: node.depth + 1,
        parentStateId: node.stateId,
        daughterStateId: edge.daughterStateId,
        displayMode: edge.displayMode,
        rawModes: edge.rawModes,
        reportedFractions: edge.reportedFractions,
        recordCount: edge.recordCount,
        stop: edge.stop,
      });
      if (edge.child) walk(edge.child);
    }
  };
  walk(root);
  return rows;
}
