import React, { useMemo, useState, useEffect } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface DependencyGraphProps {
  graph: Record<string, string[]>;
  onNodeClick: (path: string) => void;
}

const FlowInner: React.FC<DependencyGraphProps> = ({ graph, onNodeClick }) => {
  const { fitView } = useReactFlow();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isolateMode, setIsolateMode] = useState(false);

  // Filter and build nodes and edges based on search and isolation queries
  const { initialNodes, initialEdges } = useMemo(() => {
    const uniqueFiles = new Set<string>();
    Object.keys(graph).forEach(file => {
      uniqueFiles.add(file);
      graph[file].forEach(dep => uniqueFiles.add(dep));
    });

    const fileList = Array.from(uniqueFiles);
    
    // 1. Apply Isolation filtering if active
    let filteredFiles = fileList;
    if (isolateMode && selectedNode) {
      const neighbors = new Set<string>([selectedNode]);
      Object.keys(graph).forEach(source => {
        graph[source].forEach(target => {
          if (source === selectedNode) neighbors.add(target);
          if (target === selectedNode) neighbors.add(source);
        });
      });
      filteredFiles = fileList.filter(f => neighbors.has(f));
    }

    // 2. Apply Search Query filtering if active
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filteredFiles = filteredFiles.filter(f => f.toLowerCase().includes(q));
    }

    const len = filteredFiles.length || 1;

    // Coordinate math: Circular layout centering
    const radius = Math.max(250, len * 35);
    const centerX = radius + 100;
    const centerY = radius + 100;

    const nodesList: Node[] = filteredFiles.map((file, idx) => {
      const angle = (idx / len) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      const fileName = file.split('/').pop() || file;
      const isController = fileName.toLowerCase().includes('controller');
      const isService = fileName.toLowerCase().includes('service');
      const isModel = fileName.toLowerCase().includes('model') || fileName.toLowerCase().includes('entity');

      let bgColor = 'bg-[#1e293b] border-[#30363D]';
      if (isController) bgColor = 'bg-[#2f1f4f] border-[#7C5CFC] text-[#d6cbfb]';
      else if (isService) bgColor = 'bg-[#122e1a] border-[#22C55E] text-[#bbf7d0]';
      else if (isModel) bgColor = 'bg-[#3b270c] border-[#F59E0B] text-[#fde68a]';

      const isSelected = selectedNode === file;

      return {
        id: file,
        position: { x, y },
        data: { 
          label: (
            <div className="text-left select-none font-mono">
              <div className="font-bold text-[10px] truncate">{fileName}</div>
              <div className="text-[8px] opacity-60 truncate">{file}</div>
            </div>
          ),
          file,
          isController,
          isService,
          isModel
        },
        className: `${bgColor} border ${isSelected ? 'ring-2 ring-[#7C5CFC]' : ''} px-2.5 py-1.5 text-white rounded max-w-[170px] cursor-pointer hover:border-blue-400 transition-all duration-150`,
      };
    });

    const edgesList: Edge[] = [];
    Object.keys(graph).forEach(source => {
      graph[source].forEach(target => {
        if (filteredFiles.includes(source) && filteredFiles.includes(target)) {
          edgesList.push({
            id: `${source}->${target}`,
            source: source,
            target: target,
            animated: true,
            style: { stroke: '#7C5CFC', strokeWidth: 1.2 },
          });
        }
      });
    });

    return { initialNodes: nodesList, initialEdges: edgesList };
  }, [graph, selectedNode, isolateMode, searchQuery]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync stateful node updates on filters
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Adjust viewport fit to bounds when data changes
  useEffect(() => {
    if (initialNodes.length > 0) {
      setTimeout(() => {
        fitView({ padding: 0.15, duration: 250 });
      }, 100);
    }
  }, [initialNodes, fitView]);

  // Handle Hover Neighbor Highlighting
  useEffect(() => {
    if (!hoveredNode) {
      setNodes((nds) => nds.map((n) => ({ ...n, style: { ...n.style, opacity: 1 } })));
      setEdges((eds) => eds.map((e) => ({ ...e, style: { ...e.style, stroke: '#7C5CFC', strokeWidth: 1.2, opacity: 1 } })));
      return;
    }

    const connectedNodeIds = new Set<string>([hoveredNode]);
    initialEdges.forEach((e) => {
      if (e.source === hoveredNode) {
        connectedNodeIds.add(e.target);
      } else if (e.target === hoveredNode) {
        connectedNodeIds.add(e.source);
      }
    });

    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        style: {
          ...n.style,
          opacity: connectedNodeIds.has(n.id) ? 1 : 0.25,
        },
      }))
    );

    setEdges((eds) =>
      eds.map((e) => {
        const isRelated = e.source === hoveredNode || e.target === hoveredNode;
        return {
          ...e,
          animated: isRelated,
          style: {
            ...e.style,
            stroke: isRelated ? '#38bdf8' : '#334155',
            strokeWidth: isRelated ? 2.2 : 1,
            opacity: isRelated ? 1 : 0.15,
          },
        };
      })
    );
  }, [hoveredNode, initialEdges, setNodes, setEdges]);

  // Extract metadata details
  const { inboundDeps, outboundDeps } = useMemo(() => {
    const inbound: string[] = [];
    const outbound: string[] = [];
    if (!selectedNode) return { inboundDeps: [], outboundDeps: [] };

    Object.keys(graph).forEach(source => {
      graph[source].forEach(target => {
        if (source === selectedNode) outbound.push(target);
        if (target === selectedNode) inbound.push(source);
      });
    });

    return { inboundDeps: inbound, outboundDeps: outbound };
  }, [graph, selectedNode]);

  return (
    <div className="w-full h-full flex bg-[#0D1117]">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Graph Controls Bar */}
        <div className="h-10 border-b border-[#30363D]/40 bg-[#161B22] px-4 flex items-center justify-between shrink-0 font-mono text-xs text-[#8B949E] select-none">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white uppercase text-[10px] tracking-wider">Dependency Graph</span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search components..."
              className="bg-[#0D1117] border border-[#30363D] focus:border-[#7C5CFC] focus:outline-none px-2.5 py-1 rounded text-[11px] text-white placeholder-[#8B949E]/40"
            />
            <button
              onClick={() => {
                setSearchQuery('');
                setIsolateMode(false);
                setSelectedNode(null);
                setTimeout(() => fitView({ padding: 0.15, duration: 250 }), 100);
              }}
              className="hover:text-white cursor-pointer px-2.5 py-0.5 border border-[#30363D] bg-[#0d1017] rounded text-[11px]"
            >
              Reset view
            </button>
          </div>
        </div>

        {/* Graph Canvas */}
        <div className="flex-1 min-h-0 relative bg-[#0D1117]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_e, node) => setSelectedNode(node.id)}
            onNodeMouseEnter={(_e, node) => setHoveredNode(node.id)}
            onNodeMouseLeave={() => setHoveredNode(null)}
            fitView
            className="font-mono text-white"
          >
            <Background color="#30363D" gap={16} size={1} />
            <Controls className="fill-[#8B949E] text-black" />
            <MiniMap 
              nodeColor={() => '#161B22'}
              maskColor="rgba(13, 17, 23, 0.7)"
              bgColor="#0D1117"
              className="border border-[#30363D] rounded !right-4 !bottom-4"
            />
          </ReactFlow>
        </div>
      </div>

      {/* Side-panel details */}
      {selectedNode && (
        <div className="w-80 border-l border-[#30363D] bg-[#161B22] flex flex-col shrink-0 font-mono text-xs text-[#8B949E] text-left select-none">
          <div className="h-10 border-b border-[#30363D] bg-[#0d1017] px-4 flex items-center justify-between shrink-0 text-white font-bold">
            <span>Dependency Details</span>
            <button onClick={() => setSelectedNode(null)} className="hover:text-red-400 font-bold text-sm">×</button>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            <div className="bg-[#0D1117] p-3 border border-[#30363D] rounded">
              <div className="text-[10px] uppercase font-bold text-[#8B949E]/65 mb-1">File Name</div>
              <div className="text-white font-bold break-all">{selectedNode.split('/').pop()}</div>
              <div className="text-[9px] opacity-60 break-all mt-1">{selectedNode}</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-[#8B949E]/65 mb-1.5">
                Inbound Couplings ({inboundDeps.length})
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {inboundDeps.map((f: string) => (
                  <div 
                    key={f} 
                    onClick={() => setSelectedNode(f)}
                    className="p-1.5 bg-[#0D1117] border border-[#30363D] rounded hover:border-[#7C5CFC] hover:text-white cursor-pointer truncate"
                    title={f}
                  >
                    {f.split('/').pop()}
                  </div>
                ))}
                {inboundDeps.length === 0 && <div className="text-[#8B949E]/40 italic text-[10px]">No inbound dependencies.</div>}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-[#8B949E]/65 mb-1.5">
                Outbound Couplings ({outboundDeps.length})
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {outboundDeps.map((f: string) => (
                  <div 
                    key={f} 
                    onClick={() => setSelectedNode(f)}
                    className="p-1.5 bg-[#0D1117] border border-[#30363D] rounded hover:border-[#7C5CFC] hover:text-white cursor-pointer truncate"
                    title={f}
                  >
                    {f.split('/').pop()}
                  </div>
                ))}
                {outboundDeps.length === 0 && <div className="text-[#8B949E]/40 italic text-[10px]">No outbound dependencies.</div>}
              </div>
            </div>

            <div className="border-t border-[#30363D]/40 pt-3 flex gap-2">
              <button
                onClick={() => setIsolateMode(!isolateMode)}
                className={`flex-1 py-1.5 rounded border text-[11px] font-semibold cursor-pointer transition-all ${
                  isolateMode 
                    ? 'bg-[#7C5CFC]/20 border-[#7C5CFC] text-white' 
                    : 'bg-[#0D1117] border-[#30363D] hover:text-white'
                }`}
              >
                {isolateMode ? "Isolate: ON" : "Isolate"}
              </button>
              <button
                onClick={() => onNodeClick(selectedNode)}
                className="flex-1 py-1.5 bg-[#7C5CFC] hover:bg-[#6845f9] text-white rounded text-[11px] font-semibold cursor-pointer transition-colors"
              >
                Open File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const DependencyGraph: React.FC<DependencyGraphProps> = (props) => {
  return (
    <ReactFlowProvider>
      <FlowInner {...props} />
    </ReactFlowProvider>
  );
};
export default DependencyGraph;
