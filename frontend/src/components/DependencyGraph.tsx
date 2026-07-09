import React, { useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  type Node,
  type Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface DependencyGraphProps {
  graph: Record<string, string[]>;
  onNodeClick: (path: string) => void;
}

export const DependencyGraph: React.FC<DependencyGraphProps> = ({ graph, onNodeClick }) => {
  const { nodes, edges } = useMemo(() => {
    const uniqueFiles = new Set<string>();
    Object.keys(graph).forEach(file => {
      uniqueFiles.add(file);
      graph[file].forEach(dep => uniqueFiles.add(dep));
    });

    const fileList = Array.from(uniqueFiles);

    // Compute node coordinates dynamically in a circular layout to avoid clutter
    const radius = Math.max(250, fileList.length * 35);
    const centerX = radius + 100;
    const centerY = radius + 100;

    const flowNodes: Node[] = fileList.map((file, idx) => {
      const angle = (idx / fileList.length) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      const fileName = file.split('/').pop() || file;
      const isController = fileName.toLowerCase().includes('controller');
      const isService = fileName.toLowerCase().includes('service');
      const isModel = fileName.toLowerCase().includes('model') || fileName.toLowerCase().includes('entity');

      let bgColor = 'bg-[#1e293b] border-slate-600';
      if (isController) bgColor = 'bg-brand-950 border-brand-500 text-brand-300';
      else if (isService) bgColor = 'bg-emerald-950/80 border-emerald-500 text-emerald-300';
      else if (isModel) bgColor = 'bg-amber-950/80 border-amber-500 text-amber-300';

      return {
        id: file,
        position: { x, y },
        data: { 
          label: (
            <div className="text-left select-none font-mono">
              <div className="font-bold text-[11px] truncate">{fileName}</div>
              <div className="text-[9px] opacity-60 truncate">{file}</div>
            </div>
          ) 
        },
        className: `${bgColor} border px-3 py-2 text-white rounded-lg shadow-lg max-w-[180px] cursor-pointer hover:border-blue-400 transition-colors`,
      };
    });

    const flowEdges: Edge[] = [];
    Object.keys(graph).forEach(source => {
      graph[source].forEach(target => {
        flowEdges.push({
          id: `${source}->${target}`,
          source: source,
          target: target,
          animated: true,
          style: { stroke: '#6366f1', strokeWidth: 1.5 },
        });
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [graph]);

  const handleNodeClick = (_e: any, node: any) => {
    onNodeClick(node.id);
  };

  return (
    <div className="w-full h-full bg-[#0b0c10] relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClick}
        fitView
        className="font-mono"
      >
        <Background color="#1e293b" gap={16} size={1} />
        <Controls className="fill-panel-text" />
        <MiniMap 
          nodeColor={() => '#1f293d'}
          maskColor="rgba(7, 9, 14, 0.7)"
          bgColor="#0f1115"
          className="border border-panel-border rounded"
        />
      </ReactFlow>
    </div>
  );
};
export default DependencyGraph;
