import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { VaultFile } from '../types';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  isActive: boolean;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string;
  target: string;
}

interface GraphVisualizerProps {
  files: VaultFile[];
  activeFilePath: string | null;
  onNodeClick: (path: string) => void;
}

export function GraphVisualizer({ files, activeFilePath, onNodeClick }: GraphVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const { nodes, links } = useMemo(() => {
    const nodes: Node[] = [];
    const links: Link[] = [];
    const fileMap = new Map<string, VaultFile>();

    const flattenFiles = (files: VaultFile[]) => {
      files.forEach(file => {
        if (file.type === 'file') {
          fileMap.set(file.path, file);
          nodes.push({
            id: file.path,
            name: file.name.replace('.md', ''),
            isActive: file.path === activeFilePath
          });
        }
        if (file.children) flattenFiles(file.children);
      });
    };

    flattenFiles(files);

    // Parse links from content
    fileMap.forEach((file, path) => {
      if (file.content) {
        const linkRegex = /\[\[(.*?)\]\]/g;
        let match;
        while ((match = linkRegex.exec(file.content)) !== null) {
          const targetName = match[1].split('|')[0]; // Handle [[Link|Alias]]
          // Find file by name (Obsidian style)
          const targetFile = Array.from(fileMap.values()).find(f => 
            f.name.replace('.md', '') === targetName || f.path === targetName
          );
          
          if (targetFile) {
            links.push({
              source: path,
              target: targetFile.path
            });
          }
        }
      }
    });

    return { nodes, links };
  }, [files, activeFilePath]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = 200; // Fixed height for sidebar

    const simulation = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id(d => d.id).distance(50))
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(20));

    const link = svg.append("g")
      .attr("stroke", "#334155")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1);

    const nodeGroup = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (event, d) => onNodeClick(d.id))
      .on("mouseenter", function(event, d) {
        d3.select(this).select("text").style("opacity", 1);
        d3.select(this).select("circle").attr("r", d.isActive ? 8 : 6);
      })
      .on("mouseleave", function(event, d) {
        d3.select(this).select("text").style("opacity", 0);
        d3.select(this).select("circle").attr("r", d.isActive ? 6 : 4);
      })
      .call(d3.drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    const node = nodeGroup.append("circle")
      .attr("r", d => d.isActive ? 6 : 4)
      .attr("fill", d => d.isActive ? "#2563eb" : "#94a3b8");

    const label = nodeGroup.append("text")
      .text(d => d.name)
      .attr("x", 8)
      .attr("y", 4)
      .style("font-size", "10px")
      .style("fill", "#f8fafc")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("font-weight", "500")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.8)");

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as any).x)
        .attr("y1", d => (d.source as any).y)
        .attr("x2", d => (d.target as any).x)
        .attr("y2", d => (d.target as any).y);

      nodeGroup
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, links, onNodeClick]);

  return (
    <div className="w-full h-[200px] bg-hossted-dark/50 rounded-lg border border-hossted-border overflow-hidden relative group">
      <svg ref={svgRef} className="w-full h-full" />
      <div className="absolute bottom-2 right-2 text-[8px] text-hossted-text-muted opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest pointer-events-none">
        Interactive Graph
      </div>
    </div>
  );
}
